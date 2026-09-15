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

export function extrairMeliAfiliado(texto) {
  const bruto = String(texto || "").trim();
  try {
    const url = new URL(bruto);
    const tool = url.searchParams.get("matt_tool") || "";
    const word = url.searchParams.get("matt_word") || "";
    if (tool || word) return { tool, word };
  } catch {
    // não é URL
  }
  if (/^\d{4,}$/.test(bruto)) return { tool: bruto, word: "" };
  return { tool: "", word: "" };
}

function tagsMeli(tag, word) {
  const daUrl = extrairMeliAfiliado(tag);
  return {
    tool: daUrl.tool || textoSeguro(tag, 40),
    word: daUrl.word || textoSeguro(word, 80) || process.env.MELI_AFFILIATE_WORD || "",
  };
}

function linkMeli(permalink, tag, word = "") {
  const base = String(permalink || "").split("?")[0];
  if (!base) return "";
  const { tool, word: mattWord } = tagsMeli(tag, word);
  if (!tool && !mattWord) return base;
  const url = new URL(base);
  if (tool) url.searchParams.set("matt_tool", tool);
  if (mattWord) url.searchParams.set("matt_word", mattWord);
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

const HEADERS_ML = {
  Accept: "application/json,text/html;q=0.9",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

function produtoMl({ id, titulo, preco, de, imagem, permalink }, tag, word = "") {
  const off = descontoPct(de, preco);
  return {
    id: `ml-${id}`,
    origem: "mercadolivre",
    titulo: String(titulo || "").slice(0, 160),
    preco: Number(preco) || 0,
    precoDe: de > preco ? de : 0,
    desconto: off,
    imagem: String(imagem || "").replace("http://", "https://"),
    link: linkMeli(permalink, tag, word),
    precoTxt: brl(preco),
    precoDeTxt: de > preco ? brl(de) : "",
  };
}

function filtrarOfertas(lista, soPromo) {
  return lista
    .filter((item) => item.titulo && item.link && item.preco > 0)
    .filter((item) => (soPromo ? item.desconto >= 5 : true));
}

async function buscarMercadoLivreApi(termo, tag, word = "") {
  const q = encodeURIComponent(termo || "oferta do dia");
  const headers = { ...HEADERS_ML };
  const token = process.env.MELI_ACCESS_TOKEN || "";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `https://api.mercadolibre.com/sites/MLB/search?q=${q}&limit=24&status=active`,
    { cache: "no-store", headers },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const itens = Array.isArray(data?.results) ? data.results : [];
  return itens.map((item) =>
    produtoMl(
      {
        id: item.id,
        titulo: item.title,
        preco: item.price,
        de: item.original_price,
        imagem: item.thumbnail,
        permalink: item.permalink,
      },
      tag,
      word,
    ),
  );
}

function slugBusca(termo) {
  const slug = String(termo || "ofertas")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "ofertas";
}

async function buscarMercadoLivreListado(termo, tag, word = "") {
  const url = `https://lista.mercadolivre.com.br/${slugBusca(termo)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      ...HEADERS_ML,
      Accept: "text/html,application/xhtml+xml",
      Referer: "https://www.mercadolivre.com.br/",
    },
  });
  if (!res.ok) throw new Error(`listado HTTP ${res.status}`);
  const html = await res.text();
  const produtos = [];

  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const bloco of ldBlocks) {
    try {
      const json = JSON.parse(bloco[1]);
      const lista = json?.["@type"] === "ItemList" ? json.itemListElement : json?.itemListElement;
      const itens = Array.isArray(lista) ? lista : [];
      for (const row of itens) {
        const item = row?.item || row;
        const offer = item?.offers || {};
        const permalink = offer.url || item.url || "";
        const id = String(permalink).match(/MLB-?\d+/)?.[0]?.replace("-", "") || permalink;
        produtos.push(
          produtoMl(
            {
              id,
              titulo: item.name,
              preco: Number(offer.price || offer.lowPrice || 0),
              de: Number(offer.highPrice || 0),
              imagem: Array.isArray(item.image) ? item.image[0] : item.image,
              permalink,
            },
            tag,
            word,
          ),
        );
      }
    } catch {
      // ignora JSON-LD inválido
    }
  }

  if (produtos.length) return produtos;

  const cards = [...html.matchAll(/"permalink":"(https:\\\/\\\/[^"]+mercadolivre[^"]+)"[\s\S]{0,400}?"title":"([^"]+)"[\s\S]{0,200}?"price":([\d.]+)/gi)];
  for (const row of cards.slice(0, 24)) {
    const permalink = String(row[1] || "").replace(/\\\//g, "/");
    const id = permalink.match(/MLB-?\d+/)?.[0]?.replace("-", "") || permalink;
    produtos.push(
      produtoMl(
        {
          id,
          titulo: row[2],
          preco: Number(row[3]),
          de: 0,
          imagem: "",
          permalink,
        },
        tag,
        word,
      ),
    );
  }
  return produtos;
}

async function itemMercadoLivre(id, tag, word = "") {
  const mlb = String(id || "").replace(/-/g, "").toUpperCase();
  if (!/^MLB\d+$/.test(mlb)) return null;
  const res = await fetch(`https://api.mercadolibre.com/items/${mlb}`, {
    cache: "no-store",
    headers: HEADERS_ML,
  });
  if (!res.ok) return null;
  const item = await res.json();
  return produtoMl(
    {
      id: item.id,
      titulo: item.title,
      preco: item.price,
      de: item.original_price,
      imagem: item.thumbnail || item.pictures?.[0]?.url,
      permalink: item.permalink,
    },
    tag,
    word,
  );
}

async function buscarMercadoLivre(termo, soPromo, tag, word = "") {
  try {
    const api = await buscarMercadoLivreApi(termo, tag, word);
    const ok = filtrarOfertas(api, soPromo);
    if (ok.length) return ok;
  } catch {
    // API pública do ML passou a exigir token / devolve 403
  }
  const listado = await buscarMercadoLivreListado(termo, tag, word);
  return filtrarOfertas(listado, false);
}

function idsShopeeNaUrl(url) {
  const texto = String(url || "");
  const a = texto.match(/i\.(\d+)\.(\d+)/);
  if (a) return { shopId: a[1], itemId: a[2] };
  const b = texto.match(/product\/(\d+)\/(\d+)/);
  if (b) return { shopId: b[1], itemId: b[2] };
  return null;
}

export async function importarProdutoPorUrl(url, { meliTag = "", meliWord = "", shopeeTag = "" } = {}) {
  const bruto = textoSeguro(url, 500);
  if (!bruto) throw new Error("Cole o link da oferta");

  const tagsUrl = extrairMeliAfiliado(bruto);
  const tool = meliTag || tagsUrl.tool || process.env.MELI_AFFILIATE_ID || "";
  const word = meliWord || tagsUrl.word || process.env.MELI_AFFILIATE_WORD || "";

  if (/\/social\//i.test(bruto) && (tagsUrl.tool || tagsUrl.word)) {
    const err = new Error("Esse é o seu perfil de afiliado, não um produto. Os IDs foram reconhecidos: cole em Links e salve.");
    err.meli = { tool: tagsUrl.tool, word: tagsUrl.word };
    throw err;
  }

  let alvo = bruto;
  if (/meli\.la\//i.test(bruto)) {
    try {
      const res = await fetch(bruto, { method: "GET", redirect: "follow", cache: "no-store", headers: HEADERS_ML });
      alvo = res.url || bruto;
    } catch {
      alvo = bruto;
    }
  }

  if (/mercadolivre|mercadolibre|meli\.la/i.test(alvo) || /mercadolivre|mercadolibre/i.test(bruto)) {
    const id = alvo.match(/MLB-?\d+/i)?.[0];
    const item = await itemMercadoLivre(id, tool, word);
    if (!item) throw new Error("Não deu para ler esse link do Mercado Livre. Cole o link do produto, não o perfil social.");
    return item;
  }

  if (/shopee\.com/i.test(bruto)) {
    const ids = idsShopeeNaUrl(bruto);
    if (!ids) throw new Error("Link da Shopee inválido");
    const tag = shopeeTag || process.env.SHOPEE_AFFILIATE_ID || "";
    const link = linkShopee("", "", ids.shopId, ids.itemId, tag);
    return {
      id: `shopee-${ids.shopId}-${ids.itemId}`,
      origem: "shopee",
      titulo: `Produto Shopee ${ids.itemId}`,
      preco: 0,
      precoDe: 0,
      desconto: 0,
      imagem: "",
      link,
      precoTxt: "",
      precoDeTxt: "",
    };
  }

  throw new Error("Use um link do Mercado Livre ou da Shopee");
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
  meliWord = "",
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
      ml = await buscarMercadoLivre(
        q,
        soPromo,
        meliTag || process.env.MELI_AFFILIATE_ID || "",
        meliWord || process.env.MELI_AFFILIATE_WORD || "",
      );
    } catch (error) {
      avisos.push("Mercado Livre: busca automática bloqueada. Cole o link da oferta abaixo.");
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
        avisos.push("Shopee: cole o link do produto ou configure SHOPEE_APP_ID e SHOPEE_SECRET na Vercel.");
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
