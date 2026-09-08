import { NextResponse } from "next/server";
import { extrairTextoMensagem } from "../../../../lib/evolution";

export const dynamic = "force-dynamic";

/**
 * Webhook da Evolution (local).
 * Por enquanto só confirma recebimento — o painel sincroniza as msgs via /api/whatsapp/messages.
 * Quando for pro VPS + Firebase Admin, aqui gravamos direto no Firestore.
 */
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

  const event = body?.event || body?.type || "";
  const data = body?.data || body;
  const texto = extrairTextoMensagem(data?.message || data);

  return NextResponse.json({
    ok: true,
    received: true,
    event,
    preview: String(texto || "").slice(0, 80),
  });
}

export function GET() {
  return NextResponse.json({ ok: true, service: "whatsapp-webhook" });
}
