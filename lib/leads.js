import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { CONFIG } from "./formulario";
import { LEADS_META } from "./leadsIniciais";
import { chaveWhatsapp, validarId, validarLead, validarStatus, validarWhatsapp } from "./security";

const MAX_LEADS_PAINEL = 300;

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

function dataDoLead(valor) {
  if (!valor) return Timestamp.now();
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return Timestamp.now();
  return Timestamp.fromDate(data);
}

export function whatsappLead(numero) {
  const digits = validarWhatsapp(numero);
  if (!digits) return `https://wa.me/${CONFIG.whatsappLoja}`;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  if (!/^55\d{10,11}$/.test(full)) return `https://wa.me/${CONFIG.whatsappLoja}`;
  return `https://wa.me/${full}`;
}

export function ouvirLeads(onChange, onError) {
  if (!db) return () => {};
  const q = query(collection(db, "leads"), orderBy("createdAt", "desc"), limit(MAX_LEADS_PAINEL));
  return onSnapshot(
    q,
    (snap) => {
      const lista = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      onChange(lista);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function acharLeadPorWhatsapp(numero) {
  if (!db) return null;
  const chave = chaveWhatsapp(numero);
  if (!chave) return null;
  const variantes = [...new Set([chave, `55${chave}`, validarWhatsapp(numero)])].filter(
    (v) => v && v.length >= 10,
  );
  for (const valor of variantes) {
    const snap = await getDocs(query(collection(db, "leads"), where("whatsapp", "==", valor), limit(1)));
    if (!snap.empty) {
      const item = snap.docs[0];
      return { id: item.id, ...item.data() };
    }
  }
  return null;
}

export async function criarLead(dados) {
  if (!db) throw new Error("Firebase não configurado");
  const limpo = validarLead({ ...dados, status: "novo" });
  try {
    const existente = await acharLeadPorWhatsapp(limpo.whatsapp);
    if (existente) {
      const err = new Error("Lead já cadastrado com este WhatsApp");
      err.code = "duplicado";
      err.existenteId = existente.id;
      throw err;
    }
  } catch (error) {
    if (error.code === "duplicado") throw error;
  }
  const respostas = {};
  Object.entries(dados.respostas || {}).forEach(([chave, valor]) => {
    const nome = String(chave || "").slice(0, 40);
    const texto = String(valor || "").slice(0, 120);
    if (nome && texto) respostas[nome] = texto;
  });
  return addDoc(collection(db, "leads"), {
    nome: limpo.nome,
    whatsapp: limpo.whatsapp,
    tipo: limpo.tipo,
    modelo: limpo.modelo,
    observacao: limpo.observacao,
    origem: limpo.origem,
    cnh: limpo.cnh,
    status: "novo",
    respostas,
    createdAt: dataDoLead(dados.createdAt),
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

export async function marcarTodosConstatando() {
  if (!db) throw new Error("Firebase não configurado");
  const snap = await getDocs(collection(db, "leads"));
  for (const item of snap.docs) {
    if (item.data().tipo === "CONSTATANDO") continue;
    await updateDoc(doc(db, "leads", item.id), { tipo: "CONSTATANDO" });
  }
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
  const existentes = new Set(snap.docs.map((item) => chaveWhatsapp(item.data().whatsapp)));

  for (const lead of LEADS_META) {
    const fone = chaveWhatsapp(lead.whatsapp);
    if (!fone || existentes.has(fone)) continue;
    await criarLead({
      nome: lead.nome,
      whatsapp: fone,
      tipo: "CONSTATANDO",
      modelo: "",
      observacao: `Tráfego pago Meta · ${lead.plataforma === "fb" ? "Facebook" : "Instagram"}`,
      origem: "trafego-pago",
      cnh: lead.cnh,
      createdAt: lead.createdAt,
    });
    existentes.add(fone);
  }
}
