"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import WhatsappStatus from "../../components/WhatsappStatus";
import { delayCurriculoMs, MODELOS_CURRICULO, montarAbordagemCurriculo } from "../../lib/abordagensCurriculo";
import {
  atualizarLeadCurriculo,
  excluirLeadCurriculo,
  listarLeadsCurriculo,
  salvarLeadCurriculo,
} from "../../lib/curriculo";
import { fatiaListaCurriculo, LISTA_EMPRESAS_CURRICULO } from "../../lib/listaEmpresasCurriculo";
import { formatarWhatsapp, validarWhatsapp } from "../../lib/security";

const CURSOR_CURRICULO_KEY = "curriculo_lista_cursor";

function lerCursor() {
  try {
    const n = Number(localStorage.getItem(CURSOR_CURRICULO_KEY) || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function gravarCursor(n) {
  try {
    localStorage.setItem(CURSOR_CURRICULO_KEY, String(Math.max(0, Number(n) || 0)));
  } catch {}
}

const MENUS = [
  { id: "auto", label: "Automático", icon: "⚡" },
  { id: "empresas", label: "Fila", icon: "🏢" },
  { id: "conversas", label: "Chat / Mensagens", icon: "💬" },
  { id: "base", label: "Base de Dados", icon: "📋" },
  { id: "conexao", label: "Conexão", icon: "📶" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CurriculoPage() {
  const { user, loading, logout, pronto } = useAuth();
  const [menu, setMenu] = useState("auto");
  const [waConectado, setWaConectado] = useState(false);
  const [erro, setErro] = useState("");
  const [leads, setLeads] = useState([]);
  const [modelo, setModelo] = useState(0);
  const [disparando, setDisparando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [manual, setManual] = useState({ nome: "", whatsapp: "" });
  const [autoLigado, setAutoLigado] = useState(false);
  const [cursorLista, setCursorLista] = useState(0);

  // Chat individual
  const [leadSelecionadoId, setLeadSelecionadoId] = useState("");
  const [textoChat, setTextoChat] = useState("");
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [buscaChat, setBuscaChat] = useState("");

  const pararRef = useRef(false);
  const autoRef = useRef(false);
  const rodandoRef = useRef(false);
  const waRef = useRef(false);
  const leadsRef = useRef([]);
  const modeloRef = useRef(modelo);

  useEffect(() => {
    modeloRef.current = modelo;
  }, [modelo]);

  useEffect(() => {
    waRef.current = waConectado;
  }, [waConectado]);

  useEffect(() => {
    leadsRef.current = leads;
    if (!leadSelecionadoId && leads.length > 0) {
      setLeadSelecionadoId(leads[0].id || leads[0].whatsapp);
    }
  }, [leads, leadSelecionadoId]);

  useEffect(() => {
    setCursorLista(lerCursor());
  }, []);

  // Monitora conexão do WhatsApp em segundo plano
  useEffect(() => {
    let ativo = true;
    async function checarWa() {
      try {
        const res = await fetch("/api/whatsapp/status?conta=agencia", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (ativo) {
          const ok = Boolean(data?.connected);
          setWaConectado(ok);
          waRef.current = ok;
        }
      } catch {
        if (ativo) {
          setWaConectado(false);
          waRef.current = false;
        }
      }
    }
    checarWa();
    const timer = setInterval(checarWa, 10000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, []);

  const novos = useMemo(() => leads.filter((l) => (l.status || "novo") === "novo"), [leads]);
  const chamados = useMemo(
    () => leads.filter((l) => ["chamou", "enviado", "respondeu"].includes(l.status)),
    [leads],
  );

  const leadSelecionado = useMemo(() => {
    return leads.find((l) => l.id === leadSelecionadoId || l.whatsapp === leadSelecionadoId) || leads[0] || null;
  }, [leads, leadSelecionadoId]);

  const leadsFiltradosChat = useMemo(() => {
    const q = buscaChat.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        (l.nome || "").toLowerCase().includes(q) ||
        (l.whatsapp || "").includes(q) ||
        (l.categoria || "").toLowerCase().includes(q),
    );
  }, [leads, buscaChat]);

  async function carregarLeads() {
    try {
      const res = await listarLeadsCurriculo();
      setLeads(res);
    } catch (e) {
      console.warn("Falha ao carregar leads:", e);
    }
  }

  useEffect(() => {
    carregarLeads();
  }, [pronto]);

  async function dispararUm(lead, mod = 0) {
    const texto = montarAbordagemCurriculo(lead, mod);
    const res = await fetch("/api/agencia/disparar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whatsapp: lead.whatsapp,
        texto,
        leadId: lead.id,
        colecao: "curriculo_leads",
        conta: "agencia",
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok && !json.skipped) {
      throw new Error(json.error || `Erro HTTP ${res.status}`);
    }
    return { skipped: json.skipped, motivo: json.motivo, texto };
  }

  async function cicloAutomatico() {
    if (rodandoRef.current) return;
    rodandoRef.current = true;
    try {
      while (autoRef.current && !pararRef.current) {
        // Confere status imediato da Evolution
        try {
          const resWa = await fetch("/api/whatsapp/status?conta=agencia", { cache: "no-store" });
          const dataWa = await resWa.json().catch(() => ({}));
          waRef.current = Boolean(dataWa?.connected);
          setWaConectado(waRef.current);
        } catch {
          // segue com valor em memória
        }

        if (!waRef.current) {
          setProgresso("Aguardando WhatsApp conectar... Vá na aba Conexão se precisar ler o QR Code.");
          await sleep(5000);
          continue;
        }

        // 1. Prioriza empresas que já estão salvas na fila com status "novo"
        const pendenteFila = leadsRef.current.find((l) => (l.status || "novo") === "novo");
        let leadObj = null;

        if (pendenteFila) {
          leadObj = pendenteFila;
        } else {
          // 2. Se a fila não tem nenhum novo, puxa da base cadastrada
          const conhecidos = leadsRef.current.map((l) => l.whatsapp);
          const { empresas, cursor, esgotada } = fatiaListaCurriculo({
            excluir: conhecidos,
            cursor: lerCursor(),
            limite: 1,
          });

          if (esgotada || empresas.length === 0) {
            setProgresso("Base de empresas concluída! Todas foram processadas.");
            setAutoLigado(false);
            autoRef.current = false;
            break;
          }

          const empresa = empresas[0];
          gravarCursor(cursor);
          setCursorLista(cursor);

          setProgresso(`Salvando e preparando ${empresa.nome}...`);
          const salvo = await salvarLeadCurriculo(empresa, conhecidos);
          leadObj = { ...empresa, id: salvo.id || `temp-${empresa.whatsapp}`, status: "novo" };
          setLeads((prev) => [leadObj, ...prev.filter((p) => p.whatsapp !== empresa.whatsapp)]);
        }

        setProgresso(`Enviando currículo para ${leadObj.nome} (${formatarWhatsapp(leadObj.whatsapp)})...`);
        try {
          const resultado = await dispararUm(leadObj, modeloRef.current);
          const novoStatus = resultado.skipped ? "pulado" : "chamou";
          await atualizarLeadCurriculo(leadObj.id, { status: novoStatus, texto: resultado.texto });
          setLeads((prev) =>
            prev.map((l) => (l.whatsapp === leadObj.whatsapp ? { ...l, status: novoStatus, texto: resultado.texto } : l)),
          );
          setProgresso(`Currículo enviado com sucesso para ${leadObj.nome}!`);
        } catch (err) {
          setProgresso(`Erro ao enviar para ${leadObj.nome}: ${err.message}`);
          await atualizarLeadCurriculo(leadObj.id, { status: "erro", erro: err.message });
          setLeads((prev) =>
            prev.map((l) => (l.whatsapp === leadObj.whatsapp ? { ...l, status: "erro" } : l)),
          );
        }

        const espera = delayCurriculoMs();
        const seg = Math.round(espera / 1000);
        for (let s = seg; s > 0; s--) {
          if (!autoRef.current || pararRef.current) break;
          setProgresso(`Próximo envio em ${s}s (ritmo seguro anti-spam)...`);
          await sleep(1000);
        }
      }
    } finally {
      rodandoRef.current = false;
    }
  }

  function reiniciarCursor() {
    gravarCursor(0);
    setCursorLista(0);
    setProgresso("Cursor reiniciado do início da base (posição 0).");
  }

  function toggleAutomatico() {
    if (autoLigado) {
      autoRef.current = false;
      pararRef.current = true;
      setAutoLigado(false);
      setProgresso("Envio automático pausado.");
    } else {
      pararRef.current = false;
      autoRef.current = true;
      setAutoLigado(true);
      setProgresso("Iniciando envio automático de currículo...");
      cicloAutomatico();
    }
  }

  async function dispararManual(lead) {
    if (disparando) return;
    setDisparando(true);
    setProgresso(`Disparando currículo para ${lead.nome} (${formatarWhatsapp(lead.whatsapp)})...`);
    try {
      const resultado = await dispararUm(lead, modeloRef.current);
      const novoStatus = resultado.skipped ? "pulado" : "chamou";
      await atualizarLeadCurriculo(lead.id, { status: novoStatus, texto: resultado.texto });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id || l.whatsapp === lead.whatsapp
            ? { ...l, status: novoStatus, texto: resultado.texto }
            : l,
        ),
      );
      setProgresso(`Currículo enviado com sucesso para ${lead.nome}!`);
    } catch (err) {
      setProgresso(`Erro ao enviar para ${lead.nome}: ${err.message}`);
      await atualizarLeadCurriculo(lead.id, { status: "erro", erro: err.message });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id || l.whatsapp === lead.whatsapp ? { ...l, status: "erro" } : l,
        ),
      );
    } finally {
      setDisparando(false);
    }
  }

  async function enviarMensagemChat(e) {
    e?.preventDefault?.();
    if (!leadSelecionado || !textoChat.trim() || enviandoChat) return;

    setEnviandoChat(true);
    setProgresso(`Enviando mensagem para ${leadSelecionado.nome}...`);
    try {
      const res = await fetch("/api/agencia/disparar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: leadSelecionado.whatsapp,
          texto: textoChat.trim(),
          leadId: leadSelecionado.id,
          colecao: "curriculo_leads",
          conta: "agencia",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao enviar mensagem");

      const novoStatus = "chamou";
      await atualizarLeadCurriculo(leadSelecionado.id, { status: novoStatus, texto: textoChat.trim() });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadSelecionado.id
            ? { ...l, status: novoStatus, texto: textoChat.trim() }
            : l,
        ),
      );
      setTextoChat("");
      setProgresso(`Mensagem enviada com sucesso para ${leadSelecionado.nome}!`);
    } catch (err) {
      setProgresso(`Erro ao enviar: ${err.message}`);
    } finally {
      setEnviandoChat(false);
    }
  }

  async function adicionarManual(e) {
    e.preventDefault();
    if (!manual.nome || !manual.whatsapp) return;
    setSalvando(true);
    try {
      const conhecidos = leads.map((l) => l.whatsapp);
      const res = await salvarLeadCurriculo(
        { nome: manual.nome, whatsapp: manual.whatsapp, categoria: "Adicionado Manual" },
        conhecidos,
      );
      if (res.duplicado && !res.id) {
        setErro("Este WhatsApp já está cadastrado.");
      } else {
        setManual({ nome: "", whatsapp: "" });
        await carregarLeads();
      }
    } finally {
      setSalvando(false);
    }
  }

  async function importarBaseToda() {
    setSalvando(true);
    setProgresso("Importando base completa para a fila...");
    try {
      const conhecidos = leads.map((l) => l.whatsapp);
      for (const item of LISTA_EMPRESAS_CURRICULO) {
        await salvarLeadCurriculo(item, conhecidos);
      }
      await carregarLeads();
      setProgresso("Base importada com sucesso!");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="crm-wrap ag-page">
      <aside className="crm-aside">
        <div className="crm-aside-brand">
          <span className="crm-logo-tag">CURRÍCULO</span>
          <strong>Alessandro Silva</strong>
          <small>Desenvolvedor Web & Analista</small>
        </div>

        <nav className="crm-nav">
          {MENUS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={menu === item.id ? "is-on" : ""}
              onClick={() => setMenu(item.id)}
            >
              <span className="crm-menu-label">
                <span className="crm-menu-ico" aria-hidden="true">{item.icon}</span>
                {item.label}
              </span>
              {item.id === "empresas" ? <em className="crm-nav-count">{leads.length}</em> : null}
              {item.id === "auto" && autoLigado ? <em className="crm-nav-badge">ON</em> : null}
            </button>
          ))}
        </nav>

        <div className="crm-nav-foot">
          <Link href="/curriculo" style={{ fontWeight: "bold", color: "#38bdf8" }}>Currículo</Link>
          <Link href="/painel">Honda</Link>
          <Link href="/afiliados">Afiliados</Link>
          <Link href="/agencia">Agência</Link>
          <button type="button" onClick={() => logout && logout()}>Sair</button>
        </div>
      </aside>

      <main className="crm-main">
        <div className={`ag-auto-bar ${autoLigado ? "is-on" : ""}`}>
          <button
            type="button"
            className={`ag-auto-toggle ${autoLigado ? "is-on" : "is-off"}`}
            onClick={toggleAutomatico}
          >
            <span className="ag-auto-icon" aria-hidden="true">
              {autoLigado ? "⏸" : "⚡"}
            </span>
            <span>{autoLigado ? "Pausar envio" : "Ligar envio automático"}</span>
          </button>
          <span className="ag-auto-status">
            {progresso || (autoLigado ? "Disparando currículo..." : "Parado — clique para iniciar.")}
          </span>
          <span className="ag-auto-cursor">
            {waConectado ? "🟢 WhatsApp ON" : "🔴 WhatsApp OFF"} · Enviadas: {chamados.length} / {LISTA_EMPRESAS_CURRICULO.length}
            <button
              type="button"
              onClick={reiniciarCursor}
              style={{ marginLeft: "8px", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.1)", border: "1px solid #475569", color: "#fff", cursor: "pointer", fontSize: "0.75rem" }}
              title="Voltar cursor ao início da lista de empresas"
            >
              🔄 Reiniciar cursor
            </button>
          </span>
        </div>

        {menu === "auto" && (
          <section className="crm-card ag-card">
            <h2>Envio Automático de Currículo para Empresas</h2>
            <p className="crm-card-desc">
              O robô percorre sua base de dados de empresas de TI, monta a saudação do período (Bom dia / Boa tarde), se apresenta como desenvolvedor web, anexa seu portfólio (potfolio-rxgy.vercel.app) e envia no ritmo seguro.
            </p>

            {!waConectado && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fca5a5", fontSize: "0.95rem" }}>
                  ⚠️ O WhatsApp (11 95202-5568) está desconectado. O disparo automático só envia com ele conectado.
                </span>
                <button
                  type="button"
                  onClick={() => setMenu("conexao")}
                  style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" }}
                >
                  Conectar agora
                </button>
              </div>
            )}

            <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                Modelo de Apresentação:
              </label>
              <select
                value={modelo}
                onChange={(e) => setModelo(Number(e.target.value))}
                style={{ padding: "0.6rem 1rem", borderRadius: "8px", background: "#1e293b", color: "#fff", border: "1px solid #334155" }}
              >
                {MODELOS_CURRICULO.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ padding: "1rem", background: "rgba(30, 41, 59, 0.7)", borderRadius: "10px", border: "1px solid #334155" }}>
              <h3 style={{ fontSize: "0.95rem", color: "#38bdf8", marginBottom: "0.5rem" }}>Prévia da Mensagem:</h3>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.9rem", color: "#cbd5e1" }}>
                {montarAbordagemCurriculo({ nome: "Empresa de TI" }, modelo)}
              </pre>
            </div>
          </section>
        )}

        {menu === "conversas" && (
          <section className="crm-card ag-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "600px" }}>
              {/* Lista lateral do chat */}
              <div style={{ borderRight: "1px solid #334155", display: "flex", flexDirection: "column", background: "rgba(15, 23, 42, 0.6)" }}>
                <div style={{ padding: "0.8rem", borderBottom: "1px solid #334155" }}>
                  <input
                    type="text"
                    placeholder="Buscar empresa..."
                    value={buscaChat}
                    onChange={(e) => setBuscaChat(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: "0.9rem" }}
                  />
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {leadsFiltradosChat.map((l) => {
                    const ativo = (leadSelecionado?.id === l.id) || (leadSelecionado?.whatsapp === l.whatsapp);
                    return (
                      <div
                        key={l.id || l.whatsapp}
                        onClick={() => setLeadSelecionadoId(l.id || l.whatsapp)}
                        style={{
                          padding: "0.75rem 1rem",
                          borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
                          cursor: "pointer",
                          background: ativo ? "rgba(56, 189, 248, 0.15)" : "transparent",
                          borderLeft: ativo ? "3px solid #38bdf8" : "3px solid transparent",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "0.9rem", color: ativo ? "#38bdf8" : "#f1f5f9" }}>{l.nome}</strong>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: l.status === "chamou" ? "#16a34a" : "#334155",
                              color: "#fff",
                            }}
                          >
                            {l.status === "chamou" ? "Enviado" : l.status || "Novo"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "3px" }}>
                          {formatarWhatsapp(l.whatsapp)} · {l.categoria || "TI"}
                        </div>
                      </div>
                    );
                  })}
                  {leadsFiltradosChat.length === 0 && (
                    <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
                      Nenhuma empresa na fila. Importe a base na aba "Fila".
                    </div>
                  )}
                </div>
              </div>

              {/* Janela de conversa */}
              {leadSelecionado ? (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0f172a" }}>
                  {/* Cabeçalho do contato */}
                  <div style={{ padding: "1rem", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b" }}>
                    <div>
                      <strong style={{ fontSize: "1.1rem", color: "#fff" }}>{leadSelecionado.nome}</strong>
                      <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                        {formatarWhatsapp(leadSelecionado.whatsapp)} · {leadSelecionado.categoria || "Tecnologia"}
                        {leadSelecionado.site ? (
                          <a href={leadSelecionado.site} target="_blank" rel="noreferrer" style={{ marginLeft: "8px", color: "#38bdf8" }}>
                            Visitar Site
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => dispararManual(leadSelecionado)}
                        disabled={disparando}
                        style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", background: "#0284c7", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        ⚡ Disparar Currículo
                      </button>
                      <a
                        href={`https://wa.me/55${String(leadSelecionado.whatsapp).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", background: "#16a34a", color: "#fff", textDecoration: "none", fontSize: "0.85rem", fontWeight: "600" }}
                      >
                        🟢 Zap Web
                      </a>
                    </div>
                  </div>

                  {/* Histórico / Mensagem enviada */}
                  <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ alignSelf: "flex-end", maxWidth: "80%", background: "#0369a1", color: "#fff", padding: "1rem", borderRadius: "12px 12px 0 12px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#bae6fd", marginBottom: "0.4rem", fontWeight: "bold" }}>
                        Abordagem ({leadSelecionado.status === "chamou" ? "Enviada" : "Prévia pronta para envio"}):
                      </div>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: "1.4" }}>
                        {leadSelecionado.texto || montarAbordagemCurriculo(leadSelecionado, modelo)}
                      </p>
                      <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#bae6fd", marginTop: "0.5rem" }}>
                        Status: {leadSelecionado.status === "chamou" ? "✓✓ Enviado via WhatsApp" : leadSelecionado.status || "Aguardando disparo"}
                      </div>
                    </div>
                  </div>

                  {/* Compositor de mensagem personalizada */}
                  <form onSubmit={enviarMensagemChat} style={{ padding: "0.8rem 1rem", borderTop: "1px solid #334155", background: "#1e293b", display: "flex", gap: "0.5rem" }}>
                    <textarea
                      placeholder={`Escreva uma mensagem para ${leadSelecionado.nome}...`}
                      value={textoChat}
                      onChange={(e) => setTextoChat(e.target.value)}
                      rows={2}
                      style={{ flex: 1, padding: "0.6rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", resize: "none" }}
                    />
                    <button
                      type="submit"
                      disabled={enviandoChat || !textoChat.trim()}
                      style={{ padding: "0 1.2rem", borderRadius: "8px", background: "#22c55e", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold" }}
                    >
                      {enviandoChat ? "Enviando..." : "Enviar Zap"}
                    </button>
                  </form>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                  Selecione uma empresa ao lado para ver a conversa ou disparar.
                </div>
              )}
            </div>
          </section>
        )}

        {menu === "empresas" && (
          <section className="crm-card ag-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2>Fila de Empresas ({leads.length})</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {novos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => dispararManual(novos[0])}
                    disabled={disparando}
                    style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#10b981", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" }}
                  >
                    ⚡ Disparar Próxima ({novos[0]?.nome})
                  </button>
                )}
                <button
                  type="button"
                  onClick={importarBaseToda}
                  disabled={salvando}
                  style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#0284c7", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  {salvando ? "Importando..." : "Importar todas as 80 empresas da base"}
                </button>
              </div>
            </div>

            <form onSubmit={adicionarManual} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <input
                type="text"
                placeholder="Nome da empresa"
                value={manual.nome}
                onChange={(e) => setManual({ ...manual, nome: e.target.value })}
                style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
              />
              <input
                type="text"
                placeholder="WhatsApp (ex: 11999998888)"
                value={manual.whatsapp}
                onChange={(e) => setManual({ ...manual, whatsapp: e.target.value })}
                style={{ width: "220px", padding: "0.5rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", color: "#fff" }}
              />
              <button
                type="submit"
                disabled={salvando}
                style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#22c55e", color: "#fff", border: "none", cursor: "pointer" }}
              >
                Adicionar
              </button>
            </form>

            <div className="crm-tabela-scroll">
              <table className="crm-tabela">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>WhatsApp</th>
                    <th>Categoria</th>
                    <th>Status</th>
                    <th>Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id || l.whatsapp}>
                      <td><strong>{l.nome}</strong></td>
                      <td>{formatarWhatsapp(l.whatsapp)}</td>
                      <td>{l.categoria || "-"}</td>
                      <td>
                        <span className={`crm-status-tag ${l.status || "novo"}`}>
                          {l.status === "chamou" ? "Enviado" : l.status || "Novo"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => dispararManual(l)}
                            disabled={disparando}
                            style={{ padding: "0.3rem 0.6rem", borderRadius: "4px", background: "#0284c7", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem" }}
                            title="Disparar apresentação agora pelo WhatsApp"
                          >
                            ⚡ Disparar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLeadSelecionadoId(l.id || l.whatsapp);
                              setMenu("conversas");
                            }}
                            style={{ padding: "0.3rem 0.6rem", borderRadius: "4px", background: "#6366f1", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem" }}
                            title="Abrir Chat com esta empresa"
                          >
                            💬 Chat
                          </button>
                          <a
                            href={`https://wa.me/55${String(l.whatsapp).replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ padding: "0.3rem 0.6rem", borderRadius: "4px", background: "#16a34a", color: "#fff", textDecoration: "none", fontSize: "0.8rem", fontWeight: "600" }}
                            title="Abrir WhatsApp Web"
                          >
                            🟢 Zap
                          </a>
                          <button
                            type="button"
                            onClick={() => excluirLeadCurriculo(l.id).then(carregarLeads)}
                            style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem" }}
                            title="Remover da fila"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                        Nenhuma empresa na fila. Clique em "Importar todas as 80 empresas da base" acima para preencher.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {menu === "base" && (
          <section className="crm-card ag-card">
            <h2>Base de Dados Cadastrada ({LISTA_EMPRESAS_CURRICULO.length} empresas com Celular)</h2>
            <p className="crm-card-desc">
              Empresas de TI e software com WhatsApp celular válido extraídas da sua pesquisa no Google Maps:
            </p>
            <div className="crm-tabela-scroll" style={{ maxHeight: "500px" }}>
              <table className="crm-tabela">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome</th>
                    <th>WhatsApp</th>
                    <th>Categoria</th>
                    <th>Site</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {LISTA_EMPRESAS_CURRICULO.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{item.nome}</strong></td>
                      <td>{formatarWhatsapp(item.whatsapp)}</td>
                      <td>{item.categoria}</td>
                      <td>
                        {item.site ? (
                          <a href={item.site} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                            Visitar
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => dispararManual({ ...item, id: `base-${item.whatsapp}` })}
                          disabled={disparando}
                          style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: "#0284c7", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem" }}
                        >
                          ⚡ Disparar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {menu === "conexao" && (
          <section className="crm-card ag-card">
            <h2>Conexão do WhatsApp</h2>
            <p className="crm-card-desc">
              Verifique se a instância do WhatsApp (11 95202-5568) está conectada para envio das mensagens do seu currículo.
            </p>
            <WhatsappStatus onConnected={setWaConectado} conta="agencia" />
          </section>
        )}
      </main>
    </div>
  );
}
