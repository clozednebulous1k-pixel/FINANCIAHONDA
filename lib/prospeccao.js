import { celularWhatsapp, soDigitos, textoSeguro, validarWhatsapp } from "./security";

export const SEGMENTOS = [
  { id: "todos", label: "Todos" },
  { id: "salao", label: "Salão / estética" },
  { id: "oficina", label: "Oficina / auto" },
  { id: "clinica", label: "Clínica / saúde" },
  { id: "dentista", label: "Dentista" },
  { id: "imobiliaria", label: "Imobiliária" },
  { id: "advocacia", label: "Advocacia / contábil" },
  { id: "restaurante", label: "Restaurante / food" },
  { id: "pet", label: "Pet shop" },
  { id: "padaria", label: "Padaria / mercado" },
  { id: "loja", label: "Loja / comércio" },
];

const FILTROS_OSM = {
  salao: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  oficina: ['["shop"="car_repair"]', '["shop"="tyres"]'],
  clinica: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["amenity"="pharmacy"]'],
  dentista: ['["amenity"="dentist"]'],
  imobiliaria: ['["office"="estate_agent"]'],
  advocacia: ['["office"="lawyer"]', '["office"="accountant"]'],
  restaurante: ['["amenity"="restaurant"]', '["amenity"="fast_food"]', '["amenity"="cafe"]'],
  pet: ['["shop"="pet"]', '["amenity"="veterinary"]'],
  padaria: ['["shop"="bakery"]', '["shop"="convenience"]'],
  loja: ['["shop"="clothes"]', '["shop"="yes"]'],
  todos: [
    '["shop"]',
    '["amenity"="restaurant"]',
    '["amenity"="fast_food"]',
    '["amenity"="cafe"]',
    '["amenity"="dentist"]',
    '["amenity"="clinic"]',
    '["office"]',
  ],
};

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

function telefonesDe(fonte) {
  const campos = [
    fonte.phone,
    fonte.mobile,
    fonte["contact:phone"],
    fonte["contact:mobile"],
    fonte.whatsapp,
    fonte["contact:whatsapp"],
  ].filter(Boolean);
  const achados = [];
  for (const campo of campos) {
    for (const pedaco of String(campo).split(/[\/;,|]/)) {
      let d = soDigitos(pedaco, 13);
      if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
      if (d.length === 10 || d.length === 11) achados.push(d);
    }
  }
  const movel = achados.find((d) => celularWhatsapp(d));
  return movel || achados[0] || "";
}

function precisaSoftware(texto) {
  return /imobili|advoc|contab|clinic|dentist|oficina|salao|cabeleir|estetic|restaurant/.test(
    String(texto || "").toLowerCase(),
  );
}

function montarEmpresa({ nome, fone, cidade, bairro, endereco, categoria, site, id, lat, lng }) {
  const local = fone.startsWith("55") && fone.length >= 12 ? fone.slice(2) : fone;
  const semSite = siteFraco(site);
  return {
    id,
    nome: textoSeguro(nome, 120),
    whatsapp: validarWhatsapp(local) || local,
    whatsappOk: Boolean(validarWhatsapp(local)),
    cidade: textoSeguro(cidade, 80),
    bairro: textoSeguro(bairro, 80),
    endereco: textoSeguro(endereco, 160),
    categoria: textoSeguro(categoria, 40),
    site: textoSeguro(site, 200),
    precisaSite: semSite,
    precisaSoftware: precisaSoftware(`${categoria} ${nome}`),
    motivo: semSite
      ? site
        ? "Só tem rede social, sem site próprio"
        : "Sem site no mapa"
      : "Tem site, mas pode querer landing page ou marketing",
    lat,
    lng,
  };
}

function empresaDoOsm(el, cidade) {
  const tags = el.tags || {};
  const nome = tags.name || tags.operator || "";
  const fone = telefonesDe(tags);
  if (!nome || nome.length < 3 || !fone) return null;
  const site = tags.website || tags["contact:website"] || "";
  return montarEmpresa({
    id: `osm-${el.type || "n"}-${el.id}`,
    nome,
    fone,
    cidade,
    bairro: tags["addr:suburb"] || tags["addr:neighbourhood"] || "",
    endereco: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"] || cidade]
      .filter(Boolean)
      .join(", "),
    categoria: tags.shop || tags.amenity || tags.office || "empresa",
    site,
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
  { lat: -23.5505, lng: -46.6333, raio: 8000 },
  { lat: -23.5614, lng: -46.6558, raio: 5500 },
  { lat: -23.5679, lng: -46.6486, raio: 4500 },
  { lat: -23.5617, lng: -46.6827, raio: 5000 },
];

function queryOverpass(lat, lng, segmento, raio) {
  const filtros = FILTROS_OSM[segmento] || FILTROS_OSM.todos;
  const compacto =
    segmento === "todos"
      ? [
          `nwr["shop"]["phone"](around:${raio},${lat},${lng});`,
          `nwr["shop"]["contact:phone"](around:${raio},${lat},${lng});`,
          `nwr["office"]["phone"](around:${raio},${lat},${lng});`,
          `nwr["office"]["contact:phone"](around:${raio},${lat},${lng});`,
          `nwr["amenity"~"restaurant|fast_food|cafe|dentist|clinic|pharmacy|doctors"]["phone"](around:${raio},${lat},${lng});`,
          `nwr["amenity"~"restaurant|fast_food|cafe|dentist|clinic|pharmacy|doctors"]["contact:phone"](around:${raio},${lat},${lng});`,
          `nwr["contact:whatsapp"](around:${raio},${lat},${lng});`,
          `nwr["shop"]["contact:mobile"](around:${raio},${lat},${lng});`,
        ]
      : filtros.flatMap((f) => [
          `nwr${f}["phone"](around:${raio},${lat},${lng});`,
          `nwr${f}["contact:phone"](around:${raio},${lat},${lng});`,
          `nwr${f}["contact:whatsapp"](around:${raio},${lat},${lng});`,
          `nwr${f}["contact:mobile"](around:${raio},${lat},${lng});`,
        ]);
  return `[out:json][timeout:25];\n(\n${compacto.join("\n")}\n);\nout tags center 80;`;
}

async function overpass(query) {
  let ultimo = new Error("Mapa ocupado");
  for (const url of OVERPASS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 28000);
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
      ultimo = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw ultimo;
}

export async function vasculharEmpresas({
  cidade = "São Paulo",
  segmento = "todos",
  limite = 10,
  excluir = [],
  pagina = 0,
} = {}) {
  const lugar = textoSeguro(cidade, 80) || "São Paulo";
  const max = Math.min(Math.max(Number(limite) || 10, 1), 10);
  const geo = await geocodificarCidade(lugar);
  const chaveCidade = String(lugar)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const ehSP = chaveCidade === "sao paulo";
  let elementos = [];
  try {
    elementos = await overpass(
      queryOverpass(geo.lat, geo.lng, segmento, Math.min(geo.raio || 8000, 8000)),
    );
  } catch (error) {
    if (!ehSP) throw error;
  }
  if (elementos.length < 15 && ehSP) {
    try {
      const ponto = SP_PONTOS[1];
      const extra = await overpass(queryOverpass(ponto.lat, ponto.lng, segmento, ponto.raio));
      elementos = elementos.concat(extra);
    } catch (error) {
      if (!elementos.length) throw error;
    }
  }
  if (!elementos.length) throw new Error("Mapa ocupado, tenta de novo em um minuto");
  const bloqueados = new Set(
    (Array.isArray(excluir) ? excluir : []).map((n) => String(n || "").replace(/\D/g, "")).filter(Boolean),
  );

  const semSite = [];
  const comSite = [];
  const vistos = new Set();

  for (const el of elementos) {
    const item = empresaDoOsm(el, lugar);
    if (!item?.nome || !item.whatsapp) continue;
    const fone = String(item.whatsapp).replace(/\D/g, "");
    if (bloqueados.has(fone) || bloqueados.has(`55${fone}`)) continue;
    const chave = `${item.nome.toLowerCase()}|${fone}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    if (item.precisaSite) semSite.push(item);
    else comSite.push(item);
  }

  const pulo = Math.max(0, Number(pagina) || 0) * max;
  const fila = [...semSite, ...comSite].slice(pulo, pulo + max);
  return {
    cidade: lugar,
    total: fila.length,
    comWhatsapp: fila.length,
    pagina: Number(pagina) || 0,
    empresas: fila,
  };
}
