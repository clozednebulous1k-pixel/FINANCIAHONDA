"use client";

import { useEffect, useState } from "react";

export default function WhatsappStatus({ onConnected }) {
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const data = await res.json();
      setInfo(data);
      if (data.connected) onConnected?.(true);
      if (!res.ok) setErro(data.error || "Evolution offline");
    } catch {
      setErro("Não foi possível falar com a Evolution");
      setInfo(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 8000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conectado = Boolean(info?.connected);
  const qr = info?.qrcode;

  return (
    <section className="painel-card wa-status-card">
      <div className="wa-status-row">
        <div>
          <h2>WhatsApp Business</h2>
          <p className="muted">
            Número: <strong>11 94753-9917</strong>
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
          <p>No celular: WhatsApp Business → Aparelhos conectados → Conectar aparelho</p>
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
        <p className="wa-ok">Pronto. Pode chamar os leads e usar o chat do CRM.</p>
      ) : null}
    </section>
  );
}
