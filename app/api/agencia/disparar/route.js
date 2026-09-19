import { NextResponse } from "next/server";
import { enviarTexto, evolutionConfigurado, numeroTemWhatsapp } from "../../../../lib/evolution";
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
  if (!numero) {
    return NextResponse.json(
      { ok: true, skipped: true, motivo: "telefone fixo ou inválido" },
      { status: 200 },
    );
  }
  if (!texto) return NextResponse.json({ error: "Texto vazio" }, { status: 400 });

  // Só dispara se o número realmente tem WhatsApp
  let destino = numero;
  try {
    const check = await numeroTemWhatsapp(numero, "agencia");
    if (!check.exists) {
      return marcarSemWhatsapp(leadId, numero);
    }
    if (check.numero) destino = check.numero;
  } catch (error) {
    const semWa =
      error.status === 400 ||
      /não está no WhatsApp|bad request|exists:\s*false|not.*whatsapp/i.test(String(error.message || ""));
    if (semWa) return marcarSemWhatsapp(leadId, numero);
    return NextResponse.json(
      { error: error.message || "Falha ao verificar WhatsApp" },
      { status: error.status || 500 },
    );
  }

  let reservado = false;
  if (adminPronto()) {
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
  if (agora - ultimo < COOLDOWN_MS) {
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
    const semWa =
      error.status === 400 ||
      /não está no WhatsApp|bad request|exists:\s*false|not.*whatsapp/i.test(String(error.message || ""));
    if (semWa) return marcarSemWhatsapp(leadId, destino);
    if (reservado) {
      await soltarDisparo({ leadId, numero: destino, conta: "agencia", colecao: "agencia_leads" });
    }
    return NextResponse.json(
      { error: error.message || "Falha ao enviar" },
      { status: error.status || 500 },
    );
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
