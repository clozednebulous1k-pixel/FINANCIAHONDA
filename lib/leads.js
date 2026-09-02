import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { CONFIG } from "./formulario";
import { LEADS_CNH } from "./leadsIniciais";
import { validarId, validarLead, validarStatus, validarWhatsapp } from "./security";

export const STATUS = [
  { id: "novo", label: "Novo" },
  { id: "chamou", label: "Já chamou" },
  { id: "aguardando_resposta", label: "Aguardando resposta" },
  { id: "nao_atendeu", label: "Chamou e não atendeu" },
  { id: "em_atendimento", label: "Em atendimento" },
  { id: "visita", label: "Visita agendada" },
  { id: "ganho", label: "Fechado" },
  { id: "perdido", label: "Sem interesse" },
];

export function whatsappLead(numero) {
  const digits = validarWhatsapp(numero);
  if (!digits) return `https://wa.me/${CONFIG.whatsappLoja}`;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  if (!/^55\d{10,11}$/.test(full)) return `https://wa.me/${CONFIG.whatsappLoja}`;
  return `https://wa.me/${full}`;
}

export function ouvirLeads(onChange, onError) {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "leads"),
    (snap) => {
      const lista = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      lista.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        if (tb !== ta) return tb - ta;
        return String(a.id).localeCompare(String(b.id));
      });
      onChange(lista);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function criarLead(dados) {
  if (!db) throw new Error("Firebase não configurado");
  const limpo = validarLead({ ...dados, status: "novo" });
  return addDoc(collection(db, "leads"), {
    nome: limpo.nome,
    whatsapp: limpo.whatsapp,
    tipo: limpo.tipo,
    modelo: limpo.modelo,
    observacao: limpo.observacao,
    origem: limpo.origem,
    cnh: limpo.cnh,
    status: "novo",
    respostas: {},
    createdAt: Timestamp.now(),
  });
}

export async function atualizarLead(id, dados) {
  if (!db) throw new Error("Firebase não configurado");
  const leadId = validarId(id);
  if (!leadId) throw new Error("Dados inválidos");
  const limpo = validarLead(dados);
  return updateDoc(doc(db, "leads", leadId), {
    nome: limpo.nome,
    whatsapp: limpo.whatsapp,
    tipo: limpo.tipo,
    modelo: limpo.modelo,
    observacao: limpo.observacao,
    origem: limpo.origem,
    cnh: limpo.cnh,
    status: limpo.status,
  });
}

export async function atualizarStatus(id, status) {
  if (!db) throw new Error("Firebase não configurado");
  const leadId = validarId(id);
  const novoStatus = validarStatus(status);
  if (!leadId || !novoStatus) throw new Error("Dados inválidos");
  return updateDoc(doc(db, "leads", leadId), { status: novoStatus });
}

export async function excluirLead(id) {
  if (!db) throw new Error("Firebase não configurado");
  const leadId = validarId(id);
  if (!leadId) throw new Error("Dados inválidos");
  return deleteDoc(doc(db, "leads", leadId));
}

export async function importarLeadsCnh() {
  if (!db) throw new Error("Firebase não configurado");
  const snap = await getDocs(collection(db, "leads"));
  if (!snap.empty) return;
  for (const lead of LEADS_CNH) {
    await criarLead({
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      tipo: "CONSTATANDO",
      modelo: "",
      observacao: "Tráfego pago · tem CNH · ainda sem resposta de moto/interesse",
      origem: "trafego-pago",
      cnh: "Sim",
    });
  }
}
