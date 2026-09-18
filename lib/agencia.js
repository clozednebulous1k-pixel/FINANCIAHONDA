import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { textoSeguro, validarId, validarStatus, validarWhatsapp } from "./security";

const COL = "agencia_leads";
const MAX = 40;

export async function listarLeadsAgencia() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc"), limit(MAX)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function salvarLeadAgencia(dados, conhecidos = []) {
  if (!db) throw new Error("Firebase não configurado");
  const nome = textoSeguro(dados.nome, 120);
  const whatsapp = validarWhatsapp(dados.whatsapp);
  if (!nome || !whatsapp) throw new Error("Empresa sem nome ou WhatsApp");
  const jaTem = conhecidos.some((n) => validarWhatsapp(n) === whatsapp);
  if (jaTem) return { duplicado: true, whatsapp };
  const ref = await addDoc(collection(db, COL), {
    nome,
    whatsapp,
    cidade: textoSeguro(dados.cidade, 80),
    bairro: textoSeguro(dados.bairro, 80),
    endereco: textoSeguro(dados.endereco, 160),
    categoria: textoSeguro(dados.categoria, 40),
    site: textoSeguro(dados.site, 200),
    motivo: textoSeguro(dados.motivo, 120) || "Sem site próprio",
    precisaSite: dados.precisaSite !== false,
    precisaSoftware: Boolean(dados.precisaSoftware),
    status: "novo",
    origem: dados.origem || "maps",
    observacao: textoSeguro(dados.observacao, 500),
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, duplicado: false, whatsapp, nome };
}

export async function atualizarLeadAgencia(id, dados) {
  if (!db) throw new Error("Firebase não configurado");
  const leadId = validarId(id);
  if (!leadId) throw new Error("Lead inválido");
  const patch = {};
  if (dados.status != null) patch.status = validarStatus(dados.status) || "novo";
  if (dados.observacao != null) patch.observacao = textoSeguro(dados.observacao, 500);
  if (dados.chamadoEm) patch.chamadoEm = serverTimestamp();
  await updateDoc(doc(db, COL, leadId), patch);
}

export async function excluirLeadAgencia(id) {
  if (!db) throw new Error("Firebase não configurado");
  const leadId = validarId(id);
  if (!leadId) throw new Error("Lead inválido");
  await deleteDoc(doc(db, COL, leadId));
}
