import { NextResponse } from "next/server";
import { enviarTexto, evolutionConfigurado } from "../../../../lib/evolution";
import { montarAbordagem, telefoneE164 } from "../../../../lib/abordagens";
import { textoSeguro } from "../../../../lib/security";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!evolutionConfigurado()) {
    return NextResponse.json({ error: "Evolution não configurada" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const numero = telefoneE164(body?.whatsapp || body?.numero);
  if (!numero) {
    return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
  }

  const texto =
    textoSeguro(body?.texto, 4000) ||
    montarAbordagem(body?.nome || "", Number(body?.indice) || 0);

  if (!texto) {
    return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
  }

  try {
    const data = await enviarTexto(numero, texto);
    return NextResponse.json({ ok: true, texto, numero, data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao enviar" },
      { status: error.status || 500 },
    );
  }
}
