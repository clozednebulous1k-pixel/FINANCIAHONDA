import { textoSeguro } from "./security";

export function montarTextoOferta(produto, extra = "") {
  const nome = textoSeguro(produto?.titulo, 120);
  const preco = produto?.precoTxt || "";
  const de = produto?.precoDeTxt || "";
  const off = Number(produto?.desconto || 0);
  const link = String(produto?.link || "");
  const gancho = textoSeguro(extra, 120) || "🔥 ACHADINHO";
  const linhas = [gancho, "", nome, ""];

  if (de && off) {
    linhas.push(`❌ De ${de}`);
    linhas.push(`✅ Por ${preco}`);
    linhas.push(`💥 ${off}% OFF`);
  } else if (preco) {
    linhas.push(`💰 ${preco}`);
  }

  linhas.push("", "🛒 Corre no link:", link, "", "#achadinhos #promocao #oferta");
  return linhas.join("\n");
}
