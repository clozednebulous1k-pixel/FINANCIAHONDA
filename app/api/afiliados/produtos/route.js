import { NextResponse } from "next/server";
import { buscarProdutosAfiliados, importarProdutoPorUrl } from "../../../../lib/produtosAfiliados";
import { textoSeguro } from "../../../../lib/security";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const termo = textoSeguro(searchParams.get("q") || "", 80);
  const origem = textoSeguro(searchParams.get("origem") || "todos", 20);
  const soPromo = searchParams.get("promo") !== "0";
  const meliTag = textoSeguro(searchParams.get("meli") || "", 80);
  const meliWord = textoSeguro(searchParams.get("meliWord") || "", 80);
  const shopeeTag = textoSeguro(searchParams.get("shopee") || "", 80);

  try {
    const data = await buscarProdutosAfiliados({
      termo,
      origem: ["mercadolivre", "shopee", "todos"].includes(origem) ? origem : "todos",
      soPromo,
      meliTag,
      meliWord,
      shopeeTag,
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao buscar ofertas", produtos: [], avisos: [] },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  try {
    const produto = await importarProdutoPorUrl(body?.url, {
      meliTag: textoSeguro(body?.meli || "", 80),
      meliWord: textoSeguro(body?.meliWord || "", 80),
      shopeeTag: textoSeguro(body?.shopee || "", 80),
    });
    return NextResponse.json({ ok: true, produto });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Não foi possível ler o link",
        meli: error.meli || null,
      },
      { status: 400 },
    );
  }
}
