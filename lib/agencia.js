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
import { chaveEmpresa, chaveWhatsapp, textoSeguro, validarId, validarStatus, validarWhatsapp } from "./security";

const COL = "agencia_leads";
const COL_VISTOS = "agencia_vistos";
const MAX = 300;

export async function listarLeadsAgencia() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc"), limit(MAX)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function registrarVistoAgencia(dados, status = "visto") {
  if (!db) return;
  const nome = textoSeguro(dados.nome, 120);
  const cidade = textoSeguro(dados.cidade, 80);
  const fone = chaveWhatsapp(dados.whatsapp) || validarWhatsapp(dados.whatsapp);
  const nomeChave = chaveEmpresa(nome, cidade);
  const payload = {
    nome,
    whatsapp: fone || textoSeguro(dados.whatsapp, 20),
    cidade,
    osmId: textoSeguro(dados.id || dados.osmId, 80),
    chaveNome: nomeChave,
    status,
    vistoEm: serverTimestamp(),
  };
  if (status === "chamou") payload.chamadoEm = serverTimestamp();
  const writes = [];
  if (fone) writes.push(setDoc(doc(db, COL_VISTOS, `f_${fone}`), payload, { merge: true }));
  if (nomeChave) {
    const idNome = `n_${nomeChave.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 90)}`;
    writes.push(setDoc(doc(db, COL_VISTOS, idNome), payload, { merge: true }));
  }
  const osm = textoSeguro(dados.id || dados.osmId, 80);
  if (osm.startsWith("osm-")) {
    writes.push(setDoc(doc(db, COL_VISTOS, `o_${osm.replace(/[^A-Za-z0-9_-]/g, "_")}`), payload, { merge: true }));
  }
  try {
    await Promise.all(writes);
  } catch {
    // sem regras novas do Firebase o registro de vistos pode falhar; o disparo não pode parar por isso
  }
}

export async function salvarLeadAgencia(dados, conhecidos = []) {
  if (!db) throw new Error("Firebase não configurado");
  const nome = textoSeguro(dados.nome, 120);
  const whatsapp = validarWhatsapp(dados.whatsapp);
  if (!nome || !whatsapp) throw new Error("Empresa sem nome ou WhatsApp");
  const jaTem = conhecidos.some((n) => validarWhatsapp(n) === whatsapp);
  if (jaTem) {
    await registrarVistoAgencia(dados, "visto");
    return { duplicado: true, whatsapp };
  }
  const existente = await getDocs(query(collection(db, COL), where("whatsapp", "==", whatsapp), limit(1)));
  if (!existente.empty) {
    await registrarVistoAgencia(dados, "visto");
    return { duplicado: true, whatsapp };
  }
  const ref = await addDoc(collection(db, COL), {
    nome,
    whatsapp,
    cidade: textoSeguro(dados.cidade, 80),
    bairro: textoSeguro(dados.bairro, 80),
    endereco: textoSeguro(dados.endereco, 160),
    categoria: textoSeguro(dados.categoria, 40),
    site: textoSeguro(dados.site, 200),
    osmId: textoSeguro(dados.id, 80),
    motivo: textoSeguro(dados.motivo, 120) || "Sem site próprio",
    precisaSite: dados.precisaSite !== false,
    precisaSoftware: Boolean(dados.precisaSoftware),
    status: "novo",
    origem: dados.origem || "maps",
    observacao: textoSeguro(dados.observacao, 500),
    createdAt: serverTimestamp(),
  });
  await registrarVistoAgencia({ ...dados, whatsapp, nome }, "visto");
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
  if (patch.status && patch.status !== "novo") {
    await registrarVistoAgencia(
      { nome: dados.nome, whatsapp: dados.whatsapp, cidade: dados.cidade, id: dados.osmId || dados.id },
      "chamou",
    );
  }
}

export async function excluirLeadAgencia(id, dados = {}) {
  if (!db) throw new Error("Firebase não configurado");
  const leadId = validarId(id);
  if (!leadId) throw new Error("Lead inválido");
  if (dados.nome || dados.whatsapp) {
    await registrarVistoAgencia(dados, dados.status === "chamou" ? "chamou" : "visto");
  }
  await deleteDoc(doc(db, COL, leadId));
}
