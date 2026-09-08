"use client";

import { useEffect, useRef, useState } from "react";
import { MENSAGENS_PRONTAS } from "../lib/abordagens";
import { atualizarStatus } from "../lib/leads";
import { marcarLidas, ouvirMensagens, salvarMensagem } from "../lib/mensagens";

function horaMsg(valor) {
  const ms = valor?.toMillis?.() || (typeof valor === "number" ? valor : 0);
  if (!ms) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
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

export default function ChatCrm({ lead, embutido = false, onBack }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [mostrarProntas, setMostrarProntas] = useState(false);
  const fimRef = useRef(null);
  const mensagensRef = useRef([]);

  useEffect(() => {
    mensagensRef.current = mensagens;
  }, [mensagens]);

  useEffect(() => {
    if (!lead?.id) return undefined;
    setMensagens([]);
    setTexto("");
    setErro("");
    setMostrarProntas(false);
    marcarLidas(lead.id).catch(() => {});
    return ouvirMensagens(
      lead.id,
      (lista) => setMensagens(lista),
      () => setErro("Não foi possível carregar o chat. Publique as regras novas do Firebase."),
    );
  }, [lead?.id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  /** Só busca respostas do cliente quando o usuário pede — nunca envia nada. */
  async function puxarRespostas() {
    if (!lead?.whatsapp || sincronizando || enviando) return;
    setSincronizando(true);
    setErro("");
    try {
      const res = await fetch(`/api/whatsapp/messages?whatsapp=${encodeURIComponent(lead.whatsapp)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao buscar");
      const externas = Array.isArray(data.messages) ? data.messages : [];
      const atuais = mensagensRef.current;
      const jaPorId = new Set(atuais.map((m) => m.messageId).filter(Boolean));
      const jaPorTexto = new Set(atuais.filter((m) => !m.fromMe).map((m) => m.texto));

      let novas = 0;
      for (const msg of externas.slice(-40)) {
        if (!msg.texto || msg.fromMe) continue;
        if (msg.id && jaPorId.has(msg.id)) continue;
        if (jaPorTexto.has(msg.texto)) continue;
        await salvarMensagem(lead.id, {
          texto: msg.texto,
          fromMe: false,
          messageId: msg.id || "",
        });
        jaPorTexto.add(msg.texto);
        if (msg.id) jaPorId.add(msg.id);
        novas += 1;
        if (["novo", "aguardando_resposta", "chamou"].includes(lead.status || "novo")) {
          await atualizarStatus(lead.id, "em_atendimento");
        }
      }
      if (!novas) setErro("");
    } catch (error) {
      setErro(error.message || "Não foi possível buscar respostas");
    } finally {
      setSincronizando(false);
    }
  }

  function usarPronta(item) {
    setTexto(item.texto(lead?.nome || ""));
    setMostrarProntas(false);
  }

  async function enviar(event) {
    event.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErro("");
    const body = texto.trim();
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: lead.whatsapp,
          nome: lead.nome,
          texto: body,
        }),
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(raw?.slice(0, 120) || "Falha ao enviar");
      }
      if (!res.ok) throw new Error(data.error || "Falha ao enviar");
      await salvarMensagem(lead.id, { texto: body, fromMe: true });
      if ((lead.status || "novo") === "novo") {
        await atualizarStatus(lead.id, "aguardando_resposta");
      } else if (lead.status !== "aguardando_resposta") {
        await atualizarStatus(lead.id, "em_atendimento");
      }
      setTexto("");
    } catch (error) {
      setErro(error.message || "Não foi possível enviar");
    } finally {
      setEnviando(false);
    }
  }

  if (!lead) {
    return (
      <div className="wa-chat-empty">
        <div className="wa-chat-empty-card">
          <svg className="wa-empty-logo" viewBox="0 0 24 24" width="56" height="56" aria-hidden="true">
            <path fill="#54656f" d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.544h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.033-1.646-2.064-1.646zm-4.892 8.99h-6.04v-1.67h6.04v1.67zm2.822-3.768h-8.862V6.727h8.862v1.67z"/>
          </svg>
          <h2>Honda WhatsApp</h2>
          <p>Envie e receba mensagens sem precisar manter o celular conectado na tela.</p>
          <p className="wa-empty-tip">Escolha uma conversa ao lado para começar.</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`wa-chat ${embutido ? "is-embed" : ""}`}>
      <header className="wa-chat-top">
        {onBack ? (
          <button type="button" className="wa-back" onClick={onBack} aria-label="Voltar">
            ‹
          </button>
        ) : null}
        <div className="wa-avatar wa-avatar-sm" aria-hidden="true">{iniciais(lead.nome)}</div>
        <div className="wa-chat-meta">
          <strong>{lead.nome}</strong>
          <span>{lead.whatsapp}</span>
        </div>
        <button
          type="button"
          className="wa-btn-sync"
          onClick={puxarRespostas}
          disabled={sincronizando || enviando}
          title="Buscar respostas do cliente"
        >
          {sincronizando ? "…" : "↻ Respostas"}
        </button>
      </header>

      <div className="wa-chat-msgs">
        {mensagens.length === 0 ? (
          <div className="wa-chat-hint">
            <p>Nada aqui ainda. Digite e envie, ou use ✦ mensagens prontas.</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div key={msg.id} className={`wa-bubble ${msg.fromMe ? "is-out" : "is-in"}`}>
              <div className="wa-bubble-inner">
                <p>{msg.texto}</p>
                <span className="wa-bubble-meta">
                  <time>{horaMsg(msg.createdAt)}</time>
                  {msg.fromMe ? <i className="wa-ticks" aria-hidden="true">✓✓</i> : null}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={fimRef} />
      </div>

      {erro ? <p className="erro wa-chat-erro">{erro}</p> : null}

      {mostrarProntas ? (
        <div className="wa-prontas">
          <div className="wa-prontas-head">
            <strong>Mensagens prontas</strong>
            <span>Matheus Ormond · Honda 0km</span>
          </div>
          <div className="wa-prontas-list">
            {MENSAGENS_PRONTAS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="wa-pronta"
                onClick={() => usarPronta(item)}
                disabled={enviando}
              >
                <em>{item.label}</em>
                <span>{item.texto(lead.nome).slice(0, 110)}…</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form className="wa-chat-composer" onSubmit={enviar}>
        <button
          type="button"
          className={`wa-btn-prontas ${mostrarProntas ? "is-on" : ""}`}
          onClick={() => setMostrarProntas((v) => !v)}
          disabled={enviando}
          title="Mensagens prontas"
          aria-label="Mensagens prontas"
        >
          ✦
        </button>
        <div className="wa-composer-box">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Mensagem"
            maxLength={4000}
            disabled={enviando}
            rows={Math.min(6, Math.max(1, texto.split("\n").length))}
            autoComplete="off"
          />
        </div>
        <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar">
          {enviando ? "…" : (
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
            </svg>
          )}
        </button>
      </form>
    </section>
  );
}
