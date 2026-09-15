import { NextResponse } from "next/server";
import { buscarProdutosAfiliados } from "../../../../lib/produtosAfiliados";
import { textoSeguro } from "../../../../lib/security";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const termo = textoSeguro(searchParams.get("q") || "", 80);
  const origem = textoSeguro(searchParams.get("origem") || "todos", 20);
  const soPromo = searchParams.get("promo") !== "0";
  const meliTag = textoSeguro(searchParams.get("meli") || "", 80);
  const shopeeTag = textoSeguro(searchParams.get("shopee") || "", 80);

  try {
    const data = await buscarProdutosAfiliados({
      termo,
      origem: ["mercadolivre", "shopee", "todos"].includes(origem) ? origem : "todos",
      soPromo,
      meliTag,
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
