"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import WhatsappStatus from "../../components/WhatsappStatus";
import { delayAgenciaMs, LOTE_AGENDA, montarAbordagemAgencia, TEXTOS_AGENCIA } from "../../lib/abordagensAgencia";
import {
  atualizarLeadAgencia,
  excluirLeadAgencia,
  listarLeadsAgencia,
  salvarLeadAgencia,
} from "../../lib/agencia";
import { celularWhatsapp, emailPermitido, formatarWhatsapp, loginDoCrm, validarWhatsapp } from "../../lib/security";

const SEGMENTOS = [
  { id: "todos", label: "Todos (com WhatsApp)" },
  { id: "arquitetura", label: "Arquitetura" },
  { id: "restaurante", label: "Restaurante / food" },
  { id: "roupas", label: "Loja de roupas" },
  { id: "salao", label: "Salão / estética" },
  { id: "oficina", label: "Oficina / auto" },
  { id: "clinica", label: "Clínica / saúde" },
  { id: "dentista", label: "Dentista" },
  { id: "imobiliaria", label: "Imobiliária" },
  { id: "advocacia", label: "Advocacia / contábil" },
  { id: "pet", label: "Pet shop" },
  { id: "padaria", label: "Padaria / mercado" },
  { id: "loja", label: "Loja / comércio" },
];

const MENUS = [
  { id: "auto", label: "Automático", icon: "⚡" },
  { id: "maps", label: "Mapa", icon: "🗺️" },
  { id: "empresas", label: "Fila", icon: "🏢" },
  { id: "conexao", label: "Conexão", icon: "📶" },
];

const CIDADES = ["São Paulo", "Guarulhos", "Osasco", "Santo André", "Campinas", "Rio de Janeiro", "Belo Horizonte"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AgenciaPage() {
  const router = useRouter();
  const { user, loading, logout, pronto } = useAuth();
  const [menu, setMenu] = useState("auto");
  const [waConectado, setWaConectado] = useState(false);
  const [erro, setErro] = useState("");
  const [cidade, setCidade] = useState("São Paulo");
  const [segmento, setSegmento] = useState("todos");
  const [buscando, setBuscando] = useState(false);
  const [achados, setAchados] = useState([]);
  const [avisoMaps, setAvisoMaps] = useState("");
  const [leads, setLeads] = useState([]);
  const [selecionados, setSelecionados] = useState({});
  const [modelo, setModelo] = useState(0);
  const [disparando, setDisparando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [manual, setManual] = useState({ nome: "", whatsapp: "", cidade: "São Paulo" });
  const [lote, setLote] = useState([]);
  const [nivel, setNivel] = useState(null);
  const [autoLigado, setAutoLigado] = useState(false);
  const pararRef = useRef(false);
  const autoRef = useRef(false);
  const rodandoRef = useRef(false);
  const waRef = useRef(false);
  const loteRef = useRef([]);
  const leadsRef = useRef([]);
  const achadosRef = useRef([]);
  const cidadeRef = useRef(cidade);
  const segmentoRef = useRef(segmento);
  const modeloRef = useRef(modelo);

  const escolhidos = useMemo(
    () => leads.filter((l) => selecionados[l.id] && l.status === "novo" && validarWhatsapp(l.whatsapp)),
    [leads, selecionados],
  );
  const novos = useMemo(() => leads.filter((l) => (l.status || "novo") === "novo"), [leads]);
  const chamados = useMemo(
    () => leads.filter((l) => (l.status || "novo") !== "novo" || l.chamadoEm),
    [leads],
  );
  const preview = useMemo(
    () => montarAbordagemAgencia(escolhidos[0] || achados[0] || { nome: "sua empresa", cidade }, modelo),
    [escolhidos, achados, cidade, modelo],
  );

  useEffect(() => { waRef.current = waConectado; }, [waConectado]);
  useEffect(() => { loteRef.current = lote; }, [lote]);
  useEffect(() => { leadsRef.current = leads; }, [leads]);
  useEffect(() => { achadosRef.current = achados; }, [achados]);
  useEffect(() => { cidadeRef.current = cidade; }, [cidade]);
  useEffect(() => { segmentoRef.current = segmento; }, [segmento]);
  useEffect(() => { modeloRef.current = modelo; }, [modelo]);

  useEffect(() => {
    fetch("/api/agencia/prospeccao")
      .then((res) => res.json())
      .then((data) => {
        if (data?.nivel) setNivel(data.nivel);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace(loginDoCrm("agencia"));
    if (!loading && user && !emailPermitido(user.email)) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return undefined;
    let ativo = true;
    async function checarWa() {
      try {
        const res = await fetch("/api/whatsapp/status?conta=agencia", { cache: "no-store" });
        const data = await res.json();
        if (ativo) setWaConectado(Boolean(data.connected));
      } catch {
        if (ativo) setWaConectado(false);
      }
    }
    checarWa();
    const timer = setInterval(checarWa, 90 * 1000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !pronto) return undefined;
    listarLeadsAgencia()
      .then(setLeads)
      .catch(() => setErro("Sem permissão na fila. Publique as regras novas do Firebase."));
    return undefined;
  }, [user, pronto]);

  async function vasculhar() {
    setBuscando(true);
    setErro("");
    setAvisoMaps("");
    try {
      const excluir = [
        ...leadsRef.current.map((l) => l.whatsapp),
        ...achadosRef.current.map((l) => l.whatsapp),
        ...loteRef.current.map((l) => l.whatsapp),
      ];
      const res = await fetch("/api/agencia/prospeccao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidade: cidadeRef.current, segmento: segmentoRef.current, excluir }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na busca");
      const lista = (Array.isArray(data.empresas) ? data.empresas : []).slice(0, LOTE_AGENDA);
      setAchados(lista);
      achadosRef.current = lista;
      if (data.nivel) setNivel(data.nivel);
      setAvisoMaps(
        lista.length
          ? `Lote de ${lista.length} com WhatsApp confirmado${data.candidatosMapa ? ` (${data.candidatosMapa} no mapa)` : ""}. Já pode disparar.`
          : "Achei celular no mapa, mas nenhum passou no WhatsApp agora. Tentando outra área…",
      );
      if (!autoRef.current) setMenu("maps");
      return lista;
    } catch (error) {
      setErro(error.message || "Não foi possível vasculhar o mapa");
      return [];
    } finally {
      setBuscando(false);
    }
  }

  async function guardarAchados(lista) {
    const fila = (lista || achados).filter((e) => celularWhatsapp(e.whatsapp)).slice(0, LOTE_AGENDA);
    if (!fila.length) {
      setErro("Nenhuma dessas empresas tem celular com WhatsApp. Fixo eu pulo.");
      return [];
    }
    setSalvando(true);
    setErro("");
    const conhecidos = leadsRef.current.map((l) => l.whatsapp);
    const salvos = [];
    let dup = 0;
    try {
      for (const item of fila) {
        const salvo = await salvarLeadAgencia(item, [...conhecidos, ...salvos.map((s) => s.whatsapp)]);
        if (salvo.duplicado) {
          dup += 1;
          continue;
        }
        salvos.push({ ...item, id: salvo.id, status: "novo", whatsapp: salvo.whatsapp });
      }
      setLeads((atual) => [...salvos, ...atual].slice(0, 300));
      leadsRef.current = [...salvos, ...leadsRef.current].slice(0, 300);
      setLote(salvos);
      loteRef.current = salvos;
      setSelecionados(Object.fromEntries(salvos.map((l) => [l.id, true])));
      setProgresso(`Lote pronto: ${salvos.length}${dup ? ` · ${dup} repetidas` : ""}. Agora dispara essas ${salvos.length}.`);
      setMenu("auto");
      return salvos;
    } catch (error) {
      setErro(error.message || "Não foi possível guardar");
      return [];
    } finally {
      setSalvando(false);
    }
  }

  async function esperar(ms, texto) {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      if (pararRef.current || !autoRef.current) return false;
      if (texto) {
        const restam = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
        setProgresso(`${texto} ${restam}s…`);
      }
      await sleep(1000);
    }
    return autoRef.current && !pararRef.current;
  }

  async function dispararFila(lista, { loteN = 1 } = {}) {
    const origem = Array.isArray(lista) && lista.length
      ? lista
      : loteRef.current.filter((l) => (l.status || "novo") === "novo");
    const jaChamados = new Set(
      leadsRef.current
        .filter((l) => (l.status || "novo") !== "novo" || l.chamadoEm)
        .map((l) => celularWhatsapp(l.whatsapp) || validarWhatsapp(l.whatsapp))
        .filter(Boolean),
    );
    const vistos = new Set();
    const fila = [];
    for (const lead of (origem.length ? origem : escolhidos)) {
      const fone = celularWhatsapp(lead.whatsapp);
      if (!fone || vistos.has(fone) || jaChamados.has(fone)) continue;
      if ((lead.status || "novo") !== "novo") continue;
      vistos.add(fone);
      fila.push({ ...lead, whatsapp: fone });
      if (fila.length >= LOTE_AGENDA) break;
    }
    if (!fila.length) return { ok: 0, falhas: 0, pulados: 0, vazia: true, parou: false };
    if (!waRef.current) return { ok: 0, falhas: 0, pulados: 0, vazia: false, parou: false, semWhatsapp: true };
    let ok = 0;
    let falhas = 0;
    let pulados = 0;
    for (let i = 0; i < fila.length; i += 1) {
      if (pararRef.current || !autoRef.current) break;
      const lead = fila[i];
      const texto = montarAbordagemAgencia(lead, modeloRef.current + i);
      setProgresso(`Lote ${loteN}: ${i + 1}/${fila.length} · chamando ${lead.nome}`);
      try {
        const res = await fetch("/api/agencia/disparar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsapp: lead.whatsapp, texto, leadId: lead.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no envio");
        if (data.skipped) {
          pulados += 1;
          const patchSkip = (atual) => atual.map((l) => (l.id === lead.id ? { ...l, status: "chamou" } : l));
          if (lead.id) {
            await atualizarLeadAgencia(lead.id, {
              status: "chamou",
              chamadoEm: true,
              nome: lead.nome,
              whatsapp: lead.whatsapp,
              cidade: lead.cidade,
              osmId: lead.osmId || lead.id,
            }).catch(() => {});
          }
          setLeads(patchSkip);
          setLote(patchSkip);
          leadsRef.current = patchSkip(leadsRef.current);
          loteRef.current = patchSkip(loteRef.current);
          setProgresso(`Lote ${loteN}: ${lead.nome} sem Zap — pulando.`);
          if (i < fila.length - 1 && autoRef.current && !pararRef.current) {
            await sleep(300);
          }
          continue;
        }
        const patch = (atual) => atual.map((l) => (l.id === lead.id ? { ...l, status: "chamou" } : l));
        if (lead.id) {
          await atualizarLeadAgencia(lead.id, {
            status: "chamou",
            chamadoEm: true,
            nome: lead.nome,
            whatsapp: lead.whatsapp,
            cidade: lead.cidade,
            osmId: lead.osmId || lead.id,
          });
        }
        setLeads(patch);
        setLote(patch);
        leadsRef.current = patch(leadsRef.current);
        loteRef.current = patch(loteRef.current);
        ok += 1;
        setProgresso(`Lote ${loteN}: ${ok} disparo(s) · ${lead.nome}`);
      } catch (error) {
        falhas += 1;
        setErro(error.message || "Falha no disparo");
        if (i < fila.length - 1 && autoRef.current && !pararRef.current) {
          await sleep(1200);
        }
        continue;
      }
      if (i < fila.length - 1 && autoRef.current && !pararRef.current) {
        await esperar(delayAgenciaMs(), `Lote ${loteN}: ${ok} no Zap. Próxima em`);
      }
    }
    return {
      ok,
      falhas,
      pulados,
      vazia: false,
      parou: pararRef.current || !autoRef.current,
    };
  }

  async function rodarAutomatico() {
    if (rodandoRef.current) return;
    rodandoRef.current = true;
    let lotes = 0;
    let totalOk = 0;
    let totalFalhas = 0;
    setDisparando(true);
    setErro("");
    try {
      while (autoRef.current && !pararRef.current) {
        try {
          const resWa = await fetch("/api/whatsapp/status?conta=agencia", { cache: "no-store" });
          const dataWa = await resWa.json();
          waRef.current = Boolean(dataWa.connected);
          setWaConectado(waRef.current);
        } catch {
          waRef.current = false;
        }
        if (!waRef.current) {
          setErro("WhatsApp desconectado. Automático ligado: reconecte em Conexão que eu sigo.");
          const okEspera = await esperar(15000, "Aguardando WhatsApp. Nova tentativa em");
          if (!okEspera) break;
          continue;
        }

        // Só celular com 9º dígito — fixo/inválido não entra
        let fila = loteRef.current.filter(
          (l) => (l.status || "novo") === "novo" && celularWhatsapp(l.whatsapp),
        );
        if (!fila.length) {
          fila = leadsRef.current
            .filter((l) => (l.status || "novo") === "novo" && celularWhatsapp(l.whatsapp))
            .slice(0, LOTE_AGENDA);
        }
        if (!fila.length) {
          setProgresso("Procurando PME com WhatsApp no mapa…");
          const encontradas = await vasculhar();
          if (!autoRef.current || pararRef.current) break;
          if (!encontradas.length) {
            const okEspera = await esperar(12000, "Sem Zap novo agora. Procurando de novo em");
            if (!okEspera) break;
            continue;
          }
          fila = await guardarAchados(encontradas);
          if (!autoRef.current || pararRef.current) break;
          if (!fila.length) {
            const okEspera = await esperar(4000, "Essas já estavam na fila. Procurando outras em");
            if (!okEspera) break;
            continue;
          }
        }

        lotes += 1;
        setMenu("auto");
        const r = await dispararFila(fila, { loteN: lotes });
        totalOk += r.ok;
        totalFalhas += r.falhas;
        loteRef.current = [];
        setLote([]);
        if (!autoRef.current || pararRef.current) break;
        if (r.semWhatsapp) {
          const okEspera = await esperar(15000, "WhatsApp off. Tentando de novo em");
          if (!okEspera) break;
          continue;
        }
        if (!r.ok) {
          // Lote vazio ou só pulados — busca rápido o próximo com Zap
          setProgresso(
            r.pulados
              ? `${r.pulados} sem Zap neste lote. Buscando outras…`
              : "Nada pra disparar. Buscando PME com Zap…",
          );
          const okEspera = await esperar(2500, "Próxima busca em");
          if (!okEspera) break;
          continue;
        }
        setProgresso(`Lote ${lotes} ok: ${totalOk} chamadas. Procurando as próximas…`);
      }
    } finally {
      rodandoRef.current = false;
      setDisparando(false);
      if (!autoRef.current || pararRef.current) {
        setProgresso(
          `Automático desativado. ${totalOk} chamadas, ${totalFalhas} falhas, ${lotes} lote(s).`,
        );
      }
    }
  }

  function desligarAutomatico() {
    pararRef.current = true;
    autoRef.current = false;
    setAutoLigado(false);
  }

  function ligarAutomatico() {
    if (rodandoRef.current || autoRef.current) return;
    pararRef.current = false;
    autoRef.current = true;
    setAutoLigado(true);
    setErro("");
    setProgresso("Automático ligado. Procurando e chamando de 10 em 10 até você desativar.");
    rodarAutomatico();
  }

  function toggleAutomatico() {
    if (autoRef.current) desligarAutomatico();
    else ligarAutomatico();
  }

  if (loading || !user) {
    return (
      <main className="crm-shell crm-loading">
        <p>Carregando CRM da agência…</p>
      </main>
    );
  }

  return (
    <div className="crm-shell is-agencia">
      <aside className="crm-nav">
        <div className="crm-brand">
          <span className="crm-mark">S</span>
          <div>
            <strong>CRM Agência</strong>
            <small>{waConectado ? "11 95202-5568 on" : "11 95202-5568 off"}</small>
          </div>
        </div>
        <nav className="crm-menu">
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
              {item.id === "auto" && autoLigado ? (
                <em className="crm-nav-badge">ON</em>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="crm-nav-foot">
          <Link href="/painel">Honda</Link>
          <Link href="/afiliados">Afiliados</Link>
          <button type="button" onClick={() => logout()}>Sair</button>
        </div>
      </aside>

      <main className="crm-main">
        <div className={`ag-auto-bar ${autoLigado ? "is-on" : ""}`}>
          <button
            type="button"
            className={`ag-auto-toggle ${autoLigado ? "is-on" : "is-off"}`}
            onClick={toggleAutomatico}
          >
            {autoLigado ? "Desativar automático" : "Ligar automático"}
          </button>
          <p className="ag-auto-status">
            {autoLigado
              ? (progresso || "Ligado: procurando e chamando de 10 em 10. Toque em Desativar para parar.")
              : "Desligado. Liga e eu procuro 10, chamo, procuro mais 10 e sigo até você desativar."}
          </p>
        </div>
        {erro ? <p className="crm-erro-banner">{erro}</p> : null}
        {progresso && !autoLigado ? <p className="aff-aviso">{progresso}</p> : null}

        {menu === "maps" ? (
          <section className="crm-pane">
            <button
              type="button"
              className={`ag-auto-hero ${autoLigado ? "is-on" : ""}`}
              onClick={toggleAutomatico}
            >
              <strong>{autoLigado ? "DESATIVAR AUTOMÁTICO" : "LIGAR AUTOMÁTICO"}</strong>
              <span>Não precisa buscar na mão. Toque neste botão verde.</span>
            </button>
            <div className="crm-pane-top">
              <h1>Vasculhar 10 empresas novas</h1>
              <p>
                {nivel
                  ? `Nível ${nivel.nivel} agora: ${nivel.label}. ${nivel.detalhe}${
                      nivel.proximoEm
                        ? ` Sobe sozinho para ${nivel.proximoLabel} em ${nivel.proximoEm} dia${nivel.proximoEm === 1 ? "" : "s"}.`
                        : ""
                    } Quem já foi chamado ou está na fila não volta na busca.`
                  : "Começa nas pequenas empresas e sobe o porte com o tempo. Não repete quem já chamou."}
              </p>
            </div>
            <form
              className="aff-busca"
              onSubmit={(e) => {
                e.preventDefault();
                vasculhar();
              }}
            >
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
                maxLength={80}
              />
              <select value={segmento} onChange={(e) => setSegmento(e.target.value)}>
                {SEGMENTOS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <button type="submit" className="btn-chamar" disabled={buscando || autoLigado}>
                {buscando ? "Buscando 10…" : "Buscar lote de 10"}
              </button>
            </form>
            <div className="ag-chips">
              {CIDADES.map((nome) => (
                <button
                  key={nome}
                  type="button"
                  className={cidade === nome ? "is-on" : ""}
                  onClick={() => setCidade(nome)}
                >
                  {nome}
                </button>
              ))}
            </div>
            {avisoMaps ? <p className="aff-aviso">{avisoMaps}</p> : null}
            <div className="aff-grid">
              {achados.map((item) => (
                <article key={item.id} className="aff-card ag-card">
                  <h3>{item.nome}</h3>
                  <p>{item.categoria} · {item.bairro || item.cidade}</p>
                  <p>{formatarWhatsapp(item.whatsapp)}</p>
                  <small>{item.motivo}</small>
                  {item.precisaSoftware ? <em className="ag-tag">pode precisar de sistema</em> : null}
                  {!item.whatsappOk ? <em className="ag-tag is-warn">telefone fixo</em> : null}
                </article>
              ))}
            </div>
            {achados.length ? (
              <p>
                <button
                  type="button"
                  className="btn-chamar"
                  disabled={salvando}
                  onClick={ligarAutomatico}
                >
                  {autoLigado ? "Automático já está ligado" : "Ligar automático agora"}
                </button>
              </p>
            ) : null}
          </section>
        ) : null}

        {menu === "empresas" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Fila de empresas</h1>
              <p>{novos.length} ainda não chamadas · {chamados.length} já chamadas. Apagar da fila não faz a busca achar de novo.</p>
            </div>
            <form
              className="aff-busca"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const salvo = await salvarLeadAgencia({
                    nome: manual.nome,
                    whatsapp: validarWhatsapp(manual.whatsapp),
                    cidade: manual.cidade || cidade,
                    precisaSite: true,
                    precisaSoftware: true,
                    motivo: "Cadastro manual",
                    categoria: "empresa",
                    origem: "manual",
                  }, leads.map((l) => l.whatsapp));
                  if (salvo.duplicado) throw new Error("Essa empresa já está na fila");
                  setManual({ nome: "", whatsapp: "", cidade: manual.cidade || cidade });
                  setLeads((atual) => [{ id: salvo.id, nome: salvo.nome, whatsapp: salvo.whatsapp, cidade: manual.cidade || cidade, status: "novo" }, ...atual].slice(0, 300));
                } catch (error) {
                  setErro(error.message || "Não foi possível cadastrar");
                }
              }}
            >
              <input
                value={manual.nome}
                onChange={(e) => setManual({ ...manual, nome: e.target.value })}
                placeholder="Nome da empresa"
                required
                maxLength={120}
              />
              <input
                value={manual.whatsapp}
                onChange={(e) => setManual({ ...manual, whatsapp: e.target.value })}
                placeholder="WhatsApp"
                required
              />
              <button type="submit" className="btn-chamar">Cadastrar na fila</button>
            </form>
            {novos.length ? <p className="aff-resumo">Ainda não chamou</p> : null}
            <ul className="aff-grupos">
              {novos.map((lead) => (
                <li key={lead.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(selecionados[lead.id])}
                      disabled={!validarWhatsapp(lead.whatsapp)}
                      onChange={(e) =>
                        setSelecionados((atual) => ({ ...atual, [lead.id]: e.target.checked }))
                      }
                    />
                    <span>
                      <strong>{lead.nome}</strong>
                      <small>
                        {lead.cidade} · {formatarWhatsapp(lead.whatsapp)} · não chamou
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      excluirLeadAgencia(lead.id, lead).then(() => setLeads((l) => l.filter((x) => x.id !== lead.id)))
                    }
                  >
                    Apagar
                  </button>
                </li>
              ))}
            </ul>
            {chamados.length ? <p className="aff-resumo">Já chamou</p> : null}
            <ul className="aff-grupos">
              {chamados.map((lead) => (
                <li key={lead.id}>
                  <label>
                    <input type="checkbox" disabled checked={false} />
                    <span>
                      <strong>{lead.nome}</strong>
                      <small>
                        {lead.cidade} · {formatarWhatsapp(lead.whatsapp)} · já chamou
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      excluirLeadAgencia(lead.id, lead).then(() => setLeads((l) => l.filter((x) => x.id !== lead.id)))
                    }
                  >
                    Apagar
                  </button>
                </li>
              ))}
            </ul>
            {!leads.length ? <p className="aff-vazio">Fila vazia. Vasculhe o mapa primeiro.</p> : null}
          </section>
        ) : null}

        {menu === "auto" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Automático</h1>
              <p>Este é o botão. Liga e o sistema procura empresas e chama sozinho até você desativar.</p>
            </div>
            <button
              type="button"
              className={`ag-auto-hero ${autoLigado ? "is-on" : ""}`}
              onClick={toggleAutomatico}
            >
              <strong>{autoLigado ? "DESATIVAR AUTOMÁTICO" : "LIGAR AUTOMÁTICO"}</strong>
              <span>
                {autoLigado
                  ? (progresso || "Está ligado. Procurando e chamando. Toque para parar.")
                  : "Toque aqui. Eu procuro 10, chamo, procuro mais 10 e sigo."}
              </span>
            </button>
            {!waConectado ? (
              <p className="crm-erro-banner">
                WhatsApp ainda off. Vá na aba Conexão, leia o QR, depois volte e toque em LIGAR AUTOMÁTICO.
              </p>
            ) : null}
            <div className="aff-ritmos">
              {TEXTOS_AGENCIA.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={modelo === idx ? "is-on" : ""}
                  onClick={() => setModelo(idx)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <pre className="aff-preview">{preview}</pre>
          </section>
        ) : null}

        {menu === "conexao" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>WhatsApp da agência</h1>
              <p>Leia o QR com o celular 11 95202-5568. Os disparos da agência saem deste número.</p>
            </div>
            <WhatsappStatus conta="agencia" onConnected={setWaConectado} intervaloMs={30000} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
