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
  loja: ['["shop"="clothes"]', '["shop"="yes"]', '["shop"="shoes"]', '["shop"="florist"]'],
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

const SHOPS_PEQUENOS =
  "hairdresser|beauty|bakery|convenience|clothes|florist|laundry|tailor|confectionery|greengrocer|butcher|pet|copyshop|stationery|shoes|gift|jewelry|optician|tobacco|yes";

const REDES_GRANDES =
  /mcdonald|burger king|subway|starbucks|habib|outback|ragazzo|\bbob'?s\b|giraffas|\bkfc\b|pizza hut|dominos|casa bahia|magazine luiza|magalu|americanas|carrefour|assai|assaí|extra hipermercado|atacad[aã]o|sam'?s club|droga raia|drogasil|pague menos|unimed|\bamil\b|bradesco|\bita[uú]\b|santander|nubank|caixa econ[oô]mica|banco do brasil|\bhonda\b|\btoyota\b|volkswagen|\bfiat\b|chevrolet|renault|hyundai|\byamaha\b|\bvivo\b|\bclaro\b|\btim\b|ifood|rappi|\buber\b|mercado livre|mercadolivre|grupo gasol|posto ipiranga|shell select|petrobras/i;

/** 18/09/2026: começa nas pequenas e sobe sozinho. */
const INICIO_NIVEL = Date.parse("2026-09-18T00:00:00-03:00");

const NIVEIS = [
  { nivel: 1, ateDia: 10, label: "Pequenas empresas", detalhe: "Salão, padaria, loja, pet, café. Sem rede grande e de preferência sem site." },
  { nivel: 2, ateDia: 25, label: "Pequenas e médias", detalhe: "Entra oficina, restaurante, dentista e farmácia independente." },
  { nivel: 3, ateDia: 50, label: "Médias", detalhe: "Entra clínica, imobiliária e empresa que já tem site." },
  { nivel: 4, ateDia: Infinity, label: "Porte maior", detalhe: "Escritório, advocacia e o restante, ainda sem banco ou rede gigante." },
];

export function nivelProspeccao(agora = Date.now()) {
  const dias = Math.max(0, Math.floor((agora - INICIO_NIVEL) / 86400000));
  const atual = NIVEIS.find((n) => dias < n.ateDia) || NIVEIS[NIVEIS.length - 1];
  const proximo = NIVEIS.find((n) => n.nivel === atual.nivel + 1);
  return {
    nivel: atual.nivel,
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
  const texto = `${nome} ${tags.brand || ""} ${tags.operator || ""}`;
  if (tags.brand || REDES_GRANDES.test(texto)) return 5;
  if (/supermarket|department_store|mall|wholesale/.test(shop)) return 5;
  if (/bank|hospital|university|college|fuel/.test(amenity)) return 5;
  if (/lawyer|accountant|company|insurance|tax_advisor/.test(office)) return 4;
  if (office === "estate_agent") return 3;
  if (/clinic|doctors/.test(amenity)) return 3;
  if (/dentist|pharmacy|restaurant|veterinary/.test(amenity) || /car_repair|tyres/.test(shop)) return 2;
  if (!siteFraco(site)) return 2;
  return 1;
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

function montarEmpresa({ nome, fone, cidade, bairro, endereco, categoria, site, id, lat, lng, porte }) {
  const local = fone.startsWith("55") && fone.length >= 12 ? fone.slice(2) : fone;
  const semSite = siteFraco(site);
  const motivoPequena = porte <= 1
    ? semSite
      ? "Pequena, sem site próprio"
      : "Pequena, só com rede social"
    : porte === 2
      ? "Pequena ou média local"
      : porte === 3
        ? "Média, pode ter site"
        : "Porte maior, ainda independente";
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
    porte,
    motivo: motivoPequena,
    lat,
    lng,
  };
}

function empresaDoOsm(el, cidade) {
  const tags = el.tags || {};
  const nome = tags.name || tags.operator || "";
  const fone = telefonesDe(tags);
  if (!nome || nome.length < 3 || !fone) return null;
  if (/^0800|^0300/.test(fone)) return null;
  const site = tags.website || tags["contact:website"] || "";
  const porte = porteDe(tags, nome, site);
  if (porte >= 5) return null;
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
  { lat: -23.5505, lng: -46.6333, raio: 8000 },
  { lat: -23.5614, lng: -46.6558, raio: 5500 },
  { lat: -23.5679, lng: -46.6486, raio: 4500 },
  { lat: -23.5617, lng: -46.6827, raio: 5000 },
];

function queryOverpass(lat, lng, segmento, raio, nivel = 1) {
  const filtros = FILTROS_OSM[segmento] || FILTROS_OSM.todos;
  let compacto;
  if (segmento === "todos") {
    compacto = [
      `nwr["shop"~"${SHOPS_PEQUENOS}"]["phone"](around:${raio},${lat},${lng});`,
      `nwr["shop"~"${SHOPS_PEQUENOS}"]["contact:phone"](around:${raio},${lat},${lng});`,
      `nwr["amenity"~"cafe|fast_food"]["phone"](around:${raio},${lat},${lng});`,
      `nwr["shop"]["contact:whatsapp"](around:${raio},${lat},${lng});`,
    ];
    if (nivel >= 2) {
      compacto.push(
        `nwr["shop"~"car_repair|tyres"]["phone"](around:${raio},${lat},${lng});`,
        `nwr["amenity"~"restaurant|dentist|pharmacy|veterinary"]["phone"](around:${raio},${lat},${lng});`,
      );
    }
    if (nivel >= 3) {
      compacto.push(
        `nwr["amenity"~"clinic|doctors"]["phone"](around:${raio},${lat},${lng});`,
        `nwr["office"="estate_agent"]["phone"](around:${raio},${lat},${lng});`,
        `nwr["shop"]["contact:phone"](around:${raio},${lat},${lng});`,
      );
    }
    if (nivel >= 4) {
      compacto.push(
        `nwr["office"]["phone"](around:${raio},${lat},${lng});`,
        `nwr["office"]["contact:phone"](around:${raio},${lat},${lng});`,
      );
    }
  } else {
    compacto = filtros.flatMap((f) => [
      `nwr${f}["phone"](around:${raio},${lat},${lng});`,
      `nwr${f}["contact:phone"](around:${raio},${lat},${lng});`,
      `nwr${f}["contact:whatsapp"](around:${raio},${lat},${lng});`,
      `nwr${f}["contact:mobile"](around:${raio},${lat},${lng});`,
    ]);
  }
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
  const etapa = nivelProspeccao();
  const porteMax = segmento === "todos" ? etapa.nivel : Math.max(etapa.nivel, 3);
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
      queryOverpass(geo.lat, geo.lng, segmento, Math.min(geo.raio || 8000, 8000), etapa.nivel),
    );
  } catch (error) {
    if (!ehSP) throw error;
  }
  if (elementos.length < 15 && ehSP) {
    try {
      const ponto = SP_PONTOS[1];
      const extra = await overpass(
        queryOverpass(ponto.lat, ponto.lng, segmento, ponto.raio, etapa.nivel),
      );
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
    if (item.porte > porteMax) continue;
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
    nivel: etapa,
    empresas: fila,
  };
}
