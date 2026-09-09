import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  doc,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { textoSeguro, validarId } from "./security";

async function apagarDocsEmLote(refs) {
  const CHUNK = 400;
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + CHUNK)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

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

/** Já existe envio nosso neste lead? Evita disparo duplicado. */
export function leadJaFoiChamado(lead) {
  if (!lead) return false;
  const status = lead.status || "novo";
  if (status !== "novo") return true;
  if (lead.conversaDesde) return true;
  if (String(lead.ultimaMensagem || "").trim()) return true;
  return false;
}

export async function jaEnviouMensagem(leadId) {
  if (!db) return false;
  const id = validarId(leadId);
  if (!id) return false;

  const leadDoc = await getDoc(doc(db, "leads", id));
  if (leadJaFoiChamado({ id, ...(leadDoc.data() || {}) })) return true;

  const existentes = await getDocs(
    query(collection(db, "leads", id, "mensagens"), orderBy("createdAt", "desc"), limit(40)),
  );
  return existentes.docs.some((item) => Boolean(item.data()?.fromMe));
}

/** Timestamp (ms) da 1ª mensagem enviada pelo painel — histórico WA anterior a isso é ignorado. */
export function msConversaDesde(lead, mensagens = []) {
  const campo = lead?.conversaDesde?.toMillis?.() || Number(lead?.conversaDesde) || 0;
  if (campo) return campo;
  const primeira = (mensagens || []).find((m) => m.fromMe);
  return primeira?.createdAt?.toMillis?.() || Number(primeira?.createdAt) || 0;
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
  if (fromMe) {
    patch.naoLidas = 0;
    const leadDoc = await getDoc(doc(db, "leads", id));
    if (!leadDoc.data()?.conversaDesde) {
      patch.conversaDesde = serverTimestamp();
    }
  }
  await updateDoc(doc(db, "leads", id), patch);
}

/**
 * Apaga todas as mensagens do chat no painel (não apaga no WhatsApp nem o lead).
 */
export async function apagarConversa(leadId) {
  if (!db) throw new Error("Firebase não configurado");
  const id = validarId(leadId);
  if (!id) throw new Error("Lead inválido");

  const snap = await getDocs(collection(db, "leads", id, "mensagens"));
  await apagarDocsEmLote(snap.docs.map((item) => item.ref));

  // deleteField (não null) — regras do Firestore exigem timestamp ou campo ausente
  await updateDoc(doc(db, "leads", id), {
    ultimaMensagem: "",
    ultimaMensagemEm: deleteField(),
    naoLidas: 0,
    conversaDesde: deleteField(),
  });
  return snap.size;
}

/**
 * Remove do painel tudo que veio antes da 1ª mensagem enviada por você (histórico antigo do WA).
 */
export async function podarHistoricoAntesDaChamada(leadId) {
  if (!db) throw new Error("Firebase não configurado");
  const id = validarId(leadId);
  if (!id) return 0;

  const snap = await getDocs(
    query(collection(db, "leads", id, "mensagens"), orderBy("createdAt", "asc"), limit(500)),
  );
  const docs = snap.docs;
  const primeiraNossa = docs.find((d) => d.data()?.fromMe);
  if (!primeiraNossa) {
    const refs = docs.map((item) => item.ref);
    await apagarDocsEmLote(refs);
    if (refs.length) {
      await updateDoc(doc(db, "leads", id), {
        ultimaMensagem: "",
        ultimaMensagemEm: deleteField(),
        naoLidas: 0,
      });
    }
    return refs.length;
  }

  const desde = primeiraNossa.data()?.createdAt?.toMillis?.() || 0;
  const apagar = [];
  for (const item of docs) {
    const data = item.data() || {};
    const ms = data.createdAt?.toMillis?.() || 0;
    if (ms && ms < desde) apagar.push(item.ref);
  }
  await apagarDocsEmLote(apagar);
  await updateDoc(doc(db, "leads", id), {
    conversaDesde: primeiraNossa.data().createdAt || serverTimestamp(),
  });
  return apagar.length;
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
