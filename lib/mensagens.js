import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { textoSeguro, validarId } from "./security";

export function ouvirMensagens(leadId, onChange, onError) {
  if (!db) return () => {};
  const id = validarId(leadId);
  if (!id) return () => {};
  const q = query(
    collection(db, "leads", id, "mensagens"),
    orderBy("createdAt", "asc"),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    (error) => onError?.(error),
  );
}

export async function salvarMensagem(leadId, { texto, fromMe, messageId }) {
  if (!db) throw new Error("Firebase não configurado");
  const id = validarId(leadId);
  const body = textoSeguro(texto, 4000);
  if (!id || !body) throw new Error("Mensagem inválida");

  // Evita gravar a mesma mensagem de novo
  const existentes = await getDocs(
    query(collection(db, "leads", id, "mensagens"), orderBy("createdAt", "desc"), limit(40)),
  );
  const mid = textoSeguro(messageId || "", 120);
  for (const item of existentes.docs) {
    const data = item.data();
    if (mid && data.messageId === mid) return;
    if (Boolean(data.fromMe) === Boolean(fromMe) && String(data.texto || "") === body) return;
  }

  await addDoc(collection(db, "leads", id, "mensagens"), {
    texto: body,
    fromMe: Boolean(fromMe),
    messageId: mid,
    createdAt: serverTimestamp(),
  });

  const patch = {
    ultimaMensagem: body.slice(0, 180),
    ultimaMensagemEm: serverTimestamp(),
  };
  if (fromMe) patch.naoLidas = 0;
  await updateDoc(doc(db, "leads", id), patch);
}

export async function marcarLidas(leadId) {
  if (!db) return;
  const id = validarId(leadId);
  if (!id) return;
  await updateDoc(doc(db, "leads", id), { naoLidas: 0 });
}

export async function registrarRespostaLead(leadId, texto) {
  if (!db) return;
  const id = validarId(leadId);
  const body = textoSeguro(texto, 4000);
  if (!id || !body) return;
  await addDoc(collection(db, "leads", id, "mensagens"), {
    texto: body,
    fromMe: false,
    messageId: "",
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "leads", id), {
    ultimaMensagem: body.slice(0, 180),
    ultimaMensagemEm: serverTimestamp(),
    naoLidas: 1,
    status: "em_atendimento",
  });
}

/**
 * Apaga mensagens repetidas no CRM (mesmo texto + mesmo sentido).
 * Mantém a primeira ocorrência.
 * Não remove do WhatsApp do cliente (já entregue).
 */
export async function limparMensagensDuplicadas(leadId) {
  if (!db) throw new Error("Firebase não configurado");
  const id = validarId(leadId);
  if (!id) return 0;

  const snap = await getDocs(
    query(collection(db, "leads", id, "mensagens"), orderBy("createdAt", "asc"), limit(500)),
  );

  const vistos = new Set();
  const apagar = [];

  for (const item of snap.docs) {
    const data = item.data() || {};
    const texto = String(data.texto || "").trim();
    const mid = String(data.messageId || "").trim();
    const chaveTexto = `${data.fromMe ? 1 : 0}::${texto}`;
    const chaveId = mid ? `id::${mid}` : "";

    if ((chaveId && vistos.has(chaveId)) || vistos.has(chaveTexto)) {
      apagar.push(item.ref);
      continue;
    }
    if (chaveId) vistos.add(chaveId);
    vistos.add(chaveTexto);
  }

  for (const ref of apagar) {
    await deleteDoc(ref);
  }
  return apagar.length;
}

export async function limparDuplicadasEmLeads(leads) {
  let total = 0;
  for (const lead of leads) {
    if (!lead?.id) continue;
    total += await limparMensagensDuplicadas(lead.id);
  }
  return total;
}
