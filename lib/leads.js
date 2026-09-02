import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { CONFIG } from "./formulario";
import { validarId, validarLead, validarStatus, validarWhatsapp } from "./security";

export const STATUS = [
  { id: "novo", label: "Novo" },
  { id: "em_atendimento", label: "Em atendimento" },
  { id: "visita", label: "Visita" },
  { id: "ganho", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
];

export function whatsappLead(numero) {
  const digits = validarWhatsapp(numero);
  if (!digits) return `https://wa.me/${CONFIG.whatsappLoja}`;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  if (!/^55\d{10,11}$/.test(full)) return `https://wa.me/${CONFIG.whatsappLoja}`;
  return `https://wa.me/${full}`;
}

export function ouvirLeads(onChange) {
  if (!db) return () => {};
  const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export async function criarLead(dados) {
  if (!db) throw new Error("Firebase não configurado");
  const limpo = validarLead(dados);
  return addDoc(collection(db, "leads"), {
    ...limpo,
    status: "novo",
    respostas: {},
    createdAt: serverTimestamp(),
  });
}

export async function atualizarStatus(id, status) {
  if (!db) throw new Error("Firebase não configurado");
  const leadId = validarId(id);
  const novoStatus = validarStatus(status);
  if (!leadId || !novoStatus) throw new Error("Dados inválidos");
  return updateDoc(doc(db, "leads", leadId), { status: novoStatus });
}
