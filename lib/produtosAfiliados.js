import { createHash } from "crypto";
import { textoSeguro } from "./security";

function brl(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function descontoPct(de, por) {
  const a = Number(de);
  const b = Number(por);
  if (!a || !b || a <= b) return 0;
  return Math.round(((a - b) / a) * 100);
}

function linkMeli(permalink, tag) {
  const base = String(permalink || "").split("?")[0];
  if (!base) return "";
  const id = textoSeguro(tag, 40);
  if (!id) return base;
  const url = new URL(base);
  url.searchParams.set("matt_tool", id);
  url.searchParams.set("matt_word", "crm");
  url.searchParams.set("matt_source", "affiliate");
  return url.toString();
}

function linkShopee(productLink, offerLink, shopId, itemId, tag) {
  if (offerLink) return String(offerLink);
  const id = textoSeguro(tag, 80);
  if (productLink) {
    const base = String(productLink).split("?")[0];
    return id ? `${base}?uls_trackid=${encodeURIComponent(id)}` : base;
  }
  if (shopId && itemId) {
    const base = `https://shopee.com.br/product/${shopId}/${itemId}`;
    return id ? `${base}?uls_trackid=${encodeURIComponent(id)}` : base;
  }
  return "";
}

async function buscarMercadoLivre(termo, soPromo, tag) {
  const q = encodeURIComponent(termo || "oferta do dia");
  const res = await fetch(
    `https://api.mercadolibre.com/sites/MLB/search?q=${q}&limit=24&status=active`,
    { cache: "no-store", headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Mercado Livre HTTP ${res.status}`);
  const data = await res.json();
  const itens = Array.isArray(data?.results) ? data.results : [];
  return itens
    .map((item) => {
      const preco = Number(item.price || 0);
      const de = Number(item.original_price || 0);
      const off = descontoPct(de, preco);
      return {
        id: `ml-${item.id}`,
        origem: "mercadolivre",
        titulo: String(item.title || "").slice(0, 160),
        preco,
        precoDe: de > preco ? de : 0,
        desconto: off,
        imagem: String(item.thumbnail || "").replace("http://", "https://"),
        link: linkMeli(item.permalink, tag),
        precoTxt: brl(preco),
        precoDeTxt: de > preco ? brl(de) : "",
      };
    })
    .filter((item) => item.titulo && item.link && item.preco > 0)
    .filter((item) => (soPromo ? item.desconto >= 5 : true));
}

function assinaturaShopee(appId, secret, timestamp, payload) {
  return createHash("sha256")
    .update(`${appId}${timestamp}${payload}${secret}`)
    .digest("hex");
}

async function buscarShopeeOficial(termo, soPromo, tag) {
  const appId = process.env.SHOPEE_APP_ID || "";
  const secret = process.env.SHOPEE_SECRET || "";
  if (!appId || !secret) return null;

  const query = `query ProductOffer($keyword: String, $page: Int, $limit: Int, $sortType: Int) {
    productOfferV2(keyword: $keyword, page: $page, limit: $limit, sortType: $sortType) {
      nodes {
        productName
        itemId
        shopId
        imageUrl
        offerLink
        productLink
        priceMin
        priceDiscountRate
      }
    }
  }`;
  const payload = JSON.stringify({
    query,
    variables: {
      keyword: termo || "oferta",
      page: 1,
      limit: 20,
      sortType: 1,
    },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch("https://open-api.affiliate.shopee.com.br/graphql", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: assinaturaShopee(appId, secret, timestamp, payload),
      Timestamp: String(timestamp),
      Appid: appId,
    },
    body: payload,
  });
  if (!res.ok) throw new Error(`Shopee afiliado HTTP ${res.status}`);
  const data = await res.json();
  const nodes = data?.data?.productOfferV2?.nodes || [];
  return nodes
    .map((item) => {
      const raw = Number(item.priceMin || 0);
      const precoReais = raw > 1000 ? raw / 100000 : raw;
      const off = Number(item.priceDiscountRate || 0);
      return {
        id: `shopee-${item.shopId}-${item.itemId}`,
        origem: "shopee",
        titulo: String(item.productName || "").slice(0, 160),
        preco: precoReais,
        precoDe: 0,
        desconto: off,
        imagem: String(item.imageUrl || ""),
        link: linkShopee(item.productLink, item.offerLink, item.shopId, item.itemId, tag),
        precoTxt: brl(precoReais),
        precoDeTxt: "",
      };
    })
    .filter((item) => item.titulo && item.link)
    .filter((item) => (soPromo ? item.desconto >= 5 : true));
}

async function buscarShopeePublico(termo, soPromo, tag) {
  const q = encodeURIComponent(termo || "oferta");
  const res = await fetch(
    `https://shopee.com.br/api/v4/search/search_items?by=relevancy&keyword=${q}&limit=20&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 HondaCRM/1.0",
        Referer: "https://shopee.com.br/",
      },
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  const itens = Array.isArray(data?.items) ? data.items : [];
  return itens
    .map((row) => {
      const item = row.item_basic || row.item || row;
      const preco = Number(item.price || 0) / 100000;
      const de = Number(item.price_before_discount || 0) / 100000;
      const off = descontoPct(de, preco) || Number(item.raw_discount || 0);
      const shopId = item.shopid || item.shop_id;
      const itemId = item.itemid || item.item_id;
      return {
        id: `shopee-${shopId}-${itemId}`,
        origem: "shopee",
        titulo: String(item.name || "").slice(0, 160),
        preco,
        precoDe: de > preco ? de : 0,
        desconto: off,
        imagem: item.image ? `https://down-br.img.susercontent.com/file/${item.image}` : "",
        link: linkShopee("", "", shopId, itemId, tag),
        precoTxt: brl(preco),
        precoDeTxt: de > preco ? brl(de) : "",
      };
    })
    .filter((item) => item.titulo && item.link && item.preco > 0)
    .filter((item) => (soPromo ? item.desconto >= 5 : true));
}

export async function buscarProdutosAfiliados({
  termo = "",
  origem = "todos",
  soPromo = true,
  meliTag = "",
  shopeeTag = "",
} = {}) {
  const q = textoSeguro(termo, 80) || "oferta do dia";
  const querMl = origem !== "shopee";
  const querShopee = origem !== "mercadolivre";
  const avisos = [];
  let ml = [];
  let shopee = [];

  if (querMl) {
    try {
      ml = await buscarMercadoLivre(q, soPromo, meliTag || process.env.MELI_AFFILIATE_ID || "");
    } catch (error) {
      avisos.push(`Mercado Livre: ${error.message || "falha na busca"}`);
    }
  }

  if (querShopee) {
    try {
      const oficial = await buscarShopeeOficial(
        q,
        soPromo,
        shopeeTag || process.env.SHOPEE_AFFILIATE_ID || "",
      );
      shopee = Array.isArray(oficial)
        ? oficial
        : await buscarShopeePublico(q, soPromo, shopeeTag || process.env.SHOPEE_AFFILIATE_ID || "");
      if (!shopee.length) {
        avisos.push("Shopee: nenhum resultado. Configure SHOPEE_APP_ID e SHOPEE_SECRET para busca oficial de afiliado.");
      }
    } catch (error) {
      avisos.push(`Shopee: ${error.message || "falha na busca"}`);
      try {
        shopee = await buscarShopeePublico(q, soPromo, shopeeTag || process.env.SHOPEE_AFFILIATE_ID || "");
      } catch {
        shopee = [];
      }
    }
  }

  const lista = [...ml, ...shopee].sort((a, b) => (b.desconto || 0) - (a.desconto || 0));
  return { produtos: lista.slice(0, 36), avisos };
}

export function montarTextoOferta(produto) {
  const nome = textoSeguro(produto?.titulo, 120);
  const preco = produto?.precoTxt || "";
  const de = produto?.precoDeTxt || "";
  const off = Number(produto?.desconto || 0);
  const link = String(produto?.link || "");
  const loja = produto?.origem === "shopee" ? "Shopee" : "Mercado Livre";
  return (
    `🔥 Oferta ${loja}\n\n` +
    `${nome}\n\n` +
    (de && off ? `De ${de} por ${preco} (${off}% OFF)\n\n` : `${preco}\n\n`) +
    `${link}`
  );
}
