import { NextResponse } from "next/server";
import {
  buscarMensagens,
  evolutionConfigurado,
  normalizarMensagensEvolution,
} from "../../../../lib/evolution";
import { telefoneE164 } from "../../../../lib/abordagens";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!evolutionConfigurado()) {
    return NextResponse.json({ error: "Evolution não configurada" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const numero = telefoneE164(searchParams.get("whatsapp") || "");
  if (!numero) {
    return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
  }

  try {
    const raw = await buscarMensagens(numero, Number(searchParams.get("limit") || 50));
    const messages = normalizarMensagensEvolution(raw);
    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao buscar mensagens", messages: [] },
      { status: error.status || 500 },
    );
  }
}
