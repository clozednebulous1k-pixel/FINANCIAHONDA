import { NextResponse } from "next/server";
import { vasculharEmpresas, SEGMENTOS, nivelProspeccao } from "../../../../lib/prospeccao";
import { textoSeguro } from "../../../../lib/security";
import {
  adminPronto,
  listarExclusoesAgencia,
} from "../../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true, segmentos: SEGMENTOS, nivel: nivelProspeccao() });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cidade = textoSeguro(body?.cidade, 80) || "São Paulo";
  const segmento = SEGMENTOS.some((s) => s.id === body?.segmento) ? body.segmento : "foco";
  let excluir = Array.isArray(body?.excluir) ? body.excluir.slice(0, 200) : [];
  let excluirNomes = [];
  let excluirOsm = [];

  try {
    if (adminPronto()) {
      const extra = await listarExclusoesAgencia();
      excluir = [...excluir, ...extra.fones];
      excluirNomes = extra.nomes;
      excluirOsm = extra.osm;
    }
    const resultado = await vasculharEmpresas({
      cidade: cidade || "São Paulo",
      segmento,
      limite: 10,
      excluir,
      excluirNomes,
      excluirOsm,
    });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Não foi possível vasculhar o mapa" },
      { status: 502 },
    );
  }
}
