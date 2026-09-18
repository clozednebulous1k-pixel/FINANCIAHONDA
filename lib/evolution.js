const DEFAULTS = {
  url: process.env.EVOLUTION_API_URL || "http://127.0.0.1:8080",
  key: process.env.EVOLUTION_API_KEY || "",
  instance: process.env.EVOLUTION_INSTANCE || "honda-crm",
};

function formatoBr(numero) {
  const d = String(numero || "").replace(/\D/g, "");
  const local = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
  if (local.length === 11) return `${local.slice(0, 2)} ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `${local.slice(0, 2)} ${local.slice(2, 6)}-${local.slice(6)}`;
  return local || "número da agência";
}

export function contaWhatsapp(conta = "honda") {
  if (conta === "afiliados") {
    return {
      id: "afiliados",
      instance: process.env.EVOLUTION_INSTANCE_AFILIADOS || "afiliados-crm",
      numero: process.env.EVOLUTION_NUMBER_AFILIADOS || "5511952025568",
      titulo: "WhatsApp Afiliados",
      formato: "11 95202-5568",
    };
  }
  if (conta === "agencia") {
    const numero = process.env.EVOLUTION_NUMBER_AGENCIA || "";
    return {
      id: "agencia",
      instance: process.env.EVOLUTION_INSTANCE_AGENCIA || "agencia-crm",
      numero,
      titulo: "WhatsApp Agência",
      formato: formatoBr(numero),
    };
  }
  return {
    id: "honda",
    instance: process.env.EVOLUTION_INSTANCE || DEFAULTS.instance,
    numero: process.env.EVOLUTION_NUMBER || "5511947539917",
    titulo: "WhatsApp Business",
    formato: "11 94753-9917",
  };
}

function baseUrl() {
  return String(DEFAULTS.url || "").replace(/\/$/, "");
}

export function evolutionConfigurado() {
  return Boolean(baseUrl() && DEFAULTS.key && DEFAULTS.instance);
}

export function nomeInstancia(conta = "honda") {
  return contaWhatsapp(conta).instance;
}

async function evoFetch(path, { method = "GET", body } = {}) {
  if (!evolutionConfigurado()) {
    throw new Error("Evolution API não configurada");
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      apikey: DEFAULTS.key,
      "Content-Type": "application/json",
      // localtunnel / alguns túneis pedem isso pra não bloquear a API
      "bypass-tunnel-reminder": "true",
      "User-Agent": "HondaCRM/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || data?.raw || `HTTP ${res.status}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function healthCheck() {
  try {
    const res = await fetch(`${baseUrl()}`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listarInstancias() {
  return evoFetch("/instance/fetchInstances");
}

export async function estadoConexao(conta = "honda") {
  return evoFetch(`/instance/connectionState/${nomeInstancia(conta)}`);
}

export async function criarInstancia(conta = "honda") {
  const cfg = contaWhatsapp(conta);
  const body = {
    instanceName: cfg.instance,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  };
  if (cfg.numero) body.number = cfg.numero;
  return evoFetch("/instance/create", {
    method: "POST",
    body,
  });
}

export async function conectarInstancia(conta = "honda") {
  return evoFetch(`/instance/connect/${nomeInstancia(conta)}`);
}

export async function garantirInstancia(conta = "honda") {
  try {
    const estado = await estadoConexao(conta);
    return { criada: false, estado };
  } catch (error) {
    if (error.status === 404) {
      const criada = await criarInstancia(conta);
      return { criada: true, estado: criada };
    }
    throw error;
  }
}

export async function obterQr(conta = "honda") {
  await garantirInstancia(conta);
  try {
    const estado = await estadoConexao(conta);
    const state = estado?.instance?.state || estado?.state || "";
    if (state === "open") {
      return { connected: true, state, qrcode: null };
    }
  } catch {
    // segue para connect
  }
  const data = await conectarInstancia(conta);
  const base64 =
    data?.base64 ||
    data?.qrcode?.base64 ||
    data?.qrcode?.code ||
    null;
  return {
    connected: false,
    state: data?.instance?.state || "connecting",
    qrcode: base64,
    raw: data,
  };
}

export async function enviarTexto(numero, texto, conta = "honda") {
  return evoFetch(`/message/sendText/${nomeInstancia(conta)}`, {
    method: "POST",
    body: {
      number: String(numero).replace(/\D/g, ""),
      text: String(texto || "").slice(0, 4000),
      delay: 1200 + Math.floor(Math.random() * 1800),
    },
  });
}

function destinoWhatsapp(valor) {
  const bruto = String(valor || "").trim();
  if (bruto.includes("@g.us")) return bruto;
  return bruto.replace(/\D/g, "");
}

export async function enviarTextoDestino(destino, texto, conta = "honda") {
  return evoFetch(`/message/sendText/${nomeInstancia(conta)}`, {
    method: "POST",
    body: {
      number: destinoWhatsapp(destino),
      text: String(texto || "").slice(0, 4000),
      delay: 800 + Math.floor(Math.random() * 1400),
    },
  });
}

export async function enviarImagemDestino(destino, urlImagem, caption, conta = "honda") {
  const midia = await prepararMidiaImagem(urlImagem);
  const base = {
    number: destinoWhatsapp(destino),
    mediatype: "image",
    mimetype: midia.mimetype,
    fileName: midia.fileName,
    caption: String(caption || "🔥").slice(0, 900),
    delay: 600 + Math.floor(Math.random() * 1000),
  };
  const payloads = [];
  if (midia.base64) {
    payloads.push({ ...base, media: `data:${midia.mimetype};base64,${midia.base64}` });
    payloads.push({ ...base, media: midia.base64 });
  }
  if (midia.url) payloads.push({ ...base, media: midia.url });
  let ultimo = new Error("imagem recusada");
  for (const body of payloads) {
    try {
      return await evoFetch(`/message/sendMedia/${nomeInstancia(conta)}`, {
        method: "POST",
        body,
      });
    } catch (error) {
      ultimo = error;
    }
  }
  throw ultimo;
}

export async function enviarOfertaGrupo(destino, { texto, imagem }, conta = "honda") {
  const msg = String(texto || "").slice(0, 3500);
  if (!String(imagem || "").startsWith("http")) {
    await enviarTextoDestino(destino, msg, conta);
    return { foto: false };
  }
  const curta = msg.split("\n").filter(Boolean).slice(0, 5).join("\n").slice(0, 220) || "🔥";
  const tentativas = [msg.slice(0, 900) || "🔥", curta];
  for (const caption of tentativas) {
    try {
      await enviarImagemDestino(destino, imagem, caption, conta);
      if (caption.length < 80) await enviarTextoDestino(destino, msg, conta);
      return { foto: true };
    } catch {
      // tenta legenda menor
    }
  }
  try {
    await enviarImagemDestino(destino, imagem, "🔥", conta);
    await enviarTextoDestino(destino, msg, conta);
    return { foto: true };
  } catch {
    await enviarTextoDestino(destino, msg, conta);
    return { foto: false };
  }
}

function jpegUrlImagem(url) {
  let u = String(url || "")
    .replace(/&amp;/g, "&")
    .replace("http://", "https://")
    .trim()
    .split(" ")[0]
    .split("#")[0];
  if (!/^https:\/\//i.test(u)) return "";
  return u.slice(0, 500);
}

function candidatosUrlImagem(urlImagem) {
  const orig = jpegUrlImagem(urlImagem);
  if (!orig) return [];
  const oJpg = orig.replace(/-[ISYW]\.(webp|png|jpe?g)/i, "-O.jpg").replace(/\.webp(\?.*)?$/i, ".jpg");
  const oWebp = orig.replace(/-[ISYW]\.(webp|png|jpe?g)/i, "-O.webp");
  const lista = [oJpg, orig, oWebp];
  const semProto = oJpg.replace(/^https?:\/\//i, "");
  lista.push(`https://wsrv.nl/?url=${encodeURIComponent(semProto)}&output=jpg&q=80`);
  return [...new Set(lista.filter(Boolean))];
}

function tipoImagem(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return { mimetype: "image/jpeg", fileName: "achadinho.jpg" };
  if (buf[0] === 0x89 && buf[1] === 0x50) return { mimetype: "image/png", fileName: "achadinho.png" };
  if (buf[0] === 0x47 && buf[1] === 0x49) return { mimetype: "image/gif", fileName: "achadinho.gif" };
  if (buf[0] === 0x52 && buf[8] === 0x57 && buf[9] === 0x45) {
    return { mimetype: "image/webp", fileName: "achadinho.webp" };
  }
  return null;
}

async function baixarBufferImagem(url) {
  const uas = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ];
  for (const ua of uas) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "image/jpeg,image/jpg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5",
          Referer: "https://www.mercadolivre.com.br/",
          "User-Agent": ua,
        },
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1500 || buf.length > 3_500_000) continue;
      const tipo = tipoImagem(buf);
      if (!tipo) continue;
      return { ...tipo, base64: buf.toString("base64"), url };
    } catch {
      // próximo UA
    }
  }
  return null;
}

async function prepararMidiaImagem(urlImagem) {
  const urls = candidatosUrlImagem(urlImagem);
  if (!urls.length) throw new Error("imagem inválida");
  for (const alvo of urls) {
    const baixada = await baixarBufferImagem(alvo);
    if (baixada) return baixada;
  }
  return { url: urls[0], mimetype: "image/jpeg", fileName: "achadinho.jpg", base64: "" };
}

export async function listarGruposWhatsapp(conta = "honda") {
  return evoFetch(`/group/fetchAllGroups/${nomeInstancia(conta)}?getParticipants=false`);
}

export async function buscarMensagens(numero, limite = 40, conta = "honda") {
  const remoteJid = `${String(numero).replace(/\D/g, "")}@s.whatsapp.net`;
  return evoFetch(`/chat/findMessages/${nomeInstancia(conta)}`, {
    method: "POST",
    body: {
      where: { key: { remoteJid } },
      limit: Math.min(Math.max(Number(limite) || 40, 1), 100),
    },
  });
}

export async function configurarWebhook(url, conta = "honda") {
  return evoFetch(`/webhook/set/${nomeInstancia(conta)}`, {
    method: "POST",
    body: {
      webhook: {
        enabled: true,
        url,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
          "MESSAGES_UPSERT",
          "CONNECTION_UPDATE",
          "QRCODE_UPDATED",
        ],
      },
    },
  });
}

export function extrairTextoMensagem(msg) {
  const m = msg?.message || msg || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title ||
    ""
  );
}

export function normalizarMensagensEvolution(payload, meuNumero = "5511947539917") {
  const lista =
    (Array.isArray(payload?.messages?.records) && payload.messages.records) ||
    (Array.isArray(payload?.messages) && payload.messages) ||
    (Array.isArray(payload?.records) && payload.records) ||
    (Array.isArray(payload?.data?.messages?.records) && payload.data.messages.records) ||
    (Array.isArray(payload?.data?.messages) && payload.data.messages) ||
    (Array.isArray(payload) ? payload : []);

  return lista
    .map((item) => {
      const key = item.key || item.message?.key || {};
      const fromMe = Boolean(key.fromMe);
      const texto = extrairTextoMensagem(item.message || item);
      const tsRaw = item.messageTimestamp || item.timestamp || 0;
      const tsNum = Number(tsRaw);
      const ts = String(tsRaw).length > 10 ? tsNum : tsNum * 1000;
      return {
        id: key.id || item.id || `${ts}-${fromMe ? "out" : "in"}`,
        fromMe,
        texto: String(texto || "").trim(),
        timestamp: ts || Date.now(),
        status: fromMe ? "enviada" : "recebida",
        remoteJid: key.remoteJid || "",
        numeroLoja: meuNumero,
      };
    })
    .filter((m) => m.texto)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function numeroDoRemoteJid(remoteJid = "") {
  const base = String(remoteJid || "").split("@")[0] || "";
  return base.replace(/\D/g, "");
}
