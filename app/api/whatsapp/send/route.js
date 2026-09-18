import { NextResponse } from "next/server";
import { enviarTexto, evolutionConfigurado } from "../../../../lib/evolution";
import { telefoneE164 } from "../../../../lib/abordagens";
import { textoSeguro, validarId } from "../../../../lib/security";
import {
  adminPronto,
  confirmarDisparo,
  leadJaRecebeuMensagemNossa,
  marcarNumeroComoChamado,
  reservarDisparo,
  soltarDisparo,
} from "../../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/** Evita spam: mesmo número no máximo 1 envio a cada 90s (por instância serverless). */
const recentes = new Map();
const COOLDOWN_MS = 90 * 1000;

function idMensagemEvolution(data) {
  return String(data?.key?.id || data?.message?.key?.id || data?.id || "").slice(0, 120);
}

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

  const leadId = validarId(body?.leadId || "");
  const disparo = Boolean(body?.disparo);
  let reservado = false;

  if (disparo) {
    if (adminPronto()) {
      const reserva = await reservarDisparo({
        leadId,
        numero,
        conta: "honda",
        colecao: "leads",
        statusOk: "aguardando_resposta",
      });
      if (reserva.skipped) {
        return NextResponse.json(
          { ok: true, skipped: true, motivo: reserva.motivo || "já enviado" },
          { status: 200 },
        );
      }
      if (!reserva.ok) {
        return NextResponse.json({ error: reserva.error || "Não foi possível reservar o envio" }, { status: 503 });
      }
      reservado = true;
    } else if (leadId && (await leadJaRecebeuMensagemNossa(leadId, numero))) {
      return NextResponse.json(
        { ok: true, skipped: true, motivo: "já enviado" },
        { status: 200 },
      );
    }
  }

  const agora = Date.now();
  const ultimo = recentes.get(numero) || 0;
  if (agora - ultimo < COOLDOWN_MS) {
    if (reservado) {
      await soltarDisparo({ leadId, numero, conta: "honda", colecao: "leads" });
    }
    const espera = Math.ceil((COOLDOWN_MS - (agora - ultimo)) / 1000);
    return NextResponse.json(
      { error: `Aguarde ${espera}s antes de mandar de novo para este número.` },
      { status: 429 },
    );
  }

  recentes.set(numero, agora);

  let data;
  try {
    data = await enviarTexto(numero, texto);
  } catch (error) {
    recentes.delete(numero);
    if (reservado) {
      await soltarDisparo({ leadId, numero, conta: "honda", colecao: "leads" });
    }
    return NextResponse.json(
      { error: error.message || "Falha ao enviar" },
      { status: error.status || 500 },
    );
  }

  // WhatsApp já saiu: a trava fica, mesmo se gravar no CRM falhar.
  try {
    if (disparo && reservado) {
      await confirmarDisparo({
        leadId,
        numero,
        texto,
        messageId: idMensagemEvolution(data),
        conta: "honda",
        colecao: "leads",
        statusOk: "aguardando_resposta",
      });
    } else if (adminPronto()) {
      await marcarNumeroComoChamado(numero, "honda");
    }
  } catch {
    // não reenvia
  }

  return NextResponse.json({ ok: true, texto, numero, data, salvo: Boolean(disparo && reservado) });
}
