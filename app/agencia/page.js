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
import { emailPermitido, formatarWhatsapp, loginDoCrm, validarWhatsapp } from "../../lib/security";

const SEGMENTOS = [
  { id: "todos", label: "Todos" },
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
  const [lote, setLote] = useState([]);
  const [nivel, setNivel] = useState(null);
  const pararRef = useRef(false);
  const autoRef = useRef(false);
  const waRef = useRef(false);
  const loteRef = useRef([]);
  const leadsRef = useRef([]);
  const achadosRef = useRef([]);

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
        body: JSON.stringify({ cidade, segmento, excluir }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na busca");
      const lista = (Array.isArray(data.empresas) ? data.empresas : []).slice(0, LOTE_AGENDA);
      setAchados(lista);
      achadosRef.current = lista;
      if (data.nivel) setNivel(data.nivel);
      setAvisoMaps(
        lista.length
          ? `Lote de ${lista.length} novas${data.nivel?.label ? ` (nível ${data.nivel.nivel}: ${data.nivel.label})` : ""}. Empresas já vistas ou chamadas ficam de fora.`
          : "Não achei empresa nova nesta área. Troque a cidade ou o segmento.",
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
    const fila = (lista || achados).filter((e) => validarWhatsapp(e.whatsapp)).slice(0, LOTE_AGENDA);
    if (!fila.length) {
      setErro("Nenhuma dessas empresas tem telefone válido.");
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

  async function dispararFila(lista, { loteN = 1 } = {}) {
    const origem = Array.isArray(lista) && lista.length
      ? lista
      : loteRef.current.filter((l) => (l.status || "novo") === "novo");
    const jaChamados = new Set(
      leadsRef.current
        .filter((l) => (l.status || "novo") !== "novo" || l.chamadoEm)
        .map((l) => validarWhatsapp(l.whatsapp))
        .filter(Boolean),
    );
    const vistos = new Set();
    const fila = [];
    for (const lead of (origem.length ? origem : escolhidos)) {
      const fone = validarWhatsapp(lead.whatsapp);
      if (!fone || vistos.has(fone) || jaChamados.has(fone)) continue;
      if ((lead.status || "novo") !== "novo") continue;
      vistos.add(fone);
      fila.push(lead);
      if (fila.length >= LOTE_AGENDA) break;
    }
    if (!fila.length) return { ok: 0, falhas: 0, parou: false };
    if (!waRef.current) {
      setErro("WhatsApp desconectado. Vá em Conexão e leia o QR com o 11 95202-5568.");
      setMenu("conexao");
      return { ok: 0, falhas: 0, parou: true };
    }
    let ok = 0;
    let falhas = 0;
    for (let i = 0; i < fila.length; i += 1) {
      if (pararRef.current) break;
      const lead = fila[i];
      const texto = montarAbordagemAgencia(lead, modelo + i);
      setProgresso(`Lote ${loteN}: ${i + 1}/${fila.length} · chamando ${lead.nome}`);
      try {
        const res = await fetch("/api/agencia/disparar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsapp: lead.whatsapp, texto, leadId: lead.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no envio");
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
        if (!data.skipped) ok += 1;
      } catch (error) {
        falhas += 1;
        setErro(error.message || "Falha no disparo");
      }
      if (i < fila.length - 1 && !pararRef.current) await sleep(delayAgenciaMs());
    }
    return { ok, falhas, parou: pararRef.current };
  }

  async function dispararAutomatico(listaInicial) {
    if (autoRef.current || disparando) return;
    if (!waRef.current) {
      setErro("WhatsApp desconectado. Vá em Conexão e leia o QR com o 11 95202-5568.");
      setMenu("conexao");
      return;
    }
    const hora = horaBrasil();
    const aviso =
      hora < 8 || hora >= 19
        ? "Fora do horário comercial o risco de ban sobe. Disparar automático mesmo assim (10, depois mais 10, sem repetir empresa)?"
        : "Disparo automático: chama 10, busca outras 10 novas e segue sozinho. A mesma empresa não entra de novo. Parar cancela.";
    if (!window.confirm(aviso)) return;

    pararRef.current = false;
    autoRef.current = true;
    setDisparando(true);
    setErro("");
    let lotes = 0;
    let totalOk = 0;
    let totalFalhas = 0;

    try {
      let fila = Array.isArray(listaInicial) && listaInicial.length
        ? listaInicial
        : loteRef.current.filter((l) => (l.status || "novo") === "novo");

      while (!pararRef.current && autoRef.current) {
        if (!waRef.current) {
          setErro("WhatsApp desconectou. Disparo automático parado.");
          break;
        }
        if (!fila.length) {
          setProgresso(
            lotes
              ? `Lote ${lotes} encerrado (${totalOk} chamadas). Buscando mais 10 empresas novas…`
              : "Buscando o primeiro lote de 10 empresas novas…",
          );
          const encontradas = await vasculhar();
          if (pararRef.current) break;
          if (!encontradas.length) {
            setProgresso(
              lotes
                ? `Automático encerrado: não achei empresa nova. ${totalOk} chamadas em ${lotes} lote(s).`
                : "Não achei empresa nova para chamar.",
            );
            break;
          }
          fila = await guardarAchados(encontradas);
          if (pararRef.current) break;
          if (!fila.length) {
            setProgresso(`Automático encerrado: as encontradas já tinham sido chamadas. ${totalOk} envios.`);
            break;
          }
          setMenu("disparo");
        }

        lotes += 1;
        const r = await dispararFila(fila, { loteN: lotes });
        totalOk += r.ok;
        totalFalhas += r.falhas;
        fila = [];
        loteRef.current = [];
        setLote([]);
        if (r.parou) break;
      }
    } finally {
      autoRef.current = false;
      setDisparando(false);
      if (pararRef.current) {
        setProgresso(`Parado: ${totalOk} chamadas, ${totalFalhas} falhas, ${lotes} lote(s).`);
      }
    }
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
              <h1>Vasculhar 10 empresas novas</h1>
              <p>
                {nivel
                  ? `Nível ${nivel.nivel} agora: ${nivel.label}. ${nivel.detalhe}${
                      nivel.proximoEm
                        ? ` Sobe sozinho para ${nivel.proximoLabel} em ${nivel.proximoEm} dia${nivel.proximoEm === 1 ? "" : "s"}.`
                        : ""
                    } Quem já foi visto ou chamado não volta na busca.`
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
                  onClick={async () => {
                    const salvos = await guardarAchados(achados.filter((e) => validarWhatsapp(e.whatsapp)));
                    if (salvos.length) dispararAutomatico(salvos);
                  }}
                >
                  {salvando ? "Guardando lote…" : "Guardar e disparar automático"}
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

        {menu === "disparo" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Chamar automático</h1>
              <p>Chama 10, busca outras 10 novas e segue. Pausa de 85 a 130s. Não repete empresa.</p>
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
                onClick={() => dispararAutomatico()}
              >
                {disparando ? "Chamando automático…" : "Disparar automático (10 e mais 10)"}
              </button>
              {disparando ? (
                <button
                  type="button"
                  onClick={() => {
                    pararRef.current = true;
                    autoRef.current = false;
                  }}
                >
                  Parar
                </button>
              ) : null}
            </div>
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
