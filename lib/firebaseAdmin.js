import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

function chaveTelefone(valor) {
  let digits = String(valor || "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

export async function acharLeadPorWhatsapp(numero) {
  const db = getAdminDb();
  if (!db) return null;
  const alvo = chaveTelefone(numero);
  if (!alvo || alvo.length < 8) return null;

  const snap = await db.collection("leads").get();
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (chaveTelefone(data.whatsapp) === alvo) {
      return { id: doc.id, ...data };
    }
  }
  return null;
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
