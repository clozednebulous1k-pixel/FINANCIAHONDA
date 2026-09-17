const DEFAULTS = {
  url: process.env.EVOLUTION_API_URL || "http://127.0.0.1:8080",
  key: process.env.EVOLUTION_API_KEY || "",
  instance: process.env.EVOLUTION_INSTANCE || "honda-crm",
};

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
  return evoFetch("/instance/create", {
    method: "POST",
    body: {
      instanceName: cfg.instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      number: cfg.numero,
    },
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
  return evoFetch(`/message/sendMedia/${nomeInstancia(conta)}`, {
    method: "POST",
    body: {
      number: destinoWhatsapp(destino),
      mediatype: "image",
      media: String(urlImagem || "").slice(0, 2000),
      caption: String(caption || "").slice(0, 3000),
    },
  });
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
