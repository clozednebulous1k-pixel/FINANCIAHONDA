"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import { atualizarLead, atualizarStatus, criarLead, importarLeadsCnh, ouvirLeads, STATUS, whatsappLead } from "../../lib/leads";
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

function formatarData(valor) {
  if (!valor?.toDate) return "Agora";
  return valor.toDate().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formDoLead(lead) {
  return {
    nome: lead.nome || "",
    whatsapp: lead.whatsapp || "",
    tipo: lead.tipo || "FINANCIAMENTO",
    modelo: lead.modelo || "",
    observacao: lead.observacao || "",
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
    importarLeadsCnh().catch(() => {
      setErro("A lista aparece e some se as regras do Firebase estiverem desatualizadas. Publique o firestore.rules e atualize a página.");
    });
    return undefined;
  }, [user, pronto]);

  const visiveis = useMemo(() => {
    if (filtro === "todos") return leads;
    return leads.filter((lead) => lead.status === filtro);
  }, [leads, filtro]);

  async function salvar(event) {
    event.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await criarLead(form);
      setForm(VAZIO);
    } catch (error) {
      setErro("Não foi possível salvar o lead. Confira as regras do Firebase.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao(event) {
    event.preventDefault();
    setErro("");
    try {
      await atualizarLead(editandoId, edicao);
      setEditandoId("");
    } catch (error) {
      setErro("Não foi possível atualizar o lead. Publique as regras novas no Firebase.");
    }
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
          <h1>Leads do vendedor</h1>
          <p className="lead">Lista com CNH do tráfego pago. Clique em Editar para mudar os dados.</p>
        </div>
        <div className="painel-actions">
          <Link href="/">Formulário</Link>
          <button type="button" onClick={logout}>Sair</button>
        </div>
      </header>

      {!pronto && <p className="erro">Firebase não configurado.</p>}
      {erro && <p className="erro">{erro}</p>}

      <section className="painel-card">
        <h2>Cadastrar lead</h2>
        <form className="lead-form" onSubmit={salvar}>
          <CamposLead form={form} setForm={setForm} />
          <button className="btn-primary span-2" type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar lead"}
          </button>
        </form>
      </section>

      <section className="painel-card">
        <div className="painel-filters">
          <h2>Fila ({visiveis.length})</h2>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            {STATUS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>

        {carregandoLista ? (
          <p className="lead">Carregando leads...</p>
        ) : visiveis.length === 0 ? (
          <p className="lead">Nenhum lead neste filtro. Se a lista deveria aparecer, publique as regras do Firebase e atualize a página.</p>
        ) : (
          <div className="lead-list">
            {visiveis.map((lead) => (
              <article key={lead.id} className="lead-item">
                {editandoId === lead.id ? (
                  <form className="lead-form span-full" onSubmit={salvarEdicao}>
                    <CamposLead form={edicao} setForm={setEdicao} incluirStatus />
                    <div className="lead-edit-actions span-2">
                      <button className="btn-primary" type="submit">Salvar alterações</button>
                      <button className="btn-ghost" type="button" onClick={() => setEditandoId("")}>Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{lead.nome}</strong>
                      <p>{lead.tipo}{lead.modelo ? ` · ${lead.modelo}` : ""} · CNH: {lead.cnh || "—"}</p>
                      <small>{lead.whatsapp} · {lead.origem === "formulario" ? "Formulário" : "Tráfego pago"} · {formatarData(lead.createdAt)}</small>
                      {lead.observacao ? <p className="obs">{lead.observacao}</p> : null}
                    </div>
                    <div className="lead-tools">
                      <select
                        value={lead.status || "novo"}
                        onChange={(e) => atualizarStatus(lead.id, e.target.value)}
                      >
                        {STATUS.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                      <a className="btn-whatsapp-mini" href={whatsappLead(lead.whatsapp)} target="_blank" rel="noopener noreferrer">
                        WhatsApp
                      </a>
                      <button
                        className="btn-ghost"
                        type="button"
                        onClick={() => {
                          setEditandoId(lead.id);
                          setEdicao(formDoLead(lead));
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
