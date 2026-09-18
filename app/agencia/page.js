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
  { id: "todos", label: "Todos (sem site)" },
  { id: "salao", label: "Salão / estética" },
  { id: "oficina", label: "Oficina / auto" },
  { id: "clinica", label: "Clínica / saúde" },
  { id: "dentista", label: "Dentista" },
  { id: "imobiliaria", label: "Imobiliária" },
  { id: "advocacia", label: "Advocacia / contábil" },
  { id: "restaurante", label: "Restaurante / food" },
  { id: "pet", label: "Pet shop" },
  { id: "padaria", label: "Padaria / mercado" },
  { id: "loja", label: "Loja / comércio" },
];

const MENUS = [
  { id: "maps", label: "Mapa", icon: "🗺️" },
  { id: "empresas", label: "Fila", icon: "🏢" },
  { id: "disparo", label: "Disparar", icon: "🚀" },
  { id: "conexao", label: "Conexão", icon: "📶" },
];

const CIDADES = ["São Paulo", "Guarulhos", "Osasco", "Santo André", "Campinas", "Rio de Janeiro", "Belo Horizonte"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AgenciaPage() {
  const router = useRouter();
  const { user, loading, logout, pronto } = useAuth();
  const [menu, setMenu] = useState("maps");
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
  const [pagina, setPagina] = useState(0);
  const [lote, setLote] = useState([]);
  const pararRef = useRef(false);

  const escolhidos = useMemo(
    () => leads.filter((l) => selecionados[l.id] && l.status === "novo" && celularWhatsapp(l.whatsapp)),
    [leads, selecionados],
  );
  const novos = useMemo(() => leads.filter((l) => (l.status || "novo") === "novo"), [leads]);
  const preview = useMemo(
    () => montarAbordagemAgencia(escolhidos[0] || achados[0] || { nome: "sua empresa", cidade }, modelo),
    [escolhidos, achados, cidade, modelo],
  );

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
      const excluir = [...leads.map((l) => l.whatsapp), ...achados.map((l) => l.whatsapp)];
      const res = await fetch("/api/agencia/prospeccao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidade, segmento, pagina, excluir }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na busca");
      const lista = (Array.isArray(data.empresas) ? data.empresas : []).slice(0, LOTE_AGENDA);
      setAchados(lista);
      setAvisoMaps(
        lista.length
          ? `Lote de ${lista.length}. Dispara essas, depois busca as próximas 10.`
          : "Não achei 10 novas nesta área. Troque a cidade ou o segmento.",
      );
      setMenu("maps");
    } catch (error) {
      setErro(error.message || "Não foi possível vasculhar o mapa");
    } finally {
      setBuscando(false);
    }
  }

  async function guardarAchados(lista) {
    const fila = (lista || achados).filter((e) => e.whatsappOk).slice(0, LOTE_AGENDA);
    if (!fila.length) {
      setErro("Nenhuma dessas empresas tem celular de WhatsApp.");
      return [];
    }
    setSalvando(true);
    setErro("");
    const conhecidos = leads.map((l) => l.whatsapp);
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
      setLeads((atual) => [...salvos, ...atual].slice(0, 40));
      setLote(salvos);
      setSelecionados(Object.fromEntries(salvos.map((l) => [l.id, true])));
      setProgresso(`Lote pronto: ${salvos.length}${dup ? ` · ${dup} repetidas` : ""}. Agora dispara essas ${salvos.length}.`);
      setMenu("disparo");
      return salvos;
    } catch (error) {
      setErro(error.message || "Não foi possível guardar");
      return [];
    } finally {
      setSalvando(false);
    }
  }

  function horaBrasil() {
    return Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date()),
    );
  }

  async function dispararFila(lista) {
    if (disparando) return;
    const origem = Array.isArray(lista) && lista.length
      ? lista
      : lote.filter((l) => (l.status || "novo") === "novo");
    const fila = (origem.length ? origem : escolhidos)
      .filter((l) => celularWhatsapp(l.whatsapp))
      .slice(0, LOTE_AGENDA);
    if (!fila.length) {
      setErro("Busque um lote de 10 e guarde na fila antes de disparar.");
      setMenu("maps");
      return;
    }
    if (!waConectado) {
      setErro("WhatsApp desconectado. Vá em Conexão e leia o QR com o 11 92603-1750.");
      setMenu("conexao");
      return;
    }
    const hora = horaBrasil();
    const aviso =
      hora < 8 || hora >= 19
        ? "Fora do horário comercial o risco de ban sobe. Disparar mesmo assim este lote de 10?"
        : `Chamar ${fila.length} deste lote? Uma por vez, pausa de ~80–120s, sem demonstração.`;
    if (!window.confirm(aviso)) return;
    pararRef.current = false;
    setDisparando(true);
    setErro("");
    let ok = 0;
    let falhas = 0;
    for (let i = 0; i < fila.length; i += 1) {
      if (pararRef.current) break;
      const lead = fila[i];
      const texto = montarAbordagemAgencia(lead, modelo + i);
      setProgresso(`Lote ${i + 1}/${fila.length}: chamando ${lead.nome}`);
      try {
        const res = await fetch("/api/agencia/disparar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsapp: lead.whatsapp, texto, leadId: lead.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no envio");
        if (lead.id) await atualizarLeadAgencia(lead.id, { status: "chamou", chamadoEm: true });
        setLeads((atual) => atual.map((l) => (l.id === lead.id ? { ...l, status: "chamou" } : l)));
        setLote((atual) => atual.map((l) => (l.id === lead.id ? { ...l, status: "chamou" } : l)));
        ok += 1;
      } catch (error) {
        falhas += 1;
        setErro(error.message || "Falha no disparo");
      }
      if (i < fila.length - 1 && !pararRef.current) await sleep(delayAgenciaMs());
    }
    setDisparando(false);
    setProgresso(`Lote encerrado: ${ok} chamados, ${falhas} falhas. Agora busque as próximas 10.`);
    setPagina((n) => n + 1);
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
            <small>{waConectado ? "11 92603-1750 on" : "11 92603-1750 off"}</small>
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
              {item.id === "disparo" && escolhidos.length ? (
                <em className="crm-nav-badge">{escolhidos.length}</em>
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
        {erro ? <p className="crm-erro-banner">{erro}</p> : null}
        {progresso ? <p className="aff-aviso">{progresso}</p> : null}

        {menu === "maps" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Vasculhar 10 empresas</h1>
              <p>Busca 10, chama essas 10, depois busca outras 10. Sem demonstração: puxa atenção e apresenta site, landing page, marketing e sistema.</p>
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
              <button type="submit" className="btn-chamar" disabled={buscando}>
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
                  onClick={() => guardarAchados(achados.filter((e) => e.whatsappOk))}
                >
                  {salvando ? "Guardando lote…" : "Guardar estas 10 e ir disparar"}
                </button>
              </p>
            ) : null}
          </section>
        ) : null}

        {menu === "empresas" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Fila de empresas</h1>
              <p>{novos.length} ainda não foram abordadas. Marque e mande para Disparar.</p>
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
                  setLeads((atual) => [{ id: salvo.id, nome: salvo.nome, whatsapp: salvo.whatsapp, cidade: manual.cidade || cidade, status: "novo" }, ...atual].slice(0, 40));
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
            <ul className="aff-grupos">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(selecionados[lead.id])}
                      disabled={lead.status !== "novo" || !celularWhatsapp(lead.whatsapp)}
                      onChange={(e) =>
                        setSelecionados((atual) => ({ ...atual, [lead.id]: e.target.checked }))
                      }
                    />
                    <span>
                      <strong>{lead.nome}</strong>
                      <small>
                        {lead.cidade} · {formatarWhatsapp(lead.whatsapp)} · {lead.status || "novo"}
                      </small>
                    </span>
                  </label>
                  <button type="button" onClick={() => excluirLeadAgencia(lead.id).then(() => setLeads((l) => l.filter((x) => x.id !== lead.id)))}>
                    Apagar
                  </button>
                </li>
              ))}
            </ul>
            {!leads.length ? <p className="aff-vazio">Fila vazia. Vasculhe o mapa primeiro.</p> : null}
          </section>
        ) : null}

        {menu === "disparo" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Chamar o lote</h1>
              <p>Primeiro chama, puxa atenção e apresenta site/sistema. Sem demo. Máximo 10, pausa de 80–120s.</p>
            </div>
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
            <p className="aff-resumo">
              {lote.filter((l) => (l.status || "novo") === "novo").length || escolhidos.length} neste lote
            </p>
            <div className="lead-tools">
              <button
                type="button"
                className="btn-chamar"
                disabled={disparando || !waConectado}
                onClick={() => dispararFila()}
              >
                {disparando ? "Chamando lote…" : "Disparar este lote (10)"}
              </button>
              {disparando ? (
                <button type="button" onClick={() => { pararRef.current = true; }}>
                  Parar
                </button>
              ) : null}
              <button
                type="button"
                disabled={buscando || disparando}
                onClick={() => {
                  setMenu("maps");
                  vasculhar();
                }}
              >
                Buscar próximas 10
              </button>
            </div>
          </section>
        ) : null}

        {menu === "conexao" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>WhatsApp da agência</h1>
              <p>Leia o QR com o celular 11 92603-1750. Número diferente do Honda e do afiliado.</p>
            </div>
            <WhatsappStatus conta="agencia" onConnected={setWaConectado} intervaloMs={30000} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
