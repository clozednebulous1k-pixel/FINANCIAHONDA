"use client";

import { useEffect, useState } from "react";

export default function WhatsappStatus({ onConnected, conta = "honda" }) {
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch(`/api/whatsapp/status?conta=${encodeURIComponent(conta)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setInfo(data);
      onConnected?.(Boolean(data.connected));
      if (!res.ok) setErro(data.error || "Evolution offline");
    } catch {
      setErro("Não foi possível falar com a Evolution");
      setInfo(null);
      onConnected?.(false);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 8000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conta]);

  const conectado = Boolean(info?.connected);
  const qr = info?.qrcode;
  const titulo = info?.titulo || (conta === "afiliados" ? "WhatsApp Afiliados" : conta === "agencia" ? "WhatsApp Agência" : "WhatsApp Business");
  const numero = info?.numeroFormatado || (conta === "afiliados" ? "11 95202-5568" : conta === "agencia" ? "11 92603-1750" : "11 94753-9917");

  return (
    <section className="painel-card wa-status-card">
      <div className="wa-status-row">
        <div>
          <h2>{titulo}</h2>
          <p className="muted">
            Número: <strong>{numero}</strong>
            {" · "}
            {carregando && !info
              ? "Checando..."
              : conectado
                ? "Conectado"
                : info?.online
                  ? "Aguardando QR"
                  : "Docker offline"}
          </p>
          {erro ? <p className="erro">{erro}</p> : null}
        </div>
        <button type="button" onClick={carregar} disabled={carregando}>
          Atualizar
        </button>
      </div>

      {!conectado && qr ? (
        <div className="wa-qr-box">
          <p>
            {conta === "afiliados"
              ? "No celular 11 95202-5568: WhatsApp → Aparelhos conectados → Conectar aparelho"
              : conta === "agencia"
                ? "No celular 11 92603-1750: WhatsApp → Aparelhos conectados → Conectar aparelho"
                : "No celular: WhatsApp Business → Aparelhos conectados → Conectar aparelho"}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code WhatsApp"
            width={260}
            height={260}
          />
        </div>
      ) : null}

      {conectado ? (
        <p className="wa-ok">
          {conta === "afiliados"
            ? "Pronto. Os disparos de afiliado saem deste número."
            : conta === "agencia"
              ? "Pronto. Os disparos para empresas saem deste número."
              : "Pronto. Pode chamar os leads e usar o chat do CRM."}
        </p>
      ) : null}
    </section>
  );
}
