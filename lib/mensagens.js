import {
  addDoc,
  collection,
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

  await addDoc(collection(db, "leads", id, "mensagens"), {
    texto: body,
    fromMe: Boolean(fromMe),
    messageId: textoSeguro(messageId || "", 120),
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
