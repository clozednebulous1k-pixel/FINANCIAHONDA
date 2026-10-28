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
  const [selecionados, setSelecionados] = useState({});
  const [modelo, setModelo] = useState(0);
  const [disparando, setDisparando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [manual, setManual] = useState({ nome: "", whatsapp: "" });
  const [autoLigado, setAutoLigado] = useState(false);
  const [cursorLista, setCursorLista] = useState(0);

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
  }, [leads]);

  useEffect(() => {
    setCursorLista(lerCursor());
  }, []);

  const novos = useMemo(() => leads.filter((l) => (l.status || "novo") === "novo"), [leads]);
  const chamados = useMemo(
    () => leads.filter((l) => ["chamou", "enviado", "respondeu"].includes(l.status)),
    [leads],
  );

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
        if (!waRef.current) {
          setProgresso("Aguardando WhatsApp conectar...");
          await sleep(5000);
          continue;
        }

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
        const leadObj = { ...empresa, id: salvo.id || `temp-${empresa.whatsapp}`, status: "novo" };
        setLeads((prev) => [leadObj, ...prev.filter((p) => p.whatsapp !== empresa.whatsapp)]);

        setProgresso(`Enviando currículo para ${empresa.nome} (${formatarWhatsapp(empresa.whatsapp)})...`);
        try {
          const resultado = await dispararUm(leadObj, modeloRef.current);
          const novoStatus = resultado.skipped ? "pulado" : "chamou";
          await atualizarLeadCurriculo(leadObj.id, { status: novoStatus, texto: resultado.texto });
          setLeads((prev) =>
            prev.map((l) => (l.whatsapp === empresa.whatsapp ? { ...l, status: novoStatus } : l)),
          );
          setProgresso(`Currículo enviado com sucesso para ${empresa.nome}!`);
        } catch (err) {
          setProgresso(`Erro ao enviar para ${empresa.nome}: ${err.message}`);
          await atualizarLeadCurriculo(leadObj.id, { status: "erro", erro: err.message });
          setLeads((prev) =>
            prev.map((l) => (l.whatsapp === empresa.whatsapp ? { ...l, status: "erro" } : l)),
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
      if (res.duplicado) {
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
            Empresas enviadas: {chamados.length} / {LISTA_EMPRESAS_CURRICULO.length}
          </span>
        </div>

        {menu === "auto" && (
          <section className="crm-card ag-card">
            <h2>Envio Automático de Currículo para Empresas</h2>
            <p className="crm-card-desc">
              O robô percorre sua base de dados de empresas de TI, monta a saudação do período (Bom dia / Boa tarde), se apresenta como desenvolvedor web, anexa seu portfólio (potfolio-rxgy.vercel.app) e envia no ritmo seguro.
            </p>

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

        {menu === "empresas" && (
          <section className="crm-card ag-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2>Fila de Empresas ({leads.length})</h2>
              <button
                type="button"
                onClick={importarBaseToda}
                disabled={salvando}
                style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#0284c7", color: "#fff", border: "none", cursor: "pointer" }}
              >
                {salvando ? "Importando..." : "Importar todas as empresas da base"}
              </button>
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
                    <th>Ações</th>
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
                        <button
                          type="button"
                          onClick={() => excluirLeadCurriculo(l.id).then(carregarLeads)}
                          style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                        Nenhuma empresa na fila. Clique em "Importar todas as empresas da base" acima para preencher.
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
              Verifique se a instância do WhatsApp está conectada para envio das mensagens do seu currículo.
            </p>
            <WhatsappStatus onConnected={setWaConectado} conta="agencia" />
          </section>
        )}
      </main>
    </div>
  );
}
