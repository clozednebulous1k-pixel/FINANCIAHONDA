import { NextResponse } from "next/server";
import { enviarTexto, evolutionConfigurado } from "../../../../lib/evolution";
import { telefoneE164 } from "../../../../lib/abordagens";
import { textoSeguro } from "../../../../lib/security";

export const dynamic = "force-dynamic";

const recentes = new Map();
const COOLDOWN_MS = 80 * 1000;

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
  const texto = textoSeguro(body?.texto, 4000);
  if (!numero) return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
  if (!texto) return NextResponse.json({ error: "Texto vazio" }, { status: 400 });

  const agora = Date.now();
  const ultimo = recentes.get(numero) || 0;
  if (agora - ultimo < COOLDOWN_MS) {
    const espera = Math.ceil((COOLDOWN_MS - (agora - ultimo)) / 1000);
    return NextResponse.json(
      { error: `Aguarde ${espera}s antes de mandar de novo para este número.` },
      { status: 429 },
    );
  }

  try {
    const data = await enviarTexto(numero, texto, "agencia");
    recentes.set(numero, agora);
    return NextResponse.json({ ok: true, numero, data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao enviar" },
      { status: error.status || 500 },
    );
  }
}
