import { NextResponse } from "next/server";
import { vasculharEmpresas, SEGMENTOS, nivelProspeccao } from "../../../../lib/prospeccao";
import { filtrarEmpresasComWhatsapp, evolutionRemota } from "../../../../lib/evolution";
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
      try {
        const extra = await listarExclusoesAgencia();
        excluir = [...excluir, ...extra.fones];
        excluirNomes = extra.nomes;
        excluirOsm = extra.osm;
      } catch {
        // segue sem exclusões extras
      }
    }

    const bruto = await vasculharEmpresas({
      cidade,
      segmento,
      limite: 20,
      excluir,
      excluirNomes,
      excluirOsm,
    });

    let empresas = Array.isArray(bruto.empresas) ? bruto.empresas : [];
    let filtrado = false;

    // Só checa Zap na Evolution se a URL for pública (não localhost na Vercel)
    if (evolutionRemota() && empresas.length) {
      try {
        empresas = await filtrarEmpresasComWhatsapp(empresas.slice(0, 20), "agencia");
        filtrado = true;
      } catch {
        empresas = empresas.filter((e) => e.whatsappOk).slice(0, 10);
      }
    } else {
      empresas = empresas.filter((e) => e.whatsappOk).slice(0, 10);
    }

    const lote = empresas.slice(0, 10);
    return NextResponse.json({
      ok: true,
      cidade: bruto.cidade,
      segmento: bruto.segmento,
      nivel: bruto.nivel,
      fonte: bruto.fonte || "osm",
      empresas: lote,
      total: lote.length,
      comWhatsapp: lote.length,
      candidatosMapa: bruto.total,
      filtradoWhatsapp: filtrado,
    });
  } catch (error) {
    const msg = String(error?.message || "Não foi possível vasculhar o mapa").slice(0, 240);
    return NextResponse.json({ error: msg, ok: false, empresas: [] }, { status: 502 });
  }
}
