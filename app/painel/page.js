"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import InboxConversas from "../../components/InboxConversas";
import WhatsappStatus from "../../components/WhatsappStatus";
import { delayAntiBanMs, montarAbordagem } from "../../lib/abordagens";
import { atualizarLead, atualizarStatus, criarLead, excluirLead, importarLeadsCnh, marcarTodosConstatando, ouvirLeads, STATUS, whatsappLead } from "../../lib/leads";
import { salvarMensagem } from "../../lib/mensagens";
import { CNH_OPCOES, LIMITES, TIPOS_LEAD } from "../../lib/security";

const VAZIO = {
  nome: "",
  whatsapp: "",
  tipo: "CONSTATANDO",
  modelo: "",
  observacao: "",
  cnh: "Sim",
  status: "novo",
};

const MENUS = [
  { id: "conversas", label: "Conversas", icon: "💬" },
  { id: "leads", label: "Leads", icon: "👥" },
  { id: "conexao", label: "Conexão", icon: "📶" },
];

function tipoCurto(tipo) {
  if (tipo === "CONSÓRCIO") return "Consórcio";
  if (tipo === "CONHECER MOTOS") return "Motos";
  if (tipo === "CONSTATANDO") return "Constatando";
  return "Financ.";
}

function statusLabel(id) {
  return STATUS.find((item) => item.id === id)?.label || "Novo";
}

function dataLead(valor) {
  const ms = valor?.toMillis?.() || 0;
  if (!ms) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function leadCombina(lead, busca) {
  const termo = busca.trim().toLowerCase();
  if (!termo) return true;
  const fone = String(lead.whatsapp || "").replace(/\D/g, "");
  const digits = termo.replace(/\D/g, "");
  if (digits.length >= 4 && fone.includes(digits)) return true;
  const texto = [
    lead.nome,
    lead.whatsapp,
    lead.modelo,
    lead.observacao,
    lead.tipo,
    lead.cnh,
    statusLabel(lead.status),
    tipoCurto(lead.tipo),
  ]
    .join(" ")
    .toLowerCase();
  return texto.includes(termo);
}

function formDoLead(lead) {
  return {
    nome: lead.nome || "",
    whatsapp: lead.whatsapp || "",
    tipo: lead.tipo || "CONSTATANDO",
    modelo: lead.modelo || "",
    observacao: lead.observacao || "",
    origem: lead.origem || "trafego-pago",
    cnh: lead.cnh || "Sim",
    status: lead.status || "novo",
  };
}

function CamposLead({ form, setForm, incluirStatus }) {
  return (
    <>
      <label>
        Nome
        <input
          required
          maxLength={LIMITES.nome}
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Nome do cliente"
        />
      </label>
      <label>
        WhatsApp
        <input
          required
          maxLength={LIMITES.whatsapp}
          inputMode="tel"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="(11) 99999-9999"
        />
      </label>
      <label>
        Interesse
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
          {TIPOS_LEAD.map((tipo) => (
            <option key={tipo}>{tipo}</option>
          ))}
        </select>
      </label>
      <label>
        Modelo
        <input
          maxLength={LIMITES.modelo}
          value={form.modelo}
          onChange={(e) => setForm({ ...form, modelo: e.target.value })}
          placeholder="Sahara, CG 160..."
        />
      </label>
      <label>
        Tem CNH?
        <select value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })}>
          {CNH_OPCOES.map((opcao) => (
            <option key={opcao}>{opcao}</option>
          ))}
        </select>
      </label>
      {incluirStatus ? (
        <label>
          Status
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="span-2">
        Observação
        <input
          maxLength={LIMITES.observacao}
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          placeholder="Veio do Instagram, pediu simulação..."
        />
      </label>
    </>
  );
}

export default function PainelPage() {
  const router = useRouter();
  const { user, loading, logout, pronto } = useAuth();
  const [menu, setMenu] = useState("conversas");
  const [leads, setLeads] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState("");
  const [edicao, setEdicao] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [waConectado, setWaConectado] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [progressoDisparo, setProgressoDisparo] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return undefined;
    setCarregandoLista(true);
    return ouvirLeads(
      (lista) => {
        setLeads(lista);
        setCarregandoLista(false);
      },
      () => {
        setCarregandoLista(false);
        setErro("Sem permissão para ler os leads. Publique as regras novas no Firebase e entre de novo.");
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user || !pronto) return undefined;
    importarLeadsCnh().catch(() => {});
    marcarTodosConstatando().catch(() => {});
    return undefined;
  }, [user, pronto]);

  const visiveis = useMemo(() => {
    const porStatus = filtro === "todos" ? leads : leads.filter((lead) => (lead.status || "novo") === filtro);
    return porStatus.filter((lead) => leadCombina(lead, busca));
  }, [leads, filtro, busca]);

  const contagem = useMemo(() => {
    const base = { todos: leads.length };
    STATUS.forEach((item) => {
      base[item.id] = leads.filter((lead) => (lead.status || "novo") === item.id).length;
    });
    return base;
  }, [leads]);

  const naoLidas = useMemo(
    () => leads.reduce((acc, lead) => acc + (Number(lead.naoLidas) || 0), 0),
    [leads],
  );

  async function salvar(event) {
    event.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await criarLead({ ...form, origem: "formulario" });
      setForm(VAZIO);
      setFiltro("todos");
      setMenu("leads");
    } catch (error) {
      setErro("Não foi possível salvar o lead. Confira as regras do Firebase.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(lead) {
    if (!window.confirm(`Apagar o lead ${lead.nome}?`)) return;
    setErro("");
    try {
      await excluirLead(lead.id);
      if (editandoId === lead.id) setEditandoId("");
    } catch (error) {
      setErro("Não foi possível apagar. Publique as regras novas do Firebase e atualize a página.");
    }
  }

  async function salvarEdicao() {
    if (!editandoId) return;
    setErro("");
    try {
      await atualizarLead(editandoId, edicao);
      setEditandoId("");
    } catch (error) {
      setErro("Não foi possível atualizar o lead. Publique as regras novas no Firebase.");
    }
  }

  function teclaEdicao(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      salvarEdicao();
    }
    if (event.key === "Escape") setEditandoId("");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function chamarNovosWhatsapp() {
    const fila = leads.filter((lead) => (lead.status || "novo") === "novo");
    if (!fila.length) {
      setErro("Não há leads com status Novo para chamar.");
      return;
    }
    if (!window.confirm(`Chamar ${fila.length} lead(s) no WhatsApp com intervalo anti-ban?`)) return;

    setDisparando(true);
    setErro("");
    let ok = 0;
    let falhas = 0;

    for (let i = 0; i < fila.length; i += 1) {
      const lead = fila[i];
      const texto = montarAbordagem(lead.nome, i);
      setProgressoDisparo(`Enviando ${i + 1}/${fila.length}: ${lead.nome}`);
      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            whatsapp: lead.whatsapp,
            nome: lead.nome,
            texto,
            indice: i,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no envio");
        await salvarMensagem(lead.id, { texto, fromMe: true });
        await atualizarStatus(lead.id, "aguardando_resposta");
        ok += 1;
      } catch {
        falhas += 1;
      }
      if (i < fila.length - 1) {
        const espera = delayAntiBanMs();
        setProgressoDisparo(`Aguardando ${Math.round(espera / 1000)}s antes do próximo...`);
        await sleep(espera);
      }
    }

    setProgressoDisparo(`Concluído: ${ok} enviados${falhas ? `, ${falhas} falhas` : ""}.`);
    setDisparando(false);
  }

  if (loading || !user) {
    return (
      <main className="crm-shell crm-loading">
        <p>Carregando CRM…</p>
      </main>
    );
  }

  return (
    <div className="crm-shell">
      <aside className="crm-nav">
        <div className="crm-brand">
          <span className="crm-mark">H</span>
          <div>
            <strong>Honda CRM</strong>
            <small>{waConectado ? "WhatsApp on" : "WhatsApp off"}</small>
          </div>
        </div>

        <nav className="crm-menu">
          {MENUS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={menu === item.id ? "is-on" : ""}
              onClick={() => setMenu(item.id)}
              title={item.label}
              aria-label={item.label}
            >
              <span className="crm-menu-label">
                <span className="crm-menu-ico" aria-hidden="true">{item.icon}</span>
                {item.label}
              </span>
              {item.id === "conversas" && naoLidas > 0 ? (
                <em className="crm-nav-badge">{naoLidas}</em>
              ) : null}
              {item.id === "leads" ? <em className="crm-nav-count">{leads.length}</em> : null}
            </button>
          ))}
        </nav>

        <div className="crm-nav-foot">
          <Link href="/">Formulário</Link>
          <button type="button" onClick={logout}>Sair</button>
        </div>
      </aside>

      <main className="crm-main">
        {!pronto && <p className="erro">Firebase não configurado.</p>}
        {erro && <p className="erro crm-erro-banner">{erro}</p>}

        {menu === "conversas" ? (
          <InboxConversas
            leads={leads}
            carregando={carregandoLista}
            waConectado={waConectado}
            onChamarNovos={chamarNovosWhatsapp}
            disparando={disparando}
            progresso={progressoDisparo}
          />
        ) : null}

        {menu === "conexao" ? (
          <div className="crm-pane">
            <header className="crm-pane-top">
              <h1>Conexão WhatsApp</h1>
              <p>Número Business 11 94753-9917</p>
            </header>
            <WhatsappStatus onConnected={setWaConectado} />
          </div>
        ) : null}

        {menu === "leads" ? (
          <div className="crm-pane">
            <header className="crm-pane-top crm-pane-top-row">
              <div>
                <h1>Leads</h1>
                <p>{leads.length} leads no funil</p>
              </div>
              <div className="crm-pane-actions">
                <button type="button" className="btn-chamar" onClick={chamarNovosWhatsapp} disabled={disparando || !waConectado}>
                  {disparando ? "Chamando..." : "Chamar novos"}
                </button>
                <button type="button" onClick={() => setMostrarCadastro((v) => !v)}>
                  {mostrarCadastro ? "Fechar" : "+ Lead"}
                </button>
              </div>
            </header>

            {progressoDisparo ? <p className="disparo-box">{progressoDisparo}</p> : null}

            {mostrarCadastro && (
              <section className="painel-card">
                <h2>Cadastrar lead</h2>
                <form className="lead-form" onSubmit={salvar}>
                  <CamposLead form={form} setForm={setForm} />
                  <button className="btn-primary span-2" type="submit" disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar lead"}
                  </button>
                </form>
              </section>
            )}

            <label className="busca-painel">
              <span className="busca-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, WhatsApp, moto ou observação..."
                autoComplete="off"
              />
              {busca ? (
                <button type="button" className="busca-limpar" onClick={() => setBusca("")}>
                  Limpar
                </button>
              ) : null}
            </label>

            <div className="status-tabs">
              <button type="button" className={filtro === "todos" ? "is-on" : ""} onClick={() => setFiltro("todos")}>
                Todos {contagem.todos}
              </button>
              {STATUS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`st-${item.id} ${filtro === item.id ? "is-on" : ""}`}
                  onClick={() => setFiltro(item.id)}
                >
                  {item.label} {contagem[item.id] || 0}
                </button>
              ))}
            </div>

            <section className="painel-card table-card">
              {carregandoLista ? (
                <p className="lead">Carregando leads...</p>
              ) : visiveis.length === 0 ? (
                <p className="lead">{busca.trim() ? "Nenhum lead nesta busca." : "Nenhum lead neste filtro."}</p>
              ) : (
                <div className="lead-table-wrap">
                  <table className="lead-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Adicionado</th>
                        <th>WhatsApp</th>
                        <th>CNH</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiveis.map((lead) => (
                        <tr key={lead.id} className={editandoId === lead.id ? "is-edit" : ""}>
                          {editandoId === lead.id ? (
                            <>
                              <td>
                                <div className="cell-pair">
                                  <input className="cell-input" autoFocus maxLength={LIMITES.nome} value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} onKeyDown={teclaEdicao} placeholder="Nome" />
                                  <input className="cell-input" maxLength={LIMITES.modelo} value={edicao.modelo} onChange={(e) => setEdicao({ ...edicao, modelo: e.target.value })} onKeyDown={teclaEdicao} placeholder="Moto" />
                                </div>
                              </td>
                              <td className="nowrap muted">{dataLead(lead.createdAt)}</td>
                              <td>
                                <div className="cell-pair">
                                  <input className="cell-input" inputMode="tel" maxLength={LIMITES.whatsapp} value={edicao.whatsapp} onChange={(e) => setEdicao({ ...edicao, whatsapp: e.target.value })} onKeyDown={teclaEdicao} placeholder="WhatsApp" />
                                  <input className="cell-input" maxLength={LIMITES.observacao} value={edicao.observacao} onChange={(e) => setEdicao({ ...edicao, observacao: e.target.value })} onKeyDown={teclaEdicao} placeholder="Obs" />
                                </div>
                              </td>
                              <td>
                                <select className="cell-input" value={edicao.cnh} onChange={(e) => setEdicao({ ...edicao, cnh: e.target.value })}>
                                  {CNH_OPCOES.map((opcao) => <option key={opcao}>{opcao}</option>)}
                                </select>
                              </td>
                              <td>
                                <select className="cell-input" value={edicao.tipo} onChange={(e) => setEdicao({ ...edicao, tipo: e.target.value })}>
                                  {TIPOS_LEAD.map((tipo) => <option key={tipo}>{tipo}</option>)}
                                </select>
                              </td>
                              <td>
                                <select className={`status-select st-${edicao.status || "novo"}`} value={edicao.status || "novo"} onChange={(e) => setEdicao({ ...edicao, status: e.target.value })}>
                                  {STATUS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                                </select>
                              </td>
                              <td className="row-actions">
                                <button type="button" className="is-save" onClick={salvarEdicao}>Salvar</button>
                                <button type="button" onClick={() => setEditandoId("")}>Cancelar</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>
                                <strong>{lead.nome}</strong>
                                {lead.naoLidas ? <span className="badge-msg">{lead.naoLidas}</span> : null}
                                {lead.modelo ? <span className="muted"> {lead.modelo}</span> : null}
                              </td>
                              <td className="nowrap muted">{dataLead(lead.createdAt)}</td>
                              <td className="nowrap">{lead.whatsapp}</td>
                              <td>{lead.cnh || "—"}</td>
                              <td>{tipoCurto(lead.tipo)}</td>
                              <td>
                                <select
                                  className={`status-select st-${lead.status || "novo"}`}
                                  value={lead.status || "novo"}
                                  onChange={(e) => atualizarStatus(lead.id, e.target.value)}
                                  aria-label={statusLabel(lead.status)}
                                >
                                  {STATUS.map((item) => (
                                    <option key={item.id} value={item.id}>{item.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="row-actions">
                                <button type="button" className="is-chat" onClick={() => { setMenu("conversas"); }}>
                                  Conversas
                                </button>
                                <a href={whatsappLead(lead.whatsapp)} target="_blank" rel="noopener noreferrer">WA</a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditandoId(lead.id);
                                    setEdicao(formDoLead(lead));
                                  }}
                                >
                                  Editar
                                </button>
                                <button type="button" className="is-del" onClick={() => apagar(lead)}>
                                  Apagar
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
