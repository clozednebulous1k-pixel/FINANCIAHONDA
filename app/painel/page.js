"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import { atualizarStatus, criarLead, ouvirLeads, STATUS, whatsappLead } from "../../lib/leads";
import { LIMITES, TIPOS_LEAD } from "../../lib/security";

const VAZIO = {
  nome: "",
  whatsapp: "",
  tipo: "FINANCIAMENTO",
  modelo: "",
  observacao: "",
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

export default function PainelPage() {
  const router = useRouter();
  const { user, loading, logout, pronto } = useAuth();
  const [leads, setLeads] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return undefined;
    return ouvirLeads(setLeads);
  }, [user]);

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
      setErro("Não foi possível salvar o lead. Confira o Firebase.");
    } finally {
      setSalvando(false);
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
          <p className="lead">Tráfego pago agora. Depois ligamos as respostas do formulário.</p>
        </div>
        <div className="painel-actions">
          <Link href="/">Formulário</Link>
          <button type="button" onClick={logout}>Sair</button>
        </div>
      </header>

      {!pronto && <p className="erro">Firebase não configurado.</p>}

      <section className="painel-card">
        <h2>Cadastrar lead do anúncio</h2>
        <form className="lead-form" onSubmit={salvar}>
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
          <label className="span-2">
            Observação
            <input
              maxLength={LIMITES.observacao}
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="Veio do Instagram, pediu simulação..."
            />
          </label>
          {erro && <p className="erro span-2">{erro}</p>}
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

        {visiveis.length === 0 ? (
          <p className="lead">Nenhum lead ainda. Cadastre os do tráfego pago ou me mande as fotos que eu jogo aqui.</p>
        ) : (
          <div className="lead-list">
            {visiveis.map((lead) => (
              <article key={lead.id} className="lead-item">
                <div>
                  <strong>{lead.nome}</strong>
                  <p>{lead.tipo}{lead.modelo ? ` · ${lead.modelo}` : ""}</p>
                  <small>{lead.origem === "formulario" ? "Formulário" : "Tráfego pago"} · {formatarData(lead.createdAt)}</small>
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
