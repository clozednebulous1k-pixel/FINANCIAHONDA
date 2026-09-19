import { celularWhatsapp, chaveEmpresa, soDigitos, textoSeguro, validarWhatsapp } from "./security";

export const SEGMENTOS = [
  { id: "todos", label: "Todos (com WhatsApp)" },
  { id: "arquitetura", label: "Arquitetura" },
  { id: "restaurante", label: "Restaurante / food" },
  { id: "roupas", label: "Loja de roupas" },
  { id: "salao", label: "Salão / estética" },
  { id: "oficina", label: "Oficina / auto" },
  { id: "clinica", label: "Clínica / saúde" },
  { id: "dentista", label: "Dentista" },
  { id: "imobiliaria", label: "Imobiliária" },
  { id: "advocacia", label: "Advocacia / contábil" },
  { id: "pet", label: "Pet shop" },
  { id: "padaria", label: "Padaria / mercado" },
  { id: "loja", label: "Loja / comércio" },
];

const FILTROS_OSM = {
  arquitetura: ['["office"="architect"]', '["craft"="architect"]'],
  restaurante: ['["amenity"="restaurant"]', '["amenity"="fast_food"]', '["amenity"="cafe"]'],
  roupas: [
    '["shop"="clothes"]',
    '["shop"="shoes"]',
    '["shop"="boutique"]',
    '["shop"="tailor"]',
    '["shop"="fabric"]',
  ],
  salao: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  oficina: ['["shop"="car_repair"]', '["shop"="tyres"]'],
  clinica: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["amenity"="pharmacy"]'],
  dentista: ['["amenity"="dentist"]'],
  imobiliaria: ['["office"="estate_agent"]'],
  advocacia: ['["office"="lawyer"]', '["office"="accountant"]'],
  pet: ['["shop"="pet"]', '["amenity"="veterinary"]'],
  padaria: ['["shop"="bakery"]', '["shop"="convenience"]'],
  loja: ['["shop"="clothes"]', '["shop"="shoes"]', '["shop"="boutique"]', '["shop"="florist"]', '["shop"="yes"]'],
  todos: [
    '["shop"]',
    '["amenity"="restaurant"]',
    '["amenity"="fast_food"]',
    '["amenity"="cafe"]',
    '["amenity"="dentist"]',
    '["amenity"="clinic"]',
    '["amenity"="pharmacy"]',
    '["amenity"="veterinary"]',
    '["office"]',
    '["craft"="architect"]',
  ],
};

const SEGMENTOS_NICHO = new Set(["arquitetura", "restaurante", "roupas"]);

const SHOPS_COMUNS =
  "hairdresser|beauty|bakery|convenience|clothes|florist|laundry|tailor|shoes|gift|pet|copyshop|stationery|yes|boutique|fabric";

const REDES_GRANDES =
  /mcdonald|burger king|subway|starbucks|habib|outback|ragazzo|\bbob'?s\b|giraffas|\bkfc\b|pizza hut|dominos|casa bahia|magazine luiza|magalu|americanas|carrefour|assai|assaí|extra hipermercado|atacad[aã]o|sam'?s club|droga raia|drogasil|pague menos|unimed|\bamil\b|bradesco|\bita[uú]\b|santander|nubank|caixa econ[oô]mica|banco do brasil|\bhonda\b|\btoyota\b|volkswagen|\bfiat\b|chevrolet|renault|hyundai|\byamaha\b|\bvivo\b|\bclaro\b|\btim\b|ifood|rappi|\buber\b|mercado livre|mercadolivre|grupo gasol|posto ipiranga|shell select|petrobras|\bzara\b|renner|\bcea\b|riachuelo|marisa|hering|centauro|madero|coco bambu|spoleto|china in box|outback|habib'?s|giraffas|habibs|grupo\s+p[aã]o\s+de\s+a[cç]ucar|sonda\s+supermercado|dia\s+supermercado|\bwalmart\b|ikea|tok\s*&?\s*stok|lebiscuit|quero-quero|pernambucanas|rihappy|pbkids|\bh&m\b|\bc&a\b|forum\s+das\s+am[eé]ricas|shopping\s+center|\bsesc\b|\bsesi\b|prefeitura|governo|secretaria|universidade|faculdade|hospital\s+|santa\s+casa|einstein|s[ií]rio[\s-]?liban[eê]s|fleury|dasa|grupo\s+dasa/i;

/** Porte máximo aceito: 1=pequena, 2=média. 3+ = grande (fora). */
const PORTE_MAX_PEQ_MED = 2;

const INICIO_NIVEL = Date.parse("2026-09-18T00:00:00-03:00");

const NIVEIS = [
  { nivel: 1, ateDia: 10, label: "Pequenas com WhatsApp", detalhe: "Só comércio local pequeno, sem rede." },
  { nivel: 2, ateDia: 25, label: "Pequenas e médias", detalhe: "Inclui média local independente." },
  { nivel: 3, ateDia: 50, label: "Pequenas e médias", detalhe: "Continua só PME — sem empresa grande." },
  { nivel: 4, ateDia: Infinity, label: "Pequenas e médias", detalhe: "Continua só PME — sem empresa grande." },
];

export function nivelProspeccao(agora = Date.now()) {
  const dias = Math.max(0, Math.floor((agora - INICIO_NIVEL) / 86400000));
  const atual = NIVEIS.find((n) => dias < n.ateDia) || NIVEIS[NIVEIS.length - 1];
  const proximo = NIVEIS.find((n) => n.nivel === atual.nivel + 1);
  return {
    nivel: Math.min(atual.nivel, PORTE_MAX_PEQ_MED),
    dias,
    label: atual.label,
    detalhe: atual.detalhe,
    proximoEm: proximo ? Math.max(0, atual.ateDia - dias) : 0,
    proximoLabel: proximo?.label || "",
  };
}

function porteDe(tags, nome, site) {
  const shop = String(tags.shop || "");
  const amenity = String(tags.amenity || "");
  const office = String(tags.office || "");
  const craft = String(tags.craft || "");
  const texto = `${nome} ${tags.brand || ""} ${tags.operator || ""}`;
  // Grande / rede → fora
  if (tags.brand || REDES_GRANDES.test(texto)) return 5;
  if (/supermarket|department_store|mall|wholesale|electronics|car|motorcycle/.test(shop)) return 5;
  if (/bank|hospital|university|college|fuel|police|townhall|cinema|theatre/.test(amenity)) return 5;
  if (/company|insurance|tax_advisor|government|association|ngo|political_party/.test(office)) return 5;
  // Escritório médio/grande → fora por enquanto
  if (/lawyer|accountant/.test(office)) return 4;
  if (office === "estate_agent") return 3;
  if (/clinic|doctors/.test(amenity) && !siteFraco(site)) return 3;
  // PME
  if (office === "architect" || craft === "architect") return siteFraco(site) ? 1 : 2;
  if (/dentist|pharmacy|restaurant|veterinary|cafe|fast_food/.test(amenity) || /car_repair|tyres|clothes|shoes|boutique|tailor|hairdresser|beauty|bakery|pet|florist/.test(shop)) {
    return siteFraco(site) ? 1 : 2;
  }
  if (office && !siteFraco(site)) return 3;
  if (!siteFraco(site)) return 2;
  return 1;
}

function encaixaNoNicho(tags, nome, segmento) {
  if (!SEGMENTOS_NICHO.has(segmento)) return true;
  const shop = String(tags.shop || "");
  const amenity = String(tags.amenity || "");
  const office = String(tags.office || "");
  const craft = String(tags.craft || "");
  const n = String(nome || "");
  if (segmento === "arquitetura") {
    return office === "architect" || craft === "architect" || /arquitet/i.test(n);
  }
  if (segmento === "restaurante") {
    return /restaurant|cafe|fast_food/.test(amenity) || /restaurante|pizzaria|lanchonete|hamburgu/i.test(n);
  }
  if (segmento === "roupas") {
    return /clothes|shoes|boutique|tailor|fabric/.test(shop) || /moda|roupas|boutique|confec/i.test(n);
  }
  return true;
}

const CENTROS = {
  "sao paulo": { lat: -23.5505, lng: -46.6333, raio: 14000 },
  "são paulo": { lat: -23.5505, lng: -46.6333, raio: 14000 },
  guarulhos: { lat: -23.4538, lng: -46.5333, raio: 10000 },
  osasco: { lat: -23.5325, lng: -46.7917, raio: 8000 },
  campinas: { lat: -22.9099, lng: -47.0626, raio: 10000 },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729, raio: 12000 },
  "belo horizonte": { lat: -19.9167, lng: -43.9345, raio: 10000 },
};

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const UA = "AgenciaCRM/1.0 (prospeccao de empresas locais)";

function siteFraco(url) {
  const u = String(url || "").trim().toLowerCase();
  if (!u) return true;
  return /facebook\.com|instagram\.com|wa\.me|api\.whatsapp|linktr\.ee|bit\.ly|tiktok\.com/.test(u);
}

function numeroDeWaMe(texto) {
  const s = String(texto || "");
  const m =
    s.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?[^#]*?phone=|whatsapp\.com\/send\?[^#]*?phone=)(\+?\d{10,15})/i) ||
    s.match(/[?&]phone=(\+?\d{10,15})/i);
  if (!m) return "";
  let d = soDigitos(m[1], 13);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return celularWhatsapp(d) || "";
}

function celularDeCampo(campo) {
  const deLink = numeroDeWaMe(campo);
  if (deLink) return deLink;
  for (const pedaco of String(campo || "").split(/[\/;,|\s]+/)) {
    let d = soDigitos(pedaco, 13);
    if (!d) continue;
    if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
    const cel = celularWhatsapp(d);
    if (cel) return cel;
  }
  return "";
}

/** Celular no mapa (Zap tag, wa.me, mobile ou phone celular). */
function telefonesDe(fonte) {
  for (const campo of [fonte.whatsapp, fonte["contact:whatsapp"]].filter(Boolean)) {
    const cel = celularDeCampo(campo);
    if (cel) return { fone: cel, fonteWa: true };
  }
  for (const campo of [
    fonte.website,
    fonte["contact:website"],
    fonte["contact:facebook"],
    fonte.url,
    fonte["contact:instagram"],
  ].filter(Boolean)) {
    const cel = numeroDeWaMe(campo);
    if (cel) return { fone: cel, fonteWa: true };
  }
  for (const campo of [fonte["contact:mobile"], fonte.mobile].filter(Boolean)) {
    const cel = celularDeCampo(campo);
    if (cel) return { fone: cel, fonteWa: true };
  }
  for (const campo of [fonte.phone, fonte["contact:phone"]].filter(Boolean)) {
    const cel = celularDeCampo(campo);
    if (cel) return { fone: cel, fonteWa: true };
  }
  return { fone: "", fonteWa: false };
}

function precisaSoftware(texto) {
  return /imobili|advoc|contab|clinic|dentist|oficina|salao|cabeleir|estetic|restaurant|arquitet|moda|roupas|boutique/.test(
    String(texto || "").toLowerCase(),
  );
}

function montarEmpresa({ nome, fone, cidade, bairro, endereco, categoria, site, id, lat, lng, porte }) {
  const local = fone.startsWith("55") && fone.length >= 12 ? fone.slice(2) : fone;
  const cel = celularWhatsapp(local);
  const semSite = siteFraco(site);
  return {
    id,
    nome: textoSeguro(nome, 120),
    whatsapp: cel || validarWhatsapp(local) || local,
    whatsappOk: Boolean(cel),
    cidade: textoSeguro(cidade, 80),
    bairro: textoSeguro(bairro, 80),
    endereco: textoSeguro(endereco, 160),
    categoria: textoSeguro(categoria, 40),
    site: textoSeguro(site, 200),
    precisaSite: semSite,
    precisaSoftware: precisaSoftware(`${categoria} ${nome}`),
    porte,
    motivo: semSite ? "PME · sem site" : "PME local",
    lat,
    lng,
  };
}

function empresaDoOsm(el, cidade, segmento = "todos") {
  const tags = el.tags || {};
  const nome = tags.name || tags.operator || "";
  const { fone, fonteWa } = telefonesDe(tags);
  if (!nome || nome.length < 3 || !fone || !fonteWa) return null;
  if (/^0800|^0300/.test(fone)) return null;
  if (!encaixaNoNicho(tags, nome, segmento)) return null;
  const site = tags.website || tags["contact:website"] || "";
  const porte = porteDe(tags, nome, site);
  if (porte >= 3) return null; // só pequena e média
  const categoria =
    tags.office === "architect" || tags.craft === "architect"
      ? "arquitetura"
      : tags.shop || tags.amenity || tags.office || tags.craft || "empresa";
  return montarEmpresa({
    id: `osm-${el.type || "n"}-${el.id}`,
    nome,
    fone,
    cidade,
    bairro: tags["addr:suburb"] || tags["addr:neighbourhood"] || "",
    endereco: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"] || cidade]
      .filter(Boolean)
      .join(", "),
    categoria,
    site,
    porte,
    lat: el.lat || el.center?.lat || 0,
    lng: el.lon || el.center?.lon || 0,
  });
}

async function geocodificarCidade(cidade) {
  const chave = String(cidade || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (CENTROS[chave] || CENTROS[String(cidade || "").trim().toLowerCase()]) {
    return CENTROS[chave] || CENTROS[String(cidade || "").trim().toLowerCase()];
  }
  const q = encodeURIComponent(`${textoSeguro(cidade, 80)}, Brasil`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${q}`,
    { headers: { Accept: "application/json", "User-Agent": UA }, cache: "no-store" },
  );
  if (!res.ok) throw new Error("Não achei essa cidade");
  const lista = await res.json();
  const hit = Array.isArray(lista) ? lista[0] : null;
  if (!hit) throw new Error("Cidade não encontrada");
  return { lat: Number(hit.lat), lng: Number(hit.lon), raio: 10000 };
}

const SP_PONTOS = [
  { lat: -23.5505, lng: -46.6333, raio: 7500 },
  { lat: -23.5614, lng: -46.6558, raio: 6000 },
  { lat: -23.5679, lng: -46.6486, raio: 5000 },
  { lat: -23.5617, lng: -46.6827, raio: 5500 },
  { lat: -23.5329, lng: -46.6395, raio: 5500 },
  { lat: -23.5890, lng: -46.6380, raio: 6000 },
  { lat: -23.5400, lng: -46.5750, raio: 7000 },
  { lat: -23.5080, lng: -46.6250, raio: 6500 },
  { lat: -23.6220, lng: -46.6650, raio: 7000 },
  { lat: -23.5280, lng: -46.7310, raio: 6500 },
  { lat: -23.6015, lng: -46.6650, raio: 5500 },
  { lat: -23.5445, lng: -46.6165, raio: 5500 },
  { lat: -23.5865, lng: -46.6820, raio: 5000 },
  { lat: -23.6105, lng: -46.6950, raio: 5500 },
];

function queryOverpass(lat, lng, segmento, raio) {
  const seg = SEGMENTOS.some((s) => s.id === segmento) ? segmento : "todos";
  const filtros = FILTROS_OSM[seg] || FILTROS_OSM.todos;
  const compacto = [];
  // Só o nicho + celular/Zap (query leve pra não abortar na Vercel)
  if (seg === "todos") {
    compacto.push(
      `nwr["shop"~"${SHOPS_COMUNS}"]["phone"](around:${raio},${lat},${lng});`,
      `nwr["shop"~"${SHOPS_COMUNS}"]["contact:mobile"](around:${raio},${lat},${lng});`,
      `nwr["shop"~"${SHOPS_COMUNS}"]["contact:whatsapp"](around:${raio},${lat},${lng});`,
      `nwr["amenity"~"restaurant|cafe|fast_food|dentist|clinic"]["phone"](around:${raio},${lat},${lng});`,
      `nwr["amenity"~"restaurant|cafe|fast_food"]["contact:mobile"](around:${raio},${lat},${lng});`,
      `nwr["office"="architect"]["phone"](around:${raio},${lat},${lng});`,
    );
  } else {
    for (const f of filtros.slice(0, 4)) {
      compacto.push(
        `nwr${f}["contact:whatsapp"](around:${raio},${lat},${lng});`,
        `nwr${f}["contact:mobile"](around:${raio},${lat},${lng});`,
        `nwr${f}["phone"](around:${raio},${lat},${lng});`,
      );
    }
  }
  return `[out:json][timeout:15];\n(\n${compacto.join("\n")}\n);\nout tags center 60;`;
}

async function overpass(query) {
  let ultimo = new Error("Mapa ocupado, tenta de novo");
  for (const url of OVERPASS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 18000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
          "User-Agent": UA,
        },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
        signal: ctrl.signal,
      });
      const text = await res.text();
      if (!res.ok || !text.trim().startsWith("{")) {
        ultimo = new Error(`Mapas HTTP ${res.status}`);
        continue;
      }
      const data = JSON.parse(text);
      return Array.isArray(data.elements) ? data.elements : [];
    } catch (error) {
      const abortado =
        error?.name === "AbortError" || /aborted|abort/i.test(String(error?.message || ""));
      ultimo = new Error(abortado ? "Mapa demorou demais. Tentando de novo…" : error.message || "Mapa ocupado");
    } finally {
      clearTimeout(timer);
    }
  }
  throw ultimo;
}

function chaveGoogleMaps() {
  return String(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || "").trim();
}

/** Termos de busca no Google Maps por segmento. */
const GOOGLE_QUERIES = {
  arquitetura: ["escritório de arquitetura", "arquiteto"],
  restaurante: ["restaurante", "lanchonete"],
  roupas: ["loja de roupas", "boutique"],
  salao: ["salão de beleza", "cabeleireiro"],
  oficina: ["oficina mecânica", "borracharia"],
  clinica: ["clínica", "farmácia"],
  dentista: ["dentista", "consultório odontológico"],
  imobiliaria: ["imobiliária"],
  advocacia: ["advocacia", "contabilidade"],
  pet: ["pet shop", "veterinário"],
  padaria: ["padaria", "mercado de bairro"],
  loja: ["loja", "comércio local"],
  todos: ["loja", "restaurante", "salão de beleza", "padaria", "oficina mecânica"],
};

function porteGoogle(nome, types = [], site = "") {
  const texto = String(nome || "");
  if (REDES_GRANDES.test(texto)) return 5;
  const t = (Array.isArray(types) ? types : []).map((x) => String(x || "").toLowerCase());
  if (t.some((x) => /department_store|shopping_mall|supermarket|bank|hospital|university|car_dealer|gas_station/.test(x))) {
    return 5;
  }
  if (t.some((x) => /lawyer|accounting|real_estate_agency/.test(x))) return 3;
  return siteFraco(site) ? 1 : 2;
}

function categoriaGoogle(types = [], segmento = "loja") {
  const t = (Array.isArray(types) ? types : []).join(" ").toLowerCase();
  if (/architect/.test(t)) return "arquitetura";
  if (/restaurant|cafe|meal|food/.test(t)) return "restaurante";
  if (/cloth|shoe|boutique|apparel/.test(t)) return "roupas";
  if (/beauty|hair|spa/.test(t)) return "salao";
  if (/car_repair|tire/.test(t)) return "oficina";
  if (/dentist/.test(t)) return "dentista";
  if (/doctor|clinic|pharmacy|health/.test(t)) return "clinica";
  if (/pet|veterinary/.test(t)) return "pet";
  if (/bakery|convenience|grocery/.test(t)) return "padaria";
  return segmento === "todos" ? "loja" : segmento;
}

async function googleFetchJson(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok || !text.trim().startsWith("{")) {
      throw new Error(`Google Maps HTTP ${res.status}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

async function googleNearby(lat, lng, query, key, raio = 4500) {
  const u = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  u.searchParams.set("location", `${lat},${lng}`);
  u.searchParams.set("radius", String(Math.min(Math.max(raio, 1500), 5000)));
  u.searchParams.set("keyword", query);
  u.searchParams.set("language", "pt-BR");
  u.searchParams.set("key", key);
  const data = await googleFetchJson(u.toString());
  if (data.status && !["OK", "ZERO_RESULTS"].includes(data.status)) {
    throw new Error(`Google Maps: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`);
  }
  return Array.isArray(data.results) ? data.results : [];
}

async function googleDetalhe(placeId, key) {
  const u = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  u.searchParams.set("place_id", placeId);
  u.searchParams.set(
    "fields",
    "place_id,name,formatted_phone_number,international_phone_number,website,formatted_address,geometry,types,business_status",
  );
  u.searchParams.set("language", "pt-BR");
  u.searchParams.set("key", key);
  const data = await googleFetchJson(u.toString(), 10000);
  if (data.status && data.status !== "OK") return null;
  return data.result || null;
}

function empresaDoGoogle(detalhe, cidade, segmento) {
  if (!detalhe?.name || detalhe.business_status === "CLOSED_PERMANENTLY") return null;
  const site = detalhe.website || "";
  const brutoFone = detalhe.international_phone_number || detalhe.formatted_phone_number || "";
  const deWa = numeroDeWaMe(site) || celularDeCampo(brutoFone);
  if (!deWa) return null; // só celular (candidato WhatsApp)
  const types = detalhe.types || [];
  const porte = porteGoogle(detalhe.name, types, site);
  if (porte > PORTE_MAX_PEQ_MED) return null;
  const loc = detalhe.geometry?.location || {};
  return montarEmpresa({
    id: `gmaps-${detalhe.place_id || soDigitos(deWa, 13)}`,
    nome: detalhe.name,
    fone: deWa,
    cidade,
    bairro: "",
    endereco: detalhe.formatted_address || cidade,
    categoria: categoriaGoogle(types, segmento),
    site,
    porte,
    lat: Number(loc.lat) || 0,
    lng: Number(loc.lng) || 0,
  });
}

/**
 * Google Maps: busca lugar → detalhe → extrai só celular/WhatsApp na hora.
 */
async function vasculharGoogleMaps({
  lugar,
  seg,
  max,
  geo,
  pontos,
  bloqueados,
  nomesBloqueados,
  idsBloqueados,
}) {
  const key = chaveGoogleMaps();
  if (!key) throw new Error("Sem GOOGLE_MAPS_API_KEY");

  const queries = GOOGLE_QUERIES[seg] || GOOGLE_QUERIES.todos;
  const qOffset = Math.floor(Date.now() / 30000) % queries.length;
  const termos = [...queries.slice(qOffset), ...queries.slice(0, qOffset)];
  const pOffset = Math.floor(Date.now() / 20000) % pontos.length;
  const rota = [...pontos.slice(pOffset), ...pontos.slice(0, pOffset)];

  const candidatos = [];
  const vistos = new Set();
  const placeVistos = new Set();
  let mapaOk = false;
  let ultimaFalha = new Error("Google Maps ocupado, tenta de novo");

  const maxPontos = pontos.length > 1 ? 2 : 1;
  const maxTermos = seg === "todos" ? 2 : 1;

  for (let i = 0; i < rota.length && i < maxPontos; i += 1) {
    if (candidatos.length >= max) break;
    const ponto = rota[i];
    for (let t = 0; t < termos.length && t < maxTermos; t += 1) {
      if (candidatos.length >= max) break;
      try {
        const results = await googleNearby(
          ponto.lat,
          ponto.lng,
          `${termos[t]} ${lugar}`,
          key,
          Math.min(ponto.raio || 4500, 5000),
        );
        mapaOk = true;
        const fatia = results.slice(0, 12);
        for (const place of fatia) {
          if (candidatos.length >= max) break;
          const pid = place.place_id;
          if (!pid || placeVistos.has(pid) || idsBloqueados.has(`gmaps-${pid}`)) continue;
          placeVistos.add(pid);
          let detalhe = place;
          // Nearby às vezes já traz name; telefone só no Details
          if (!place.international_phone_number && !place.formatted_phone_number) {
            detalhe = await googleDetalhe(pid, key);
            if (!detalhe) continue;
          }
          const item = empresaDoGoogle(detalhe, lugar, seg);
          if (!item?.nome || !item.whatsappOk) continue;
          const fone = String(item.whatsapp).replace(/\D/g, "");
          if (bloqueados.has(fone) || bloqueados.has(`55${fone}`)) continue;
          const nomeChave = chaveEmpresa(item.nome, item.cidade);
          if (nomeChave && nomesBloqueados.has(nomeChave)) continue;
          const chave = `${item.nome.toLowerCase()}|${fone}`;
          if (vistos.has(chave)) continue;
          vistos.add(chave);
          candidatos.push(item);
        }
      } catch (error) {
        ultimaFalha = error;
      }
    }
  }

  if (!mapaOk && !candidatos.length) throw ultimaFalha;
  candidatos.sort((a, b) => a.porte - b.porte || Number(b.precisaSite) - Number(a.precisaSite));
  return candidatos.slice(0, max);
}

/**
 * Busca empresas no Google Maps (celular/WhatsApp na hora).
 * Se não houver chave Google, cai no OpenStreetMap.
 */
export async function vasculharEmpresas({
  cidade = "São Paulo",
  segmento = "todos",
  limite = 40,
  excluir = [],
  excluirNomes = [],
  excluirOsm = [],
} = {}) {
  const seg = SEGMENTOS.some((s) => s.id === segmento) ? segmento : "todos";
  const lugar = textoSeguro(cidade, 80) || "São Paulo";
  const max = Math.min(Math.max(Number(limite) || 20, 1), 30);
  const etapa = nivelProspeccao();
  const geo = await geocodificarCidade(lugar);
  const chaveCidade = String(lugar)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const ehSP = chaveCidade === "sao paulo";
  const pontos = ehSP
    ? SP_PONTOS
    : [{ lat: geo.lat, lng: geo.lng, raio: Math.min(geo.raio || 8000, 10000) }];
  const bloqueados = new Set(
    (Array.isArray(excluir) ? excluir : []).map((n) => String(n || "").replace(/\D/g, "")).filter(Boolean),
  );
  const nomesBloqueados = new Set(
    (Array.isArray(excluirNomes) ? excluirNomes : []).map((n) => String(n || "").trim()).filter(Boolean),
  );
  const idsBloqueados = new Set(
    (Array.isArray(excluirOsm) ? excluirOsm : []).map((n) => String(n || "").trim()).filter(Boolean),
  );

  let fonte = "osm";
  let fila = [];

  if (chaveGoogleMaps()) {
    try {
      fila = await vasculharGoogleMaps({
        lugar,
        seg,
        max,
        geo,
        pontos,
        bloqueados,
        nomesBloqueados,
        idsBloqueados,
      });
      fonte = "google";
    } catch (error) {
      // sem resultados ou falha pontual → tenta OSM
      if (!/Sem GOOGLE_MAPS_API_KEY/.test(String(error?.message || ""))) {
        fonte = "osm";
      } else {
        throw error;
      }
    }
  }

  if (!fila.length) {
    const offset = Math.floor(Date.now() / 20000) % pontos.length;
    const rota = [...pontos.slice(offset), ...pontos.slice(0, offset)];
    const candidatos = [];
    const vistos = new Set();
    const osmVistos = new Set();
    let mapaOk = false;
    let ultimaFalha = new Error(
      chaveGoogleMaps()
        ? "Google Maps sem celular agora. Tentando de novo…"
        : "Coloca GOOGLE_MAPS_API_KEY no Vercel pra buscar no Google Maps",
    );
    const maxConsultas = ehSP ? 2 : 1;

    function absorver(elementos) {
      for (const el of elementos) {
        const oid = `${el.type || "n"}-${el.id}`;
        if (osmVistos.has(oid)) continue;
        osmVistos.add(oid);
        const item = empresaDoOsm(el, lugar, seg);
        if (!item?.nome || !item.whatsappOk) continue;
        if (item.porte > PORTE_MAX_PEQ_MED) continue;
        const fone = String(item.whatsapp).replace(/\D/g, "");
        if (bloqueados.has(fone) || bloqueados.has(`55${fone}`)) continue;
        if (item.id && idsBloqueados.has(item.id)) continue;
        const nomeChave = chaveEmpresa(item.nome, item.cidade);
        if (nomeChave && nomesBloqueados.has(nomeChave)) continue;
        const chave = `${item.nome.toLowerCase()}|${fone}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        candidatos.push(item);
      }
    }

    for (let i = 0; i < rota.length && i < maxConsultas; i += 1) {
      if (candidatos.length >= max) break;
      const ponto = rota[i];
      try {
        const extra = await overpass(
          queryOverpass(ponto.lat, ponto.lng, seg, Math.max(ponto.raio || 8000, 9000)),
        );
        mapaOk = true;
        absorver(extra);
      } catch (error) {
        ultimaFalha = error;
      }
    }

    if (!mapaOk && !candidatos.length) throw ultimaFalha;
    candidatos.sort((a, b) => a.porte - b.porte || Number(b.precisaSite) - Number(a.precisaSite));
    fila = candidatos.filter((item) => item.porte <= PORTE_MAX_PEQ_MED).slice(0, max);
    fonte = "osm";
  }

  return {
    cidade: lugar,
    segmento: seg,
    total: fila.length,
    comWhatsapp: fila.length,
    pagina: 0,
    fonte,
    nivel: {
      ...etapa,
      label: "Pequenas e médias",
      detalhe:
        fonte === "google"
          ? "Google Maps — só PME com celular/WhatsApp no resultado."
          : "Mapa — só PME com celular (fallback). Coloque GOOGLE_MAPS_API_KEY no Vercel.",
    },
    empresas: fila,
  };
}
