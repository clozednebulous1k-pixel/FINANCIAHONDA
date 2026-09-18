import { celularWhatsapp, soDigitos, textoSeguro } from "./security";

export const SEGMENTOS = [
  { id: "todos", label: "Todos (sem site)" },
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

const TERMOS = {
  salao: ["cabeleireiro", "salao de beleza", "estetica"],
  oficina: ["oficina mecanica", "auto center"],
  clinica: ["clinica medica", "consultorio"],
  dentista: ["dentista", "clinica odontologica"],
  imobiliaria: ["imobiliaria"],
  advocacia: ["advocacia", "contador"],
  restaurante: ["restaurante", "lanchonete"],
  pet: ["pet shop", "clinica veterinaria"],
  padaria: ["padaria", "mercado"],
  loja: ["loja de roupas", "loja"],
  todos: ["cabeleireiro", "oficina mecanica", "dentista", "imobiliaria", "padaria", "pet shop"],
};

const FILTROS_OSM = {
  salao: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  oficina: ['["shop"="car_repair"]'],
  clinica: ['["amenity"="clinic"]', '["amenity"="doctors"]'],
  dentista: ['["amenity"="dentist"]'],
  imobiliaria: ['["office"="estate_agent"]'],
  advocacia: ['["office"="lawyer"]', '["office"="accountant"]'],
  restaurante: ['["amenity"="restaurant"]'],
  pet: ['["shop"="pet"]'],
  padaria: ['["shop"="bakery"]'],
  loja: ['["shop"="clothes"]'],
  todos: [
    '["shop"="hairdresser"]',
    '["shop"="car_repair"]',
    '["amenity"="dentist"]',
    '["office"="estate_agent"]',
    '["shop"="bakery"]',
    '["shop"="pet"]',
  ],
};

const UA = "AgenciaCRM/1.0 (prospeccao de empresas locais)";

function siteFraco(url) {
  const u = String(url || "").trim().toLowerCase();
  if (!u) return true;
  return /facebook\.com|instagram\.com|wa\.me|api\.whatsapp|linktr\.ee|bit\.ly|tiktok\.com/.test(u);
}

function telefoneDe(fonte) {
  const bruto =
    fonte.phone ||
    fonte.mobile ||
    fonte["contact:phone"] ||
    fonte["contact:mobile"] ||
    fonte.whatsapp ||
    fonte["contact:whatsapp"] ||
    "";
  const digits = soDigitos(bruto, 13);
  if (digits.length < 10) return "";
  return digits;
}

function precisaSoftware(texto) {
  return /imobili|advoc|contab|clinic|dentist|oficina|salao|cabeleir|estetic/.test(String(texto || "").toLowerCase());
}

function montarEmpresa({ nome, fone, cidade, bairro, endereco, categoria, site, id, lat, lng, motivo }) {
  const local = fone.startsWith("55") && fone.length >= 12 ? fone.slice(2) : fone;
  return {
    id,
    nome: textoSeguro(nome, 120),
    whatsapp: local,
    whatsappOk: Boolean(celularWhatsapp(local) || celularWhatsapp(fone)),
    cidade: textoSeguro(cidade, 80),
    bairro: textoSeguro(bairro, 80),
    endereco: textoSeguro(endereco, 160),
    categoria: textoSeguro(categoria, 40),
    site: textoSeguro(site, 200),
    precisaSite: true,
    precisaSoftware: precisaSoftware(`${categoria} ${nome}`),
    motivo: textoSeguro(motivo, 120) || (site ? "Só tem rede social, sem site próprio" : "Sem site cadastrado no mapa"),
    lat,
    lng,
  };
}

async function nominatimBusca(termo, cidade) {
  const q = encodeURIComponent(`${termo} ${cidade} Brasil`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=12&addressdetails=1&extratags=1&countrycodes=br&q=${q}`,
    { headers: { Accept: "application/json", "User-Agent": UA }, cache: "no-store" },
  );
  if (!res.ok) return [];
  const lista = await res.json();
  return Array.isArray(lista) ? lista : [];
}

function empresaDoNominatim(hit, cidade) {
  const tags = hit.extratags || {};
  const nome = hit.name || hit.display_name?.split(",")[0] || "";
  const fone = telefoneDe(tags);
  if (!nome || nome.length < 3 || !fone) return null;
  const site = tags.website || tags["contact:website"] || tags.url || "";
  if (!siteFraco(site)) return null;
  const addr = hit.address || {};
  return montarEmpresa({
    id: `nom-${hit.osm_type || "n"}-${hit.osm_id}`,
    nome,
    fone,
    cidade,
    bairro: addr.suburb || addr.neighbourhood || "",
    endereco: [addr.road, addr.house_number, addr.city || cidade].filter(Boolean).join(", "),
    categoria: hit.type || hit.class || "empresa",
    site,
    lat: Number(hit.lat) || 0,
    lng: Number(hit.lon) || 0,
    motivo: site ? "Só tem rede social, sem site próprio" : "Sem site no cadastro do mapa",
  });
}

async function geocodificarCidade(cidade) {
  const q = encodeURIComponent(`${textoSeguro(cidade, 80)}, Brasil`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${q}`,
    { headers: { Accept: "application/json", "User-Agent": UA }, cache: "no-store" },
  );
  if (!res.ok) throw new Error("Não achei essa cidade");
  const lista = await res.json();
  const hit = Array.isArray(lista) ? lista[0] : null;
  if (!hit) throw new Error("Cidade não encontrada");
  return { lat: Number(hit.lat), lng: Number(hit.lon), nome: hit.display_name || cidade };
}

async function overpassRapido(lat, lng, segmento) {
  const filtros = FILTROS_OSM[segmento] || FILTROS_OSM.todos;
  const blocos = filtros.map((f) => `nwr${f}(around:6000,${lat},${lng});`).join("\n");
  const query = `[out:json][timeout:8];\n(\n${blocos}\n);\nout tags center;`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch("https://overpass.kumi.systems/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": UA,
      },
      body: `data=${encodeURIComponent(query)}`,
      cache: "no-store",
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok || !text.startsWith("{")) return [];
    const data = JSON.parse(text);
    return Array.isArray(data.elements) ? data.elements : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function empresaDoOsm(el, cidade) {
  const tags = el.tags || {};
  const nome = tags.name || tags.operator || "";
  const fone = telefoneDe(tags);
  if (!nome || nome.length < 3 || !fone) return null;
  const site = tags.website || tags["contact:website"] || "";
  if (!siteFraco(site)) return null;
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
    motivo: site ? "Só tem rede social, sem site próprio" : "Sem site cadastrado no mapa",
  });
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
  const termos = TERMOS[segmento] || TERMOS.todos;
  const termo = termos[Math.abs(Number(pagina) || 0) % termos.length];
  const bloqueados = new Set(
    (Array.isArray(excluir) ? excluir : []).map((n) => String(n || "").replace(/\D/g, "")).filter(Boolean),
  );
  const vistos = new Set();
  const empresas = [];

  function incluir(item) {
    if (!item?.nome || !item.whatsapp) return;
    const fone = String(item.whatsapp).replace(/\D/g, "");
    if (bloqueados.has(fone) || bloqueados.has(`55${fone}`)) return;
    if (!item.whatsappOk) return;
    const chave = `${item.nome.toLowerCase()}|${fone}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    empresas.push(item);
  }

  const hits = await nominatimBusca(termo, lugar);
  for (const hit of hits) {
    incluir(empresaDoNominatim(hit, lugar));
    if (empresas.length >= max) break;
  }

  if (empresas.length < max) {
    try {
      const geo = await geocodificarCidade(lugar);
      const osm = await overpassRapido(geo.lat, geo.lng, segmento);
      for (const el of osm) {
        incluir(empresaDoOsm(el, lugar));
        if (empresas.length >= max) break;
      }
    } catch {
      // fica com o que o mapa já deu
    }
  }

  empresas.sort((a, b) => a.nome.localeCompare(b.nome));
  const lista = empresas.slice(0, max);
  return {
    cidade: lugar,
    total: lista.length,
    comWhatsapp: lista.length,
    pagina: Number(pagina) || 0,
    empresas: lista,
  };
}
