"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import { atualizarLead, atualizarStatus, criarLead, excluirLead, importarLeadsCnh, ouvirLeads, STATUS, whatsappLead } from "../../lib/leads";
import { CNH_OPCOES, LIMITES, TIPOS_LEAD } from "../../lib/security";

const VAZIO = {
  nome: "",
  whatsapp: "",
  tipo: "FINANCIAMENTO",
  modelo: "",
  observacao: "",
  cnh: "Sim",
  status: "novo",
};

function tipoCurto(tipo) {
  if (tipo === "CONSÓRCIO") return "Consórcio";
  if (tipo === "CONHECER MOTOS") return "Motos";
  if (tipo === "CONSTATANDO") return "Constatando";
  return "Financ.";
}

function statusLabel(id) {
  return STATUS.find((item) => item.id === id)?.label || "Novo";
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
  const [leads, setLeads] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState("");
  const [edicao, setEdicao] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

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
    return undefined;
  }, [user, pronto]);

  const visiveis = useMemo(() => {
    if (filtro === "todos") return leads;
    return leads.filter((lead) => (lead.status || "novo") === filtro);
  }, [leads, filtro]);

  const contagem = useMemo(() => {
    const base = { todos: leads.length };
    STATUS.forEach((item) => {
      base[item.id] = leads.filter((lead) => (lead.status || "novo") === item.id).length;
    });
    return base;
  }, [leads]);

  async function salvar(event) {
    event.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await criarLead({ ...form, origem: "formulario" });
      setForm(VAZIO);
      setFiltro("todos");
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
      setErro("Não foi possível apagar. Publique as regras novas no Firebase e atualize a página.");
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

  if (loading || !user) {
    return (
      <main className="painel">
        <p className="lead">Carregando...</p>
      </main>
    );
  }

  return (
    <div className="painel">
      <header className="painel-top">
        <div>
          <p className="eyebrow">CRM Honda</p>
          <h1>Leads <span className="count-pill">{leads.length}</span></h1>
        </div>
        <div className="painel-actions">
          <button type="button" onClick={() => setMostrarCadastro((v) => !v)}>
            {mostrarCadastro ? "Fechar cadastro" : "+ Lead"}
          </button>
          <Link href="/">Formulário</Link>
          <button type="button" onClick={logout}>Sair</button>
        </div>
      </header>

      {!pronto && <p className="erro">Firebase não configurado.</p>}
      {erro && <p className="erro">{erro}</p>}

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
          <p className="lead">Nenhum lead neste filtro.</p>
        ) : (
          <div className="lead-table-wrap">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>Nome</th>
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
                            <input
                              className="cell-input"
                              autoFocus
                              maxLength={LIMITES.nome}
                              value={edicao.nome}
                              onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })}
                              onKeyDown={teclaEdicao}
                              placeholder="Nome"
                            />
                            <input
                              className="cell-input"
                              maxLength={LIMITES.modelo}
                              value={edicao.modelo}
                              onChange={(e) => setEdicao({ ...edicao, modelo: e.target.value })}
                              onKeyDown={teclaEdicao}
                              placeholder="Moto"
                            />
                          </div>
                        </td>
                        <td>
                          <div className="cell-pair">
                            <input
                              className="cell-input"
                              inputMode="tel"
                              maxLength={LIMITES.whatsapp}
                              value={edicao.whatsapp}
                              onChange={(e) => setEdicao({ ...edicao, whatsapp: e.target.value })}
                              onKeyDown={teclaEdicao}
                              placeholder="WhatsApp"
                            />
                            <input
                              className="cell-input"
                              maxLength={LIMITES.observacao}
                              value={edicao.observacao}
                              onChange={(e) => setEdicao({ ...edicao, observacao: e.target.value })}
                              onKeyDown={teclaEdicao}
                              placeholder="Obs"
                            />
                          </div>
                        </td>
                        <td>
                          <select
                            className="cell-input"
                            value={edicao.cnh}
                            onChange={(e) => setEdicao({ ...edicao, cnh: e.target.value })}
                          >
                            {CNH_OPCOES.map((opcao) => (
                              <option key={opcao}>{opcao}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="cell-input"
                            value={edicao.tipo}
                            onChange={(e) => setEdicao({ ...edicao, tipo: e.target.value })}
                          >
                            {TIPOS_LEAD.map((tipo) => (
                              <option key={tipo}>{tipo}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className={`status-select st-${edicao.status || "novo"}`}
                            value={edicao.status || "novo"}
                            onChange={(e) => setEdicao({ ...edicao, status: e.target.value })}
                          >
                            {STATUS.map((item) => (
                              <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
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
                          {lead.modelo ? <span className="muted"> {lead.modelo}</span> : null}
                        </td>
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
  );
}
