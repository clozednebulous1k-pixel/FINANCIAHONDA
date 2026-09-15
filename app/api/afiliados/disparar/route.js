import { NextResponse } from "next/server";
import { enviarImagemDestino, enviarTextoDestino, evolutionConfigurado } from "../../../../lib/evolution";
import { montarTextoOferta } from "../../../../lib/produtosAfiliados";
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
  const produtos = Array.isArray(body?.produtos) ? body.produtos.slice(0, 5) : [];
  const extra = textoSeguro(body?.texto, 800);

  if (!destinos.length) {
    return NextResponse.json({ error: "Grupo sem destino válido" }, { status: 400 });
  }
  if (!produtos.length && !extra) {
    return NextResponse.json({ error: "Selecione produtos ou escreva um texto" }, { status: 400 });
  }

  const mensagens = produtos.length
    ? produtos.map((p) => ({
        texto: extra ? `${extra}\n\n${montarTextoOferta(p)}` : montarTextoOferta(p),
        imagem: String(p?.imagem || ""),
      }))
    : [{ texto: extra, imagem: "" }];

  let ok = 0;
  let falhas = 0;
  const erros = [];

  for (const destino of destinos) {
    for (const msg of mensagens) {
      try {
        if (msg.imagem) {
          try {
            await enviarImagemDestino(destino, msg.imagem, msg.texto);
          } catch {
            await enviarTextoDestino(destino, msg.texto);
          }
        } else {
          await enviarTextoDestino(destino, msg.texto);
        }
        ok += 1;
      } catch (error) {
        falhas += 1;
        erros.push(error.message || "falha");
      }
    }
  }

  return NextResponse.json({ ok: true, enviados: ok, falhas, erros: erros.slice(0, 5) });
}
