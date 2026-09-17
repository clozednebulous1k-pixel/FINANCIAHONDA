import { NextResponse } from "next/server";
import { enviarImagemDestino, enviarTextoDestino, evolutionConfigurado } from "../../../../lib/evolution";
import { montarTextoOferta } from "../../../../lib/textoAchadinho";
import { textoSeguro, validarWhatsapp } from "../../../../lib/security";

export const dynamic = "force-dynamic";

function destinosDoGrupo(grupo) {
  if (grupo?.tipo === "lista") {
    return (Array.isArray(grupo.pessoas) ? grupo.pessoas : [])
      .map((n) => validarWhatsapp(n))
      .filter(Boolean)
      .slice(0, 30);
  }
  const jid = String(grupo?.jid || "").trim();
  return jid.includes("@g.us") ? [jid] : [];
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

  const destinos = destinosDoGrupo(body?.grupo);
  const produto = Array.isArray(body?.produtos) ? body.produtos[0] : body?.produto;
  const extra = textoSeguro(body?.texto, 120);

  if (!destinos.length) {
    return NextResponse.json({ error: "Grupo sem destino válido" }, { status: 400 });
  }
  if (!produto?.link && !extra) {
    return NextResponse.json({ error: "Selecione um achadinho ou escreva um texto" }, { status: 400 });
  }

  const texto = produto?.link ? montarTextoOferta(produto, extra) : extra;
  const imagem = String(produto?.imagem || "");

  let ok = 0;
  let falhas = 0;
  const erros = [];

  for (const destino of destinos) {
    try {
      if (imagem) {
        try {
          await enviarImagemDestino(destino, imagem, texto, "afiliados");
        } catch {
          await enviarTextoDestino(destino, texto, "afiliados");
        }
      } else {
        await enviarTextoDestino(destino, texto, "afiliados");
      }
      ok += 1;
    } catch (error) {
      falhas += 1;
      erros.push(error.message || "falha");
    }
  }

  return NextResponse.json({ ok: true, enviados: ok, falhas, erros: erros.slice(0, 5) });
}
