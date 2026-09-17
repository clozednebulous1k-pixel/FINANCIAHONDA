import { NextResponse } from "next/server";
import { adminPronto } from "../../../../lib/firebaseAdmin";
import { rodarTickRoboAfiliados } from "../../../../lib/roboAfiliados";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronAutorizado(request) {
  const secret = process.env.CRON_SECRET || process.env.EVOLUTION_WEBHOOK_SECRET || "";
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const q = url.searchParams.get("secret") || "";
  return auth === `Bearer ${secret}` || q === secret;
}

export async function GET(request) {
  if (!cronAutorizado(request)) {
    return NextResponse.json(
      { ok: false, admin: adminPronto(), error: "Cron sem autorização" },
      { status: 401 },
    );
  }
  try {
    const resultado = await rodarTickRoboAfiliados();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Falha no robô automático" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const resultado = await rodarTickRoboAfiliados();
    return NextResponse.json({ ok: true, admin: adminPronto(), ...resultado });
  } catch (error) {
    return NextResponse.json(
      { ok: false, admin: adminPronto(), error: error.message || "Falha no robô automático" },
      { status: 500 },
    );
  }
}
