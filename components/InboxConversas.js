"use client";

import { useMemo, useState } from "react";
import ChatCrm from "./ChatCrm";
import { STATUS } from "../lib/leads";

function statusLabel(id) {
  return STATUS.find((item) => item.id === id)?.label || "Novo";
}

function iniciais(nome) {
  const partes = String(nome || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function previewLead(lead) {
  return lead.ultimaMensagem || statusLabel(lead.status) || "Toque para abrir a conversa";
}

function horaLista(valor) {
  const ms = valor?.toMillis?.() || 0;
  if (!ms) return "";
  const agora = Date.now();
  const d = new Date(ms);
  const mesmoDia = new Date(agora).toDateString() === d.toDateString();
  if (mesmoDia) {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

export default function InboxConversas({ leads, carregando, waConectado, onChamarNovos, disparando, progresso }) {
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState("");
  const [mobileChat, setMobileChat] = useState(false);

  const conversas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digits = termo.replace(/\D/g, "");
    let lista = [...leads];
    lista.sort((a, b) => {
      const ta = a.ultimaMensagemEm?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const tb = b.ultimaMensagemEm?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
    if (!termo) return lista;
    return lista.filter((lead) => {
      const fone = String(lead.whatsapp || "").replace(/\D/g, "");
      if (digits.length >= 4 && fone.includes(digits)) return true;
      return `${lead.nome} ${lead.whatsapp} ${lead.ultimaMensagem || ""} ${statusLabel(lead.status)}`
        .toLowerCase()
        .includes(termo);
    });
  }, [leads, busca]);

  const selecionado = leads.find((l) => l.id === selecionadoId) || null;

  function abrir(lead) {
    setSelecionadoId(lead.id);
    setMobileChat(true);
  }

  return (
    <div className={`wa-inbox ${mobileChat && selecionado ? "show-chat" : ""}`}>
      <aside className="wa-inbox-list">
        <div className="wa-inbox-head">
          <div className="wa-inbox-title">
            <h2>Conversas</h2>
            <p>{conversas.length} {conversas.length === 1 ? "contato" : "contatos"}</p>
          </div>
          <div className="wa-inbox-tools">
            <span className={`wa-dot ${waConectado ? "is-on" : ""}`} title={waConectado ? "Conectado" : "Offline"} />
            <button
              type="button"
              className="wa-btn-broadcast"
              onClick={onChamarNovos}
              disabled={disparando || !waConectado}
            >
              {disparando ? "Enviando…" : "Chamar novos"}
            </button>
          </div>
        </div>

        {progresso ? <p className="wa-progress">{progresso}</p> : null}

        <label className="wa-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome ou número"
            autoComplete="off"
          />
        </label>

        <div className="wa-thread-scroll">
          {carregando ? (
            <p className="wa-muted">Carregando conversas…</p>
          ) : conversas.length === 0 ? (
            <p className="wa-muted">Nenhuma conversa. Cadastre leads ou use Chamar novos.</p>
          ) : (
            conversas.map((lead) => (
              <button
                key={lead.id}
                type="button"
                className={`wa-thread ${selecionadoId === lead.id ? "is-active" : ""}`}
                onClick={() => abrir(lead)}
              >
                <span className="wa-avatar">{iniciais(lead.nome)}</span>
                <span className="wa-thread-body">
                  <span className="wa-thread-row">
                    <strong>{lead.nome}</strong>
                    <time>{horaLista(lead.ultimaMensagemEm || lead.createdAt)}</time>
                  </span>
                  <span className="wa-thread-row">
                    <em>{previewLead(lead)}</em>
                    {lead.naoLidas ? <span className="wa-unread">{lead.naoLidas}</span> : null}
                  </span>
                  <span className="wa-thread-sub">{lead.whatsapp} · {statusLabel(lead.status)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="wa-inbox-chat">
        <ChatCrm
          lead={selecionado}
          embutido
          onBack={selecionado ? () => setMobileChat(false) : undefined}
        />
      </div>
    </div>
  );
}
