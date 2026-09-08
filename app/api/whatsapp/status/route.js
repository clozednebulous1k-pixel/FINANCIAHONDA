import { NextResponse } from "next/server";
import {
  configurarWebhook,
  evolutionConfigurado,
  garantirInstancia,
  healthCheck,
  nomeInstancia,
  obterQr,
} from "../../../../lib/evolution";

export const dynamic = "force-dynamic";

const WEBHOOK_URL =
  process.env.EVOLUTION_WEBHOOK_URL ||
  "https://financiamentodaminhahonda.vercel.app/api/whatsapp/webhook";

export async function GET() {
  if (!evolutionConfigurado()) {
    return NextResponse.json(
      { ok: false, error: "Evolution não configurada (.env.local)" },
      { status: 503 },
    );
  }

  const online = await healthCheck();
  if (!online) {
    return NextResponse.json(
      {
        ok: false,
        online: false,
        instance: nomeInstancia(),
        error: "Evolution offline. Suba o Docker em /evolution",
      },
      { status: 503 },
    );
  }

  try {
    await garantirInstancia();
    const qr = await obterQr();
    let webhook = null;
    if (qr.connected) {
      try {
        webhook = await configurarWebhook(WEBHOOK_URL);
      } catch (error) {
        webhook = { error: error.message || "Falha ao setar webhook" };
      }
    }
    return NextResponse.json({
      ok: true,
      online: true,
      instance: nomeInstancia(),
      connected: Boolean(qr.connected),
      state: qr.state,
      qrcode: qr.qrcode,
      numero: "5511947539917",
      webhookUrl: WEBHOOK_URL,
      webhook,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, online: true, error: error.message || "Falha ao obter status" },
      { status: 500 },
    );
  }
}
