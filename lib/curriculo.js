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
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { celularWhatsapp, chaveWhatsapp, textoSeguro, validarId, validarWhatsapp } from "./security";

const COL = "curriculo_leads";
const COL_VISTOS = "curriculo_vistos";
const MAX = 300;

export async function listarLeadsCurriculo() {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc"), limit(MAX)));
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (e) {
    console.error("Erro ao listar leads curriculo:", e);
    return [];
  }
}

export async function salvarLeadCurriculo(dados, conhecidos = []) {
  if (!db) throw new Error("Firebase não configurado");
  const nome = textoSeguro(dados.nome, 120);
  const whatsapp = celularWhatsapp(dados.whatsapp) || chaveWhatsapp(dados.whatsapp);
  if (!nome || !whatsapp) {
    return { duplicado: true, whatsapp, pulado: true };
  }
  const jaTem = conhecidos.some((n) => validarWhatsapp(n) === whatsapp);
  if (jaTem) {
    return { duplicado: true, whatsapp };
  }
  try {
    const existente = await getDocs(query(collection(db, COL), where("whatsapp", "==", whatsapp), limit(1)));
    if (!existente.empty) {
      return { duplicado: true, whatsapp };
    }
    const ref = await addDoc(collection(db, COL), {
      nome,
      whatsapp,
      cidade: textoSeguro(dados.cidade, 80) || "São Paulo",
      categoria: textoSeguro(dados.categoria, 60) || "Tecnologia",
      site: textoSeguro(dados.site, 200),
      status: "novo",
      origem: dados.origem || "base_curriculo",
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, duplicado: false, whatsapp, nome };
  } catch (err) {
    return { id: `local-${whatsapp}`, duplicado: false, whatsapp, nome };
  }
}

export async function atualizarLeadCurriculo(id, dados) {
  if (!db) return;
  const limpoId = validarId(id);
  if (!limpoId || limpoId.startsWith("local-")) return;
  const patch = {};
  if (dados.status) patch.status = dados.status;
  if (dados.texto) patch.texto = dados.texto;
  if (dados.erro) patch.erro = dados.erro;
  patch.updatedAt = serverTimestamp();
  try {
    await updateDoc(doc(db, COL, limpoId), patch);
  } catch (err) {
    console.warn("atualizarLeadCurriculo falhou:", err?.message);
  }
}

export async function excluirLeadCurriculo(id) {
  if (!db) return;
  const limpoId = validarId(id);
  if (!limpoId || limpoId.startsWith("local-")) return;
  try {
    await deleteDoc(doc(db, COL, limpoId));
  } catch (err) {
    console.warn("excluirLeadCurriculo falhou:", err?.message);
  }
}
