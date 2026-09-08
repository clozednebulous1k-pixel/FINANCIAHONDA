import { NextResponse } from "next/server";
import { evolutionConfigurado, garantirInstancia, healthCheck, nomeInstancia, obterQr } from "../../../../lib/evolution";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({
      ok: true,
      online: true,
      instance: nomeInstancia(),
      connected: Boolean(qr.connected),
      state: qr.state,
      qrcode: qr.qrcode,
      numero: "5511947539917",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, online: true, error: error.message || "Falha ao obter status" },
      { status: 500 },
    );
  }
}
