"use client";

import { useEffect, useState } from "react";
import { STATUS, atualizarLead, atualizarStatus } from "../lib/leads";
import { CNH_OPCOES, ORIGENS_LEAD, TIPOS_LEAD } from "../lib/security";

const ORIGEM_LABEL = {
  "trafego-pago": "Tráfego pago",
  formulario: "Formulário",
};

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

function formDoLead(lead) {
  return {
    nome: lead?.nome || "",
    whatsapp: lead?.whatsapp || "",
    tipo: TIPOS_LEAD.includes(lead?.tipo) ? lead.tipo : "FINANCIAMENTO",
    modelo: lead?.modelo || "",
    cnh: CNH_OPCOES.includes(lead?.cnh) ? lead.cnh : "Não",
    origem: ORIGENS_LEAD.includes(lead?.origem) ? lead.origem : "trafego-pago",
    observacao: lead?.observacao || "",
    status: lead?.status || "novo",
  };
}

export default function SituacaoCliente({ lead, onBack }) {
  const [form, setForm] = useState(() => formDoLead(lead));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    setForm(formDoLead(lead));
    setMsg("");
    setErro("");
  }, [lead?.id]);

  if (!lead) {
    return (
      <aside className="wa-situacao">
        <div className="wa-situacao-empty">
          <h3>Situação do lead</h3>
          <p>Selecione um lead à esquerda para ver, editar status e complementar os dados.</p>
        </div>
      </aside>
    );
  }

  function setCampo(chave, valor) {
    setForm((prev) => ({ ...prev, [chave]: valor }));
    setMsg("");
    setErro("");
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    setMsg("");
    try {
      await atualizarLead(lead.id, {
        ...form,
        status: form.status || lead.status || "novo",
      });
      setMsg("Situação salva.");
    } catch (e) {
      setErro(e.message || "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(status) {
    setCampo("status", status);
    try {
      await atualizarStatus(lead.id, status);
      setMsg("Status atualizado.");
    } catch (e) {
      setErro(e.message || "Falha no status");
    }
  }

  return (
    <aside className="wa-situacao">
      <header className="wa-situacao-top">
        {onBack ? (
          <button type="button" className="wa-back" onClick={onBack} aria-label="Voltar">
            ←
          </button>
        ) : null}
        <div>
          <h3>Situação do lead</h3>
          <p>{lead.nome}</p>
        </div>
      </header>

      <div className="wa-situacao-body">
        <label className="wa-situacao-field">
          <span>Status</span>
          <select
            className={`st-${form.status || "novo"}`}
            value={form.status || "novo"}
            onChange={(e) => mudarStatus(e.target.value)}
          >
            {STATUS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="wa-situacao-field">
          <span>Nome</span>
          <input
            value={form.nome}
            onChange={(e) => setCampo("nome", e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="wa-situacao-field">
          <span>WhatsApp</span>
          <input
            value={form.whatsapp}
            onChange={(e) => setCampo("whatsapp", e.target.value)}
            inputMode="tel"
            autoComplete="off"
          />
        </label>

        <label className="wa-situacao-field">
          <span>Interesse</span>
          <select value={form.tipo} onChange={(e) => setCampo("tipo", e.target.value)}>
            {TIPOS_LEAD.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </label>

        <label className="wa-situacao-field">
          <span>Modelo</span>
          <input
            value={form.modelo}
            onChange={(e) => setCampo("modelo", e.target.value)}
            placeholder="Ex.: CG 160"
            autoComplete="off"
          />
        </label>

        <label className="wa-situacao-field">
          <span>CNH</span>
          <select value={form.cnh} onChange={(e) => setCampo("cnh", e.target.value)}>
            {CNH_OPCOES.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </label>

        <label className="wa-situacao-field">
          <span>Origem</span>
          <select value={form.origem} onChange={(e) => setCampo("origem", e.target.value)}>
            {ORIGENS_LEAD.map((op) => (
              <option key={op} value={op}>{ORIGEM_LABEL[op] || op}</option>
            ))}
          </select>
        </label>

        <label className="wa-situacao-field">
          <span>Observação / situação</span>
          <textarea
            rows={4}
            value={form.observacao}
            onChange={(e) => setCampo("observacao", e.target.value)}
            placeholder="Anote o andamento, próxima ação, valor, etc."
          />
        </label>

        <div className="wa-situacao-card">
          <span className="wa-situacao-k">Entrou em</span>
          <strong>{dataLead(lead.createdAt)}</strong>
        </div>

        {lead.respostas && Object.keys(lead.respostas).length > 0 ? (
          <div className="wa-situacao-card is-obs">
            <span className="wa-situacao-k">Respostas do formulário</span>
            <ul className="wa-situacao-list">
              {Object.entries(lead.respostas).map(([chave, valor]) => (
                <li key={chave}>
                  <em>{chave}</em>
                  <span>{String(valor)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button type="button" className="wa-situacao-save" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar situação"}
        </button>

        {msg ? <p className="wa-situacao-ok">{msg}</p> : null}
        {erro ? <p className="wa-situacao-err">{erro}</p> : null}
      </div>
    </aside>
  );
}
