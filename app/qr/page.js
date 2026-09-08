"use client";

import { useEffect, useState } from "react";

export default function QrPage() {
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    setErro("");
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const data = await res.json();
      setInfo(data);
      if (!res.ok) setErro(data.error || "Falha ao carregar QR");
    } catch {
      setErro("Evolution ou Next offline");
    }
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 5000);
    return () => clearInterval(t);
  }, []);

  const qr = info?.qrcode;
  const conectado = Boolean(info?.connected);

  return (
    <main style={{ maxWidth: 480, margin: "40px auto", padding: 20, fontFamily: "system-ui" }}>
      <h1 style={{ marginTop: 0 }}>QR WhatsApp Business</h1>
      <p>Número: <strong>11 94753-9917</strong></p>
      <p>
        Status:{" "}
        <strong>
          {conectado ? "Conectado" : info?.online ? "Escaneie o QR" : "Aguardando Evolution..."}
        </strong>
      </p>
      {erro ? <p style={{ color: "#c8102e" }}>{erro}</p> : null}
      {!conectado && qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
          alt="QR Code"
          width={280}
          height={280}
          style={{ border: "1px solid #ddd", borderRadius: 12 }}
        />
      ) : null}
      {conectado ? <p style={{ color: "#168c3d", fontWeight: 700 }}>WhatsApp conectado com sucesso.</p> : null}
      <p style={{ color: "#666", fontSize: 14 }}>
        No celular: WhatsApp Business → Aparelhos conectados → Conectar aparelho
      </p>
      <button type="button" onClick={carregar} style={{ height: 40, padding: "0 14px", cursor: "pointer" }}>
        Atualizar QR
      </button>
    </main>
  );
}
