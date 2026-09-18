import { NextResponse } from "next/server";
import {
  configurarWebhook,
  contaWhatsapp,
  evolutionConfigurado,
  garantirInstancia,
  healthCheck,
  obterQr,
} from "../../../../lib/evolution";

export const dynamic = "force-dynamic";

const WEBHOOK_URL =
  process.env.EVOLUTION_WEBHOOK_URL ||
  "https://financiamentodaminhahonda.vercel.app/api/whatsapp/webhook";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("conta");
  const conta = raw === "afiliados" || raw === "agencia" ? raw : "honda";
  const cfg = contaWhatsapp(conta);

  if (!evolutionConfigurado()) {
    return NextResponse.json(
      { ok: false, error: "Evolution não configurada (.env.local)", conta },
      { status: 503 },
    );
  }

  const online = await healthCheck();
  if (!online) {
    return NextResponse.json(
      {
        ok: false,
        online: false,
        conta,
        instance: cfg.instance,
        numero: cfg.numero,
        numeroFormatado: cfg.formato,
        titulo: cfg.titulo,
        error: "Evolution offline. Suba o Docker em /evolution",
      },
      { status: 503 },
    );
  }

  try {
    await garantirInstancia(conta);
    const qr = await obterQr(conta);
    let webhook = null;
    if (qr.connected && conta === "honda") {
      try {
        webhook = await configurarWebhook(WEBHOOK_URL, conta);
      } catch (error) {
        webhook = { error: error.message || "Falha ao setar webhook" };
      }
    }
    return NextResponse.json({
      ok: true,
      online: true,
      conta,
      instance: cfg.instance,
      connected: Boolean(qr.connected),
      state: qr.state,
      qrcode: qr.qrcode,
      numero: cfg.numero,
      numeroFormatado: cfg.formato,
      titulo: cfg.titulo,
      webhookUrl: conta === "honda" ? WEBHOOK_URL : null,
      webhook,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        online: true,
        conta,
        instance: cfg.instance,
        numero: cfg.numero,
        numeroFormatado: cfg.formato,
        titulo: cfg.titulo,
        error: error.message || "Falha ao obter status",
      },
      { status: 500 },
    );
  }
}
