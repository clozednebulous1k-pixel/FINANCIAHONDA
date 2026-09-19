import { celularWhatsapp, chaveEmpresa, soDigitos, textoSeguro, validarWhatsapp } from "./security";

export const SEGMENTOS = [
  { id: "foco", label: "SP · arquitetura / resto / roupas" },
  { id: "arquitetura", label: "Arquitetura" },
  { id: "restaurante", label: "Restaurante / food" },
  { id: "roupas", label: "Loja de roupas" },
  { id: "todos", label: "Foco SP (padrão)" },
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

/** Nichos que mais precisam de site/atendimento: arquitetura, restaurante, moda. */
const FILTROS_OSM = {
  arquitetura: ['["office"="architect"]', '["craft"="architect"]'],
  restaurante: ['["amenity"="restaurant"]', '["amenity"="fast_food"]', '["amenity"="cafe"]'],
  roupas: [
    '["shop"="clothes"]',
    '["shop"="shoes"]',
    '["shop"="boutique"]',
    '["shop"="tailor"]',
    '["shop"="fabric"]',
    '["shop"="fashion_accessories"]',
  ],
  foco: [
    '["office"="architect"]',
    '["craft"="architect"]',
    '["amenity"="restaurant"]',
    '["amenity"="cafe"]',
    '["amenity"="fast_food"]',
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
  loja: ['["shop"="clothes"]', '["shop"="shoes"]', '["shop"="boutique"]', '["shop"="florist"]'],
  todos: [
    '["office"="architect"]',
    '["craft"="architect"]',
    '["amenity"="restaurant"]',
    '["amenity"="cafe"]',
    '["amenity"="fast_food"]',
    '["shop"="clothes"]',
    '["shop"="shoes"]',
    '["shop"="boutique"]',
    '["shop"="tailor"]',
  ],
};

const SEGMENTOS_FOCO = new Set(["foco", "todos", "arquitetura", "restaurante", "roupas"]);

const REDES_GRANDES =
  /mcdonald|burger king|subway|starbucks|habib|outback|ragazzo|\bbob'?s\b|giraffas|\bkfc\b|pizza hut|dominos|casa bahia|magazine luiza|magalu|americanas|carrefour|assai|assaí|extra hipermercado|atacad[aã]o|sam'?s club|droga raia|drogasil|pague menos|unimed|\bamil\b|bradesco|\bita[uú]\b|santander|nubank|caixa econ[oô]mica|banco do brasil|\bhonda\b|\btoyota\b|volkswagen|\bfiat\b|chevrolet|renault|hyundai|\byamaha\b|\bvivo\b|\bclaro\b|\btim\b|ifood|rappi|\buber\b|mercado livre|mercadolivre|grupo gasol|posto ipiranga|shell select|petrobras|\bzara\b|renner|c\s*&\s*a|\bcea\b|riachuelo|marisa|hering|track\s*&?\s*field|nike\s*store|adidas\s*store|centauro|outback|madero|coco bambu|spoleto|china in box/i;

/** 18/09/2026: começa nas pequenas e sobe sozinho. */
const INICIO_NIVEL = Date.parse("2026-09-18T00:00:00-03:00");

const NIVEIS = [
  { nivel: 1, ateDia: 10, label: "SP · precisa de ajuda", detalhe: "Arquitetura, restaurante e loja de roupas sem site forte." },
  { nivel: 2, ateDia: 25, label: "SP · nicho local", detalhe: "Mesmo foco, incluindo quem já tem Instagram/site fraco." },
  { nivel: 3, ateDia: 50, label: "SP · médias do nicho", detalhe: "Escritórios e casas um pouco maiores, ainda independentes." },
  { nivel: 4, ateDia: Infinity, label: "SP · porte maior do nicho", detalhe: "Continua só no foco (arquitetura / food / moda)." },
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
  const craft = String(tags.craft || "");
  const texto = `${nome} ${tags.brand || ""} ${tags.operator || ""}`;
  if (tags.brand || REDES_GRANDES.test(texto)) return 5;
  if (/supermarket|department_store|mall|wholesale/.test(shop)) return 5;
  if (/bank|hospital|university|college|fuel/.test(amenity)) return 5;
  // Arquitetura / moda / food locais: prioridade alta (porte baixo)
  if (office === "architect" || craft === "architect") return siteFraco(site) ? 1 : 2;
  if (/clothes|shoes|boutique|tailor|fabric|fashion/.test(shop)) return siteFraco(site) ? 1 : 2;
  if (/restaurant|cafe|fast_food/.test(amenity)) return siteFraco(site) ? 1 : 2;
  if (/lawyer|accountant|company|insurance|tax_advisor/.test(office)) return 4;
  if (office === "estate_agent") return 3;
  if (/clinic|doctors/.test(amenity)) return 3;
  if (/dentist|pharmacy|veterinary/.test(amenity) || /car_repair|tyres/.test(shop)) return 2;
  if (!siteFraco(site)) return 2;
  return 1;
}

/** Empresa encaixa no foco pedido: arquitetura, restaurante ou loja de roupas. */
function encaixaNoFoco(tags, nome, segmento) {
  const shop = String(tags.shop || "");
  const amenity = String(tags.amenity || "");
  const office = String(tags.office || "");
  const craft = String(tags.craft || "");
  const n = String(nome || "");

  const arquit =
    office === "architect" ||
    craft === "architect" ||
    /arquitet|studio\s+de\s+arquit|escrit[oó]rio\s+de\s+arquit/i.test(n);
  const resto =
    /restaurant|cafe|fast_food/.test(amenity) ||
    /restaurante|pizzaria|hamburgu|lanchonete|cafeteria|bar\b|boteco|churrasc|padaria\s+e\s+caf/i.test(n);
  const moda =
    /clothes|shoes|boutique|tailor|fabric|fashion/.test(shop) ||
    /moda|roupas|boutique|confec|vestu[aá]rio|cal[cç]ados|brech[oó]/i.test(n);

  if (segmento === "arquitetura") return arquit;
  if (segmento === "restaurante") return resto;
  if (segmento === "roupas") return moda;
  // foco / todos
  return arquit || resto || moda;
}

function motivoFoco(tags, nome, site) {
  const shop = String(tags.shop || "");
  const amenity = String(tags.amenity || "");
  const office = String(tags.office || "");
  const craft = String(tags.craft || "");
  const semSite = siteFraco(site);
  let nicho = "Comércio local";
  if (office === "architect" || craft === "architect" || /arquitet/i.test(nome)) nicho = "Arquitetura";
  else if (/restaurant|cafe|fast_food/.test(amenity) || /restaurante|pizzaria|lanchonete/i.test(nome)) {
    nicho = "Restaurante";
  } else if (/clothes|shoes|boutique|tailor|fabric|fashion/.test(shop) || /moda|roupas|boutique/i.test(nome)) {
    nicho = "Loja de roupas";
  }
  return semSite ? `${nicho} · SP · precisa de ajuda` : `${nicho} · SP · nicho local`;
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

/** Extrai celular de link wa.me / api.whatsapp.com. */
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

/**
 * Só números com sinal de WhatsApp no mapa:
 * contact:whatsapp, whatsapp, link wa.me, mobile, ou celular em phone.
 */
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
  // phone genérico só se for celular (o nicho já filtra arquitetura/resto/roupas)
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

function montarEmpresa({ nome, fone, cidade, bairro, endereco, categoria, site, id, lat, lng, porte, motivo }) {
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
    motivo: motivo || (semSite ? "SP · precisa de ajuda" : "SP · nicho local"),
    lat,
    lng,
  };
}

function empresaDoOsm(el, cidade, segmento = "foco") {
  const tags = el.tags || {};
  const nome = tags.name || tags.operator || "";
  const { fone, fonteWa } = telefonesDe(tags);
  if (!nome || nome.length < 3 || !fone || !fonteWa) return null;
  if (/^0800|^0300/.test(fone)) return null;
  if (SEGMENTOS_FOCO.has(segmento) && !encaixaNoFoco(tags, nome, segmento)) return null;
  const site = tags.website || tags["contact:website"] || "";
  const porte = porteDe(tags, nome, site);
  if (porte >= 5) return null;
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
    motivo: motivoFoco(tags, nome, site),
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
  // Centro / República / Sé
  { lat: -23.5505, lng: -46.6333, raio: 7500 },
  // Jardins / Paulista
  { lat: -23.5614, lng: -46.6558, raio: 6000 },
  // Liberdade / Bixiga
  { lat: -23.5679, lng: -46.6486, raio: 5000 },
  // Pinheiros / Vila Madalena
  { lat: -23.5617, lng: -46.6827, raio: 5500 },
  // Bom Retiro / Santa Cecília (moda)
  { lat: -23.5329, lng: -46.6395, raio: 5500 },
  // Vila Mariana / Paraíso
  { lat: -23.5890, lng: -46.6380, raio: 6000 },
  // Tatuapé / Zona Leste
  { lat: -23.5400, lng: -46.5750, raio: 7000 },
  // Santana / Zona Norte
  { lat: -23.5080, lng: -46.6250, raio: 6500 },
  // Santo Amaro / Sul
  { lat: -23.6220, lng: -46.6650, raio: 7000 },
  // Lapa / Oeste
  { lat: -23.5280, lng: -46.7310, raio: 6500 },
  // Moema / Ibirapuera
  { lat: -23.6015, lng: -46.6650, raio: 5500 },
  // Brás / Belenzinho (roupas)
  { lat: -23.5445, lng: -46.6165, raio: 5500 },
  // Itaim / Faria Lima (arquitetura)
  { lat: -23.5865, lng: -46.6820, raio: 5000 },
  // Brooklin / Morumbi comercial
  { lat: -23.6105, lng: -46.6950, raio: 5500 },
];

function queryOverpass(lat, lng, segmento, raio) {
  const seg = segmento === "todos" ? "foco" : segmento;
  const filtros = FILTROS_OSM[seg] || FILTROS_OSM.foco;
  // Só o nicho + sinal de WhatsApp (sem varrer qualquer comércio)
  const compacto = filtros.flatMap((f) => [
    `nwr${f}["contact:whatsapp"](around:${raio},${lat},${lng});`,
    `nwr${f}["whatsapp"](around:${raio},${lat},${lng});`,
    `nwr${f}["contact:mobile"](around:${raio},${lat},${lng});`,
    `nwr${f}["website"~"wa\\.me|api\\.whatsapp|whatsapp\\.com/send"](around:${raio},${lat},${lng});`,
    `nwr${f}["contact:website"~"wa\\.me|api\\.whatsapp"](around:${raio},${lat},${lng});`,
    // celular comum no OSM (ainda filtramos nicho + móvel no parse)
    `nwr${f}["phone"](around:${raio},${lat},${lng});`,
    `nwr${f}["contact:phone"](around:${raio},${lat},${lng});`,
  ]);
  return `[out:json][timeout:25];\n(\n${compacto.join("\n")}\n);\nout tags center 200;`;
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
  segmento = "foco",
  limite = 10,
  excluir = [],
  excluirNomes = [],
  excluirOsm = [],
} = {}) {
  let seg = SEGMENTOS.some((s) => s.id === segmento) ? segmento : "foco";
  if (seg === "todos") seg = "foco";
  // Foco SP: arquitetura, restaurante e lojas de roupa
  let lugar = textoSeguro(cidade, 80) || "São Paulo";
  if (SEGMENTOS_FOCO.has(seg)) lugar = "São Paulo";

  const max = Math.min(Math.max(Number(limite) || 10, 1), 10);
  const etapa = nivelProspeccao();
  const portePreferido = SEGMENTOS_FOCO.has(seg) ? Math.max(etapa.nivel, 2) : Math.max(etapa.nivel, 3);
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
  const offset = Math.floor(Date.now() / 20000) % pontos.length;
  const rota = [...pontos.slice(offset), ...pontos.slice(0, offset)];
  const bloqueados = new Set(
    (Array.isArray(excluir) ? excluir : []).map((n) => String(n || "").replace(/\D/g, "")).filter(Boolean),
  );
  const nomesBloqueados = new Set(
    (Array.isArray(excluirNomes) ? excluirNomes : []).map((n) => String(n || "").trim()).filter(Boolean),
  );
  const osmBloqueados = new Set(
    (Array.isArray(excluirOsm) ? excluirOsm : []).map((n) => String(n || "").trim()).filter(Boolean),
  );

  const candidatos = [];
  const vistos = new Set();
  const osmVistos = new Set();
  let mapaOk = false;
  let ultimaFalha = new Error("Mapa ocupado, tenta de novo em um minuto");
  const maxConsultas = ehSP ? 8 : 3;

  function absorver(elementos) {
    for (const el of elementos) {
      const oid = `${el.type || "n"}-${el.id}`;
      if (osmVistos.has(oid)) continue;
      osmVistos.add(oid);
      const item = empresaDoOsm(el, lugar, seg);
      if (!item?.nome || !item.whatsappOk) continue;
      if (item.porte >= 5) continue;
      const fone = String(item.whatsapp).replace(/\D/g, "");
      if (bloqueados.has(fone) || bloqueados.has(`55${fone}`)) continue;
      if (item.id && osmBloqueados.has(item.id)) continue;
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

  if (!mapaOk) throw ultimaFalha;

  // Quem precisa de ajuda (sem site) sobe na fila
  candidatos.sort(
    (a, b) =>
      (Number(b.precisaSite) - Number(a.precisaSite)) ||
      (a.porte - b.porte) ||
      String(a.categoria).localeCompare(String(b.categoria)),
  );
  const preferidas = candidatos.filter((item) => item.porte <= portePreferido);
  const fila = (preferidas.length >= Math.min(max, 4) ? preferidas : candidatos).slice(0, max);
  return {
    cidade: lugar,
    segmento: seg,
    total: fila.length,
    comWhatsapp: fila.length,
    pagina: 0,
    nivel: etapa,
    empresas: fila,
  };
}
