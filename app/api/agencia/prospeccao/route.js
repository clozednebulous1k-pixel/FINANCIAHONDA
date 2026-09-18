import { NextResponse } from "next/server";
import { vasculharEmpresas, SEGMENTOS } from "../../../../lib/prospeccao";
import { textoSeguro } from "../../../../lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true, segmentos: SEGMENTOS });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cidade = textoSeguro(body?.cidade, 80) || "São Paulo";
  const segmento = SEGMENTOS.some((s) => s.id === body?.segmento) ? body.segmento : "todos";
  const pagina = Math.max(0, Number(body?.pagina) || 0);
  const excluir = Array.isArray(body?.excluir) ? body.excluir.slice(0, 80) : [];

  try {
    const resultado = await vasculharEmpresas({ cidade, segmento, limite: 10, pagina, excluir });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Não foi possível vasculhar o mapa" },
      { status: 502 },
    );
  }
}
