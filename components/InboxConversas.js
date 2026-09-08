"use client";

import { useMemo, useState } from "react";
import ChatCrm from "./ChatCrm";
import SituacaoCliente from "./SituacaoCliente";
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

export default function InboxConversas({
  leads,
  carregando,
  waConectado,
  onChamarNovos,
  onPararChamada,
  disparando,
  progresso,
  qtdNovos = 0,
}) {
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState("");
  const [mobilePane, setMobilePane] = useState("lista");

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
    setMobilePane("chat");
  }

  return (
    <div className={`wa-inbox wa-inbox-3 ${mobilePane !== "lista" ? `show-${mobilePane}` : ""}`}>
      <aside className="wa-inbox-list">
        <div className="wa-inbox-head">
          <div className="wa-inbox-title">
            <h2>Leads</h2>
            <p>
              {conversas.length} {conversas.length === 1 ? "lead" : "leads"}
              {qtdNovos > 0 ? ` · ${qtdNovos} sem chamar` : ""}
            </p>
          </div>
          <div className="wa-inbox-tools">
            <span className={`wa-dot ${waConectado ? "is-on" : ""}`} title={waConectado ? "Conectado" : "Offline"} />
          </div>
        </div>

        <div className="wa-broadcast-bar">
          {disparando ? (
            <button type="button" className="wa-btn-broadcast is-stop" onClick={onPararChamada}>
              Parar chamadas
            </button>
          ) : (
            <button
              type="button"
              className="wa-btn-broadcast"
              onClick={onChamarNovos}
              disabled={!waConectado || qtdNovos === 0}
              title={
                !waConectado
                  ? "Conecte o WhatsApp em Conexão"
                  : qtdNovos === 0
                    ? "Nenhum lead Novo"
                    : "Chama só quem está com status Novo, com intervalo anti-ban"
              }
            >
              Chamar quem não foi chamado ({qtdNovos})
            </button>
          )}
          <small>Intervalo anti-ban ≈ 45–85s entre cada um</small>
        </div>

        {progresso ? <p className="wa-progress">{progresso}</p> : null}

        <label className="wa-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar lead"
            autoComplete="off"
          />
        </label>

        <div className="wa-thread-scroll">
          {carregando ? (
            <p className="wa-muted">Carregando leads…</p>
          ) : conversas.length === 0 ? (
            <p className="wa-muted">Nenhum lead. Cadastre na aba Leads ou importe.</p>
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
          onBack={selecionado ? () => setMobilePane("lista") : undefined}
        />
        {selecionado ? (
          <button
            type="button"
            className="wa-open-situacao"
            onClick={() => setMobilePane("situacao")}
          >
            Situação
          </button>
        ) : null}
      </div>

      <SituacaoCliente
        lead={selecionado}
        onBack={selecionado ? () => setMobilePane("chat") : undefined}
      />
    </div>
  );
}
