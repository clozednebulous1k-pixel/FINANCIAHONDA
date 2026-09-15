import { NextResponse } from "next/server";
import { evolutionConfigurado, listarGruposWhatsapp } from "../../../../lib/evolution";

export const dynamic = "force-dynamic";

function normalizarGrupos(raw) {
  const lista =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.data) && raw.data) ||
    (Array.isArray(raw?.groups) && raw.groups) ||
    (Array.isArray(raw?.response) && raw.response) ||
    [];
  return lista
    .map((item) => ({
      jid: String(item.id || item.jid || item.groupJid || "").trim(),
      nome: String(item.subject || item.name || item.topic || "Grupo").slice(0, 80),
      pessoas: Number(item.size || item.participants?.length || item.ownerSize || 0),
    }))
    .filter((item) => item.jid.includes("@g.us"));
}

export async function GET() {
  if (!evolutionConfigurado()) {
    return NextResponse.json({ error: "Evolution não configurada", grupos: [] }, { status: 503 });
  }
  try {
    const raw = await listarGruposWhatsapp();
    return NextResponse.json({ ok: true, grupos: normalizarGrupos(raw) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao listar grupos", grupos: [] },
      { status: error.status || 500 },
    );
  }
}
