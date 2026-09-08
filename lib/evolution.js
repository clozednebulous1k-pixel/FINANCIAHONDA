const DEFAULTS = {
  url: process.env.EVOLUTION_API_URL || "http://127.0.0.1:8080",
  key: process.env.EVOLUTION_API_KEY || "",
  instance: process.env.EVOLUTION_INSTANCE || "honda-crm",
};

function baseUrl() {
  return String(DEFAULTS.url || "").replace(/\/$/, "");
}

export function evolutionConfigurado() {
  return Boolean(baseUrl() && DEFAULTS.key && DEFAULTS.instance);
}

export function nomeInstancia() {
  return DEFAULTS.instance;
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

export async function estadoConexao() {
  return evoFetch(`/instance/connectionState/${DEFAULTS.instance}`);
}

export async function criarInstancia() {
  return evoFetch("/instance/create", {
    method: "POST",
    body: {
      instanceName: DEFAULTS.instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      number: "5511947539917",
    },
  });
}

export async function conectarInstancia() {
  return evoFetch(`/instance/connect/${DEFAULTS.instance}`);
}

export async function garantirInstancia() {
  try {
    const estado = await estadoConexao();
    return { criada: false, estado };
  } catch (error) {
    if (error.status === 404) {
      const criada = await criarInstancia();
      return { criada: true, estado: criada };
    }
    throw error;
  }
}

export async function obterQr() {
  await garantirInstancia();
  try {
    const estado = await estadoConexao();
    const state = estado?.instance?.state || estado?.state || "";
    if (state === "open") {
      return { connected: true, state, qrcode: null };
    }
  } catch {
    // segue para connect
  }
  const data = await conectarInstancia();
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

export async function enviarTexto(numero, texto) {
  return evoFetch(`/message/sendText/${DEFAULTS.instance}`, {
    method: "POST",
    body: {
      number: String(numero).replace(/\D/g, ""),
      text: String(texto || "").slice(0, 4000),
      delay: 1200 + Math.floor(Math.random() * 1800),
    },
  });
}

export async function buscarMensagens(numero, limite = 40) {
  const remoteJid = `${String(numero).replace(/\D/g, "")}@s.whatsapp.net`;
  return evoFetch(`/chat/findMessages/${DEFAULTS.instance}`, {
    method: "POST",
    body: {
      where: { key: { remoteJid } },
      limit: Math.min(Math.max(Number(limite) || 40, 1), 100),
    },
  });
}

export async function configurarWebhook(url) {
  return evoFetch(`/webhook/set/${DEFAULTS.instance}`, {
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
    payload?.messages ||
    payload?.records ||
    payload?.data?.messages ||
    (Array.isArray(payload) ? payload : []);

  return lista
    .map((item) => {
      const key = item.key || item.message?.key || {};
      const fromMe = Boolean(key.fromMe);
      const texto = extrairTextoMensagem(item.message || item);
      const ts = Number(item.messageTimestamp || item.timestamp || 0) * (String(item.messageTimestamp || "").length > 10 ? 1 : 1000);
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
