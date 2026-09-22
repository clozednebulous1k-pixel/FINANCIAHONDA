import { NextResponse } from "next/server";
import { enviarTexto, evolutionConfigurado } from "../../../../lib/evolution";
import { telefoneE164 } from "../../../../lib/abordagens";
import { textoMensagem, validarId } from "../../../../lib/security";
import {
  adminPronto,
  confirmarDisparo,
  reservarDisparo,
  soltarDisparo,
} from "../../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const recentes = new Map();
const COOLDOWN_MS = 85 * 1000;

async function marcarSemWhatsapp(leadId, numero) {
  if (adminPronto()) {
    await confirmarDisparo({
      leadId,
      numero,
      conta: "agencia",
      colecao: "agencia_leads",
      statusOk: "chamou",
    }).catch(() => {});
  }
  return NextResponse.json(
    { ok: true, skipped: true, motivo: "sem WhatsApp" },
    { status: 200 },
  );
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
  const texto = textoMensagem(body?.texto, 4000);
  const leadId = validarId(body?.leadId || "");
  const continuar = Number(body?.sequencia) > 0;
  if (!numero) {
    return NextResponse.json(
      { ok: true, skipped: true, motivo: "telefone fixo ou inválido" },
      { status: 200 },
    );
  }
  if (!texto) return NextResponse.json({ error: "Texto vazio" }, { status: 400 });

  // Envia direto — sem pré-check (evita abort/timeout). Sem Zap = 400 e pula.
  const destino = numero;

  let reservado = false;
  if (!continuar && adminPronto()) {
    const reserva = await reservarDisparo({
      leadId,
      numero: destino,
      conta: "agencia",
      colecao: "agencia_leads",
      statusOk: "chamou",
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
  }

  const agora = Date.now();
  const ultimo = recentes.get(destino) || 0;
  if (!continuar && agora - ultimo < COOLDOWN_MS) {
    if (reservado) {
      await soltarDisparo({ leadId, numero: destino, conta: "agencia", colecao: "agencia_leads" });
    }
    const espera = Math.ceil((COOLDOWN_MS - (agora - ultimo)) / 1000);
    return NextResponse.json(
      { error: `Aguarde ${espera}s antes de mandar de novo para este número.` },
      { status: 429 },
    );
  }

  recentes.set(destino, agora);

  let data;
  try {
    data = await enviarTexto(destino, texto, "agencia");
  } catch (error) {
    recentes.delete(destino);
    const msg = String(error.message || "");
    const semWa =
      error.status === 400 ||
      /não está no WhatsApp|bad request|exists:\s*false|not.*whatsapp/i.test(msg);
    if (semWa) return marcarSemWhatsapp(leadId, destino);
    if (reservado) {
      await soltarDisparo({ leadId, numero: destino, conta: "agencia", colecao: "agencia_leads" });
    }
    const amigavel = /aborted|abort|demorou|timeout/i.test(msg)
      ? "WhatsApp demorou. O automático tenta de novo."
      : msg || "Falha ao enviar";
    return NextResponse.json({ error: amigavel }, { status: error.status || 500 });
  }

  try {
    if (reservado) {
      await confirmarDisparo({
        leadId,
        numero: destino,
        conta: "agencia",
        colecao: "agencia_leads",
        statusOk: "chamou",
      });
    }
  } catch {
    // WhatsApp já saiu — não solta a trava
  }

  return NextResponse.json({ ok: true, numero: destino, data, skipped: false });
}
