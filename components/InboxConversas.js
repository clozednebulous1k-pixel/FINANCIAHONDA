"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatCrm from "./ChatCrm";
import SituacaoCliente from "./SituacaoCliente";
import { STATUS } from "../lib/leads";
import { apagarConversa } from "../lib/mensagens";

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
  onLimparDuplicadas,
  limpandoDup,
  disparando,
  progresso,
  qtdNovos = 0,
}) {
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState("");
  const [mobilePane, setMobilePane] = useState("lista");
  const [menuCtx, setMenuCtx] = useState(null);
  const [apagandoId, setApagandoId] = useState("");
  const holdRef = useRef({ timer: 0, fired: false, x: 0, y: 0 });

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

  useEffect(() => {
    if (!menuCtx) return undefined;
    function fechar() {
      setMenuCtx(null);
    }
    function tecla(e) {
      if (e.key === "Escape") fechar();
    }
    const timer = window.setTimeout(() => {
      window.addEventListener("click", fechar);
      window.addEventListener("scroll", fechar, true);
    }, 120);
    window.addEventListener("keydown", tecla);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", fechar);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("keydown", tecla);
    };
  }, [menuCtx]);

  function abrir(lead) {
    if (holdRef.current.fired) {
      holdRef.current.fired = false;
      return;
    }
    setMenuCtx(null);
    setSelecionadoId(lead.id);
    setMobilePane("chat");
  }

  function posicaoMenu(x, y) {
    const pad = 8;
    const w = 220;
    const h = 88;
    let left = x;
    let top = y;
    if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad;
    if (top + h > window.innerHeight - pad) top = window.innerHeight - h - pad;
    return { x: Math.max(pad, left), y: Math.max(pad, top) };
  }

  function abrirMenu(event, lead) {
    event.preventDefault();
    event.stopPropagation();
    const { x, y } = posicaoMenu(event.clientX, event.clientY);
    setMenuCtx({ x, y, lead });
  }

  function abrirMenuEm(lead, x, y) {
    const pos = posicaoMenu(x, y);
    setMenuCtx({ x: pos.x, y: pos.y, lead });
  }

  function iniciarHold(event, lead) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    holdRef.current.fired = false;
    holdRef.current.x = event.clientX;
    holdRef.current.y = event.clientY;
    const x = event.clientX;
    const y = event.clientY;
    clearTimeout(holdRef.current.timer);
    holdRef.current.timer = window.setTimeout(() => {
      holdRef.current.fired = true;
      abrirMenuEm(lead, x, y);
    }, 480);
  }

  function moverHold(event) {
    if (!holdRef.current.timer) return;
    const dx = event.clientX - holdRef.current.x;
    const dy = event.clientY - holdRef.current.y;
    if (dx * dx + dy * dy > 64) soltarHold();
  }

  function soltarHold() {
    clearTimeout(holdRef.current.timer);
  }

  async function apagarConversaPainel(lead) {
    const alvo = lead;
    setMenuCtx(null);
    if (!alvo?.id || apagandoId) return;
    if (
      !window.confirm(
        `Apagar a conversa com ${alvo.nome} no painel?\n\nRemove as mensagens do banco (Firebase).\nNão apaga no WhatsApp nem remove o lead.`,
      )
    ) {
      return;
    }
    setApagandoId(alvo.id);
    try {
      const n = await apagarConversa(alvo.id);
      if (selecionadoId === alvo.id) {
        setSelecionadoId("");
        setMobilePane("lista");
      }
      window.alert(
        n > 0
          ? `Conversa apagada (${n} mensagem${n === 1 ? "" : "ens"} removida${n === 1 ? "" : "s"} do painel).`
          : "Conversa já estava vazia no painel.",
      );
    } catch (error) {
      const msg = String(error?.code || error?.message || error || "");
      window.alert(
        msg.includes("permission") || msg.includes("Permission")
          ? "Firebase bloqueou (permissão). Confirme que está logado com matheus.honda@gmail.com e publique as regras do firestore.rules."
          : `Não foi possível apagar: ${error.message || msg}`,
      );
    } finally {
      setApagandoId("");
    }
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
          <button
            type="button"
            className="wa-btn-broadcast is-clean"
            onClick={onLimparDuplicadas}
            disabled={limpandoDup || disparando}
          >
            {limpandoDup ? "Limpando…" : "Apagar msgs duplicadas"}
          </button>
          <small>Botão direito na conversa → Apagar · anti-ban ≈ 45–85s · segue sozinho até acabar</small>
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
              <div
                key={lead.id}
                role="button"
                tabIndex={0}
                className={`wa-thread ${selecionadoId === lead.id ? "is-active" : ""} ${apagandoId === lead.id ? "is-busy" : ""}`}
                onClick={() => abrir(lead)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrir(lead);
                  }
                }}
                onContextMenu={(e) => abrirMenu(e, lead)}
                onPointerDown={(e) => iniciarHold(e, lead)}
                onPointerMove={moverHold}
                onPointerUp={soltarHold}
                onPointerCancel={soltarHold}
                onPointerLeave={soltarHold}
                title="Toque para abrir · segure ou ⋯ para apagar"
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
                <button
                  type="button"
                  className="wa-thread-more"
                  aria-label={`Opções de ${lead.nome}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soltarHold();
                    const box = e.currentTarget.getBoundingClientRect();
                    abrirMenuEm(lead, box.left, box.bottom);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  ⋯
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="wa-inbox-chat">
        <ChatCrm
          lead={selecionado}
          embutido
          onBack={selecionado ? () => setMobilePane("lista") : undefined}
          onSituacao={selecionado ? () => setMobilePane("situacao") : undefined}
        />
      </div>

      <SituacaoCliente
        lead={selecionado}
        onBack={selecionado ? () => setMobilePane("chat") : undefined}
      />

      {menuCtx ? (
        <div
          className="wa-ctx-menu"
          style={{ left: menuCtx.x, top: menuCtx.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <p className="wa-ctx-label">{menuCtx.lead.nome}</p>
          <button
            type="button"
            className="wa-ctx-item is-danger"
            role="menuitem"
            disabled={Boolean(apagandoId)}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              apagarConversaPainel(menuCtx.lead);
            }}
          >
            Apagar conversa do painel
          </button>
        </div>
      ) : null}
    </div>
  );
}
