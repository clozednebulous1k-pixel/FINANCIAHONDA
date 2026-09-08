"use client";

import { useEffect, useRef, useState } from "react";
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
  const fimRef = useRef(null);

  useEffect(() => {
    if (!lead?.id) return undefined;
    setMensagens([]);
    setTexto("");
    setErro("");
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

  useEffect(() => {
    if (!lead?.whatsapp) return undefined;
    let ativo = true;

    async function syncEvolution() {
      setSincronizando(true);
      try {
        const res = await fetch(`/api/whatsapp/messages?whatsapp=${encodeURIComponent(lead.whatsapp)}`);
        const data = await res.json();
        if (!ativo || !res.ok) return;
        const externas = Array.isArray(data.messages) ? data.messages : [];
        const jaTem = new Set(mensagens.map((m) => `${m.fromMe ? 1 : 0}:${m.texto}`));
        for (const msg of externas.slice(-15)) {
          const chave = `${msg.fromMe ? 1 : 0}:${msg.texto}`;
          if (!msg.texto || jaTem.has(chave)) continue;
          if (!msg.fromMe) {
            await salvarMensagem(lead.id, {
              texto: msg.texto,
              fromMe: false,
              messageId: msg.id,
            });
            if (["novo", "aguardando_resposta", "chamou"].includes(lead.status || "novo")) {
              await atualizarStatus(lead.id, "em_atendimento");
            }
          }
        }
      } catch {
        // Evolution offline
      } finally {
        if (ativo) setSincronizando(false);
      }
    }

    syncEvolution();
    const timer = setInterval(syncEvolution, 12000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, lead?.whatsapp]);

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
      const data = await res.json();
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
          <span className="wa-chat-empty-icon">💬</span>
          <h2>Honda Conversas</h2>
          <p>Selecione um cliente à esquerda para ver e responder as mensagens.</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`wa-chat ${embutido ? "is-embed" : ""}`}>
      <header className="wa-chat-top">
        {onBack ? (
          <button type="button" className="wa-back" onClick={onBack} aria-label="Voltar">
            ←
          </button>
        ) : null}
        <div className="wa-avatar" aria-hidden="true">{iniciais(lead.nome)}</div>
        <div className="wa-chat-meta">
          <strong>{lead.nome}</strong>
          <span>
            {lead.whatsapp}
            {sincronizando ? " · sincronizando" : " · online"}
          </span>
        </div>
      </header>

      <div className="wa-chat-msgs">
        {mensagens.length === 0 ? (
          <p className="wa-chat-hint">Nenhuma mensagem ainda. Envie a primeira abordagem.</p>
        ) : (
          mensagens.map((msg) => (
            <div key={msg.id} className={`wa-bubble ${msg.fromMe ? "is-out" : "is-in"}`}>
              <p>{msg.texto}</p>
              <time>{horaMsg(msg.createdAt)}</time>
            </div>
          ))
        )}
        <div ref={fimRef} />
      </div>

      {erro ? <p className="erro wa-chat-erro">{erro}</p> : null}

      <form className="wa-chat-composer" onSubmit={enviar}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Mensagem"
          maxLength={4000}
          disabled={enviando}
          autoComplete="off"
        />
        <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar">
          {enviando ? "…" : "➤"}
        </button>
      </form>
    </section>
  );
}
