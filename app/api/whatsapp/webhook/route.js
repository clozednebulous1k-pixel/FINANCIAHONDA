import { NextResponse } from "next/server";
import {
  extrairTextoMensagem,
  numeroDoRemoteJid,
} from "../../../../lib/evolution";
import {
  acharLeadPorWhatsapp,
  adminPronto,
  gravarMensagemInbound,
} from "../../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function pegarMensagensDoWebhook(body) {
  const data = body?.data || body || {};
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.messages)) return data.messages;
  if (data.key || data.message) return [data];
  return [];
}

export async function POST(request) {
  const secret = request.headers.get("x-webhook-secret");
  const esperado = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (esperado && secret && secret !== esperado) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const event = String(body?.event || body?.type || "").toLowerCase();
  const msgs = pegarMensagensDoWebhook(body);
  let salvas = 0;
  let ignoradas = 0;

  if (adminPronto() && (event.includes("messages") || msgs.length)) {
    for (const item of msgs) {
      const key = item.key || {};
      const fromMe = Boolean(key.fromMe);
      if (fromMe) {
        ignoradas += 1;
        continue;
      }
      const texto = extrairTextoMensagem(item.message || item);
      if (!texto) {
        ignoradas += 1;
        continue;
      }
      const remote =
        key.remoteJid ||
        item.remoteJid ||
        item.sender ||
        "";
      const numero = numeroDoRemoteJid(remote);
      const lead = await acharLeadPorWhatsapp(numero);
      if (!lead) {
        ignoradas += 1;
        continue;
      }
      const ok = await gravarMensagemInbound({
        leadId: lead.id,
        texto,
        fromMe: false,
        messageId: key.id || item.id || "",
        messageTimestamp: item.messageTimestamp || item.timestamp || 0,
      });
      if (ok) salvas += 1;
      else ignoradas += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    received: true,
    event,
    admin: adminPronto(),
    salvas,
    ignoradas,
    preview: String(extrairTextoMensagem(msgs[0]?.message || msgs[0] || "") || "").slice(0, 80),
  });
}

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "whatsapp-webhook",
    admin: adminPronto(),
  });
}
