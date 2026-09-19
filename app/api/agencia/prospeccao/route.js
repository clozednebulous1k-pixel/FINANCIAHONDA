import { NextResponse } from "next/server";
import { vasculharEmpresas, SEGMENTOS, nivelProspeccao } from "../../../../lib/prospeccao";
import { filtrarEmpresasComWhatsapp, evolutionConfigurado } from "../../../../lib/evolution";
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
  const segmento = SEGMENTOS.some((s) => s.id === body?.segmento) ? body.segmento : "todos";
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
    // Pega vários candidatos no mapa e só devolve quem tem WhatsApp de verdade
    const bruto = await vasculharEmpresas({
      cidade,
      segmento,
      limite: 40,
      excluir,
      excluirNomes,
      excluirOsm,
    });

    let empresas = Array.isArray(bruto.empresas) ? bruto.empresas : [];
    let filtrado = false;
    if (evolutionConfigurado() && empresas.length) {
      empresas = await filtrarEmpresasComWhatsapp(empresas, "agencia");
      filtrado = true;
    } else {
      // Sem Evolution: não libera lote (evita disparar pra quem não tem Zap)
      empresas = [];
    }

    const lote = empresas.slice(0, 10);
    return NextResponse.json({
      ok: true,
      ...bruto,
      empresas: lote,
      total: lote.length,
      comWhatsapp: lote.length,
      candidatosMapa: bruto.total,
      filtradoWhatsapp: filtrado,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Não foi possível vasculhar o mapa" },
      { status: 502 },
    );
  }
}
