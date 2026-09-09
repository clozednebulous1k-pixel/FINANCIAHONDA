import { NextResponse } from "next/server";
import { enviarTexto, evolutionConfigurado } from "../../../../lib/evolution";
import { telefoneE164 } from "../../../../lib/abordagens";
import { textoSeguro, validarId } from "../../../../lib/security";
import { leadJaRecebeuMensagemNossa } from "../../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/** Evita spam: mesmo número no máximo 1 envio a cada 90s (por instância serverless). */
const recentes = new Map();
const COOLDOWN_MS = 90 * 1000;

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

  // NUNCA inventa texto sozinho — só envia o que você escreveu/escolheu
  const texto = textoSeguro(body?.texto, 4000);
  if (!texto) {
    return NextResponse.json({ error: "Texto vazio — nada foi enviado" }, { status: 400 });
  }

  if (body?.disparo) {
    const leadId = validarId(body?.leadId || "");
    if (leadId && (await leadJaRecebeuMensagemNossa(leadId))) {
      return NextResponse.json(
        { ok: true, skipped: true, motivo: "já enviado" },
        { status: 200 },
      );
    }
  }

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
    const data = await enviarTexto(numero, texto);
    recentes.set(numero, agora);
    return NextResponse.json({ ok: true, texto, numero, data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao enviar" },
      { status: error.status || 500 },
    );
  }
}
