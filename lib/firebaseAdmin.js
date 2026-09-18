import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { chaveEmpresa, chaveWhatsapp } from "./security";

function carregarCredencial() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      try {
        return JSON.parse(Buffer.from(json, "base64").toString("utf8"));
      } catch {
        return null;
      }
    }
  }
  const email = process.env.FIREBASE_CLIENT_EMAIL || "";
  const key = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "";
  if (email && key && projectId) {
    return { client_email: email, private_key: key, project_id: projectId };
  }
  return null;
}

export function adminPronto() {
  return Boolean(carregarCredencial());
}

export function getAdminDb() {
  const cred = carregarCredencial();
  if (!cred) return null;
  if (!getApps().length) {
    initializeApp({
      credential: cert(cred),
      projectId: cred.project_id,
    });
  }
  return getFirestore();
}

function variantesWhatsapp(numero) {
  const alvo = chaveWhatsapp(numero);
  if (!alvo || alvo.length < 8) return [];
  return [...new Set([alvo, `55${alvo}`, String(numero || "").replace(/\D/g, "")])].filter(
    (v) => v.length >= 10,
  );
}

function leadRegistroJaChamado(data) {
  if (!data) return false;
  if (data.conversaDesde) return true;
  if (data.disparoReservadoEm) return true;
  if (data.chamadoEm) return true;
  if (String(data.ultimaMensagem || "").trim()) return true;
  if (data.status && data.status !== "novo") return true;
  return false;
}

function lockDisparoRef(db, conta, numero) {
  const chave = chaveWhatsapp(numero);
  if (!chave) return null;
  return db.collection("disparo_numeros").doc(`${conta || "honda"}_${chave}`);
}

export async function listarLeadsPorWhatsapp(numero, colecao = "leads") {
  const db = getAdminDb();
  if (!db) return [];
  const vistos = new Map();
  for (const valor of variantesWhatsapp(numero)) {
    const snap = await db.collection(colecao).where("whatsapp", "==", valor).limit(10).get();
    for (const item of snap.docs) {
      if (!vistos.has(item.id)) vistos.set(item.id, { id: item.id, ...item.data() });
    }
  }
  return [...vistos.values()];
}

export async function acharLeadPorWhatsapp(numero) {
  const lista = await listarLeadsPorWhatsapp(numero, "leads");
  return lista[0] || null;
}

export async function leadJaRecebeuMensagemNossa(leadId, numero) {
  const db = getAdminDb();
  if (!db) return false;

  if (leadId) {
    const leadRef = db.collection("leads").doc(leadId);
    const snap = await leadRef.get();
    if (snap.exists) {
      const data = snap.data() || {};
      if (leadRegistroJaChamado(data)) return true;
      const nossas = await leadRef.collection("mensagens").where("fromMe", "==", true).limit(1).get();
      if (!nossas.empty) return true;
      numero = numero || data.whatsapp;
    }
  }

  const fone = chaveWhatsapp(numero);
  if (fone) {
    const lock = await lockDisparoRef(db, "honda", fone)?.get();
    if (lock?.exists && ["enviado", "enviando"].includes(lock.data()?.status)) return true;
    const irmaos = await listarLeadsPorWhatsapp(fone, "leads");
    if (irmaos.some((l) => l.id !== leadId && leadRegistroJaChamado(l))) return true;
  }

  return false;
}

const LOCK_STALE_MS = 3 * 60 * 1000;

export async function reservarDisparo({
  leadId,
  numero,
  conta = "honda",
  colecao = "leads",
  statusOk = "aguardando_resposta",
}) {
  const db = getAdminDb();
  const lockRef = db ? lockDisparoRef(db, conta, numero) : null;
  if (!db || !lockRef) return { ok: false, error: "Admin Firebase indisponível" };

  const irmaos = await listarLeadsPorWhatsapp(numero, colecao);
  if (irmaos.some((l) => leadRegistroJaChamado(l) && l.id !== leadId)) {
    await marcarNumeroComoChamado(numero, conta);
    return { ok: true, skipped: true, motivo: "já enviado" };
  }

  try {
    await db.runTransaction(async (tx) => {
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists) {
        const data = lockSnap.data() || {};
        const em = Number(data.em) || 0;
        if (data.status === "enviado") {
          const err = new Error("já enviado");
          err.skipped = true;
          throw err;
        }
        if (data.status === "enviando" && Date.now() - em < LOCK_STALE_MS) {
          const err = new Error("já enviado");
          err.skipped = true;
          throw err;
        }
      }

      if (leadId) {
        const leadRef = db.collection(colecao).doc(leadId);
        const leadSnap = await tx.get(leadRef);
        if (leadSnap.exists) {
          const d = leadSnap.data() || {};
          if (leadRegistroJaChamado(d)) {
            const err = new Error("já enviado");
            err.skipped = true;
            throw err;
          }
          tx.update(leadRef, {
            status: statusOk,
            disparoReservadoEm: FieldValue.serverTimestamp(),
          });
        }
      }

      tx.set(lockRef, {
        chave: chaveWhatsapp(numero),
        conta,
        colecao,
        leadId: leadId || "",
        status: "enviando",
        em: Date.now(),
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    if (error.skipped || error.message === "já enviado") {
      return { ok: true, skipped: true, motivo: "já enviado" };
    }
    throw error;
  }

  return { ok: true };
}

export async function marcarNumeroComoChamado(numero, conta = "honda") {
  const db = getAdminDb();
  const lockRef = db ? lockDisparoRef(db, conta, numero) : null;
  if (!lockRef) return;
  await lockRef.set(
    {
      chave: chaveWhatsapp(numero),
      conta,
      status: "enviado",
      em: Date.now(),
      enviadoAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function confirmarDisparo({
  leadId,
  numero,
  texto,
  messageId,
  conta = "honda",
  colecao = "leads",
  statusOk = "aguardando_resposta",
}) {
  const db = getAdminDb();
  const lockRef = db ? lockDisparoRef(db, conta, numero) : null;
  if (!db || !lockRef) return;

  await lockRef.set(
    {
      status: "enviado",
      em: Date.now(),
      enviadoAt: FieldValue.serverTimestamp(),
      leadId: leadId || "",
    },
    { merge: true },
  );

  if (colecao === "leads" && leadId && texto) {
    await gravarMensagemInbound({
      leadId,
      texto,
      fromMe: true,
      messageId: messageId || `disparo-${chaveWhatsapp(numero)}`,
    });
  } else if (leadId) {
    await db.collection(colecao).doc(leadId).update({
      status: statusOk,
      chamadoEm: FieldValue.serverTimestamp(),
    }).catch(() => {});
  }

  const irmaos = await listarLeadsPorWhatsapp(numero, colecao);
  for (const irmao of irmaos) {
    if (irmao.id === leadId) continue;
    if ((irmao.status || "novo") !== "novo") continue;
    await db.collection(colecao).doc(irmao.id).update({
      status: statusOk,
      disparoReservadoEm: FieldValue.serverTimestamp(),
    }).catch(() => {});
  }

  if (colecao === "agencia_leads") {
    let nome = "";
    let cidade = "";
    let osmId = "";
    if (leadId) {
      const snap = await db.collection(colecao).doc(leadId).get();
      const d = snap.data() || {};
      nome = d.nome || "";
      cidade = d.cidade || "";
      osmId = d.osmId || "";
    }
    await registrarEmpresasVistas(
      [{ nome, whatsapp: numero, cidade, id: osmId || leadId }],
      { chamado: true },
    );
  }
}

export async function soltarDisparo({ leadId, numero, conta = "honda", colecao = "leads" }) {
  const db = getAdminDb();
  const lockRef = db ? lockDisparoRef(db, conta, numero) : null;
  if (!db || !lockRef) return;

  const snap = await lockRef.get();
  if (snap.exists && snap.data()?.status === "enviado") return;

  await lockRef.delete().catch(() => {});
  if (!leadId) return;
  await db.collection(colecao).doc(leadId).update({
    status: "novo",
    disparoReservadoEm: FieldValue.delete(),
  }).catch(() => {});
}

const COL_VISTOS = "agencia_vistos";

function idVisto(prefixo, bruto) {
  const s = String(bruto || "")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 100);
  return s ? `${prefixo}_${s}` : "";
}

export async function listarExclusoesAgencia() {
  const db = getAdminDb();
  const fones = new Set();
  const nomes = new Set();
  const osm = new Set();
  if (!db) return { fones: [], nomes: [], osm: [] };

  function absorver(data) {
    const f = chaveWhatsapp(data?.whatsapp || data?.chave);
    if (f) {
      fones.add(f);
      fones.add(`55${f}`);
    }
    const n = chaveEmpresa(data?.nome, data?.cidade) || String(data?.chaveNome || "");
    if (n) nomes.add(n);
    const osmId = String(data?.osmId || data?.id || "");
    if (osmId.startsWith("osm-")) osm.add(osmId);
  }

  const leads = await db.collection("agencia_leads").limit(1000).get();
  leads.forEach((item) => absorver({ id: item.id, ...item.data() }));

  const vistos = await db.collection(COL_VISTOS).limit(2000).get();
  vistos.forEach((item) => {
    const data = item.data() || {};
    if (data.status !== "chamou") return;
    absorver({ id: item.id, ...data });
  });

  const locks = await db.collection("disparo_numeros").limit(2000).get();
  locks.forEach((item) => {
    if (!String(item.id).startsWith("agencia_")) return;
    absorver({ chave: String(item.id).slice("agencia_".length), ...item.data() });
  });

  return { fones: [...fones], nomes: [...nomes], osm: [...osm] };
}

export async function registrarEmpresasVistas(empresas, { chamado = false } = {}) {
  const db = getAdminDb();
  if (!db || !Array.isArray(empresas) || !empresas.length) return 0;
  const batch = db.batch();
  let n = 0;
  for (const item of empresas.slice(0, 20)) {
    const fone = chaveWhatsapp(item.whatsapp);
    const nomeChave = chaveEmpresa(item.nome, item.cidade);
    const refs = [];
    if (fone) refs.push(db.collection(COL_VISTOS).doc(idVisto("f", fone)));
    if (nomeChave) refs.push(db.collection(COL_VISTOS).doc(idVisto("n", nomeChave.replace(/\s+/g, "-"))));
    if (item.id && String(item.id).startsWith("osm-")) {
      refs.push(db.collection(COL_VISTOS).doc(idVisto("o", item.id)));
    }
    const payload = {
      nome: String(item.nome || "").slice(0, 120),
      whatsapp: fone || String(item.whatsapp || "").slice(0, 20),
      cidade: String(item.cidade || "").slice(0, 80),
      osmId: String(item.id || item.osmId || "").slice(0, 80),
      chaveNome: nomeChave,
      status: chamado ? "chamou" : "visto",
      vistoEm: FieldValue.serverTimestamp(),
    };
    if (chamado) payload.chamadoEm = FieldValue.serverTimestamp();
    for (const ref of refs) {
      batch.set(ref, payload, { merge: true });
      n += 1;
    }
  }
  if (n) await batch.commit();
  return n;
}

export async function gravarMensagemInbound({
  leadId,
  texto,
  fromMe,
  messageId,
  messageTimestamp,
}) {
  const db = getAdminDb();
  if (!db || !leadId || !texto) return false;

  const leadRef = db.collection("leads").doc(leadId);
  const leadSnap = await leadRef.get();
  const leadData = leadSnap.data() || {};

  // Só grava resposta se o lead já foi chamado pelo painel (conversaDesde)
  let desdeMs = 0;
  if (leadData.conversaDesde?.toMillis) {
    desdeMs = leadData.conversaDesde.toMillis();
  } else if (leadData.conversaDesde?.seconds) {
    desdeMs = leadData.conversaDesde.seconds * 1000;
  }
  if (!desdeMs && !fromMe) {
    const nossas = await leadRef
      .collection("mensagens")
      .where("fromMe", "==", true)
      .limit(1)
      .get();
    if (nossas.empty) return false;
    const ts = nossas.docs[0].data()?.createdAt;
    desdeMs = ts?.toMillis?.() || (ts?.seconds ? ts.seconds * 1000 : 0);
  }
  if (!fromMe && desdeMs) {
    const tsRaw = Number(messageTimestamp || 0);
    const msgMs = String(messageTimestamp || "").length > 10 ? tsRaw : tsRaw * 1000;
    if (msgMs && msgMs < desdeMs) return false;
  }

  const mensagens = leadRef.collection("mensagens");
  if (messageId) {
    const existente = await mensagens.where("messageId", "==", messageId).limit(1).get();
    if (!existente.empty) return true;
  }

  await mensagens.add({
    texto: String(texto).slice(0, 4000),
    fromMe: Boolean(fromMe),
    messageId: String(messageId || "").slice(0, 120),
    createdAt: FieldValue.serverTimestamp(),
  });

  const patch = {
    ultimaMensagem: String(texto).slice(0, 180),
    ultimaMensagemEm: FieldValue.serverTimestamp(),
  };
  if (fromMe) {
    patch.naoLidas = 0;
    if (!desdeMs) patch.conversaDesde = FieldValue.serverTimestamp();
  } else {
    patch.naoLidas = FieldValue.increment(1);
    patch.status = "em_atendimento";
  }
  await leadRef.update(patch);
  return true;
}
