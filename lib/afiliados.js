import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { textoSeguro, validarId, validarWhatsapp } from "./security";

const COL_GRUPOS = "afiliados_grupos";
const COL_DISPAROS = "afiliados_disparos";
const DOC_CONFIG = "geral";

export function ouvirGruposAfiliados(onChange, onError) {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, COL_GRUPOS),
    (snap) => {
      const lista = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      lista.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      onChange(lista);
    },
    (error) => onError?.(error),
  );
}

export function ouvirConfigAfiliados(onChange, onError) {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "afiliados_config", DOC_CONFIG),
    (snap) => onChange(snap.exists() ? snap.data() : {}),
    (error) => onError?.(error),
  );
}

export async function salvarConfigAfiliados(dados) {
  if (!db) throw new Error("Firebase não configurado");
  const patch = { updatedAt: serverTimestamp() };
  if (dados.meliAffiliateId != null) patch.meliAffiliateId = textoSeguro(dados.meliAffiliateId, 80);
  if (dados.meliAffiliateWord != null) patch.meliAffiliateWord = textoSeguro(dados.meliAffiliateWord, 80);
  if (dados.shopeeAffiliateId != null) patch.shopeeAffiliateId = textoSeguro(dados.shopeeAffiliateId, 80);
  if (dados.autoAtivo != null) patch.autoAtivo = Boolean(dados.autoAtivo);
  if (dados.autoRitmo != null && ["calmo", "normal", "volume"].includes(dados.autoRitmo)) {
    patch.autoRitmo = dados.autoRitmo;
  }
  if (dados.autoIntervaloMin != null) {
    const n = Number(dados.autoIntervaloMin);
    patch.autoIntervaloMin = n >= 5 && n <= 90 ? n : 8;
  }
  if (dados.autoMaxDia != null) {
    const n = Number(dados.autoMaxDia);
    patch.autoMaxDia = n >= 20 && n <= 120 ? n : 100;
  }
  if (dados.autoHoraIni != null) patch.autoHoraIni = Number(dados.autoHoraIni) || 8;
  if (dados.autoHoraFim != null) patch.autoHoraFim = Number(dados.autoHoraFim) || 22;
  if (dados.autoGancho != null) patch.autoGancho = textoSeguro(dados.autoGancho, 80) || "🔥 ACHADINHO";
  await setDoc(doc(db, "afiliados_config", DOC_CONFIG), patch, { merge: true });
}

export async function criarGrupoAfiliado(dados) {
  if (!db) throw new Error("Firebase não configurado");
  const nome = textoSeguro(dados.nome, 80);
  const tipo = dados.tipo === "lista" ? "lista" : "whatsapp";
  const jid = textoSeguro(dados.jid, 80);
  const pessoas = Array.isArray(dados.pessoas)
    ? dados.pessoas.map((n) => validarWhatsapp(n)).filter(Boolean).slice(0, 200)
    : [];
  if (!nome) throw new Error("Nome do grupo obrigatório");
  if (tipo === "whatsapp" && !jid.includes("@g.us")) {
    throw new Error("Informe o ID do grupo do WhatsApp (@g.us)");
  }
  if (tipo === "lista" && !pessoas.length) {
    throw new Error("Inclua pelo menos um WhatsApp na lista");
  }
  return addDoc(collection(db, COL_GRUPOS), {
    nome,
    tipo,
    jid: tipo === "whatsapp" ? jid : "",
    pessoas,
    ativo: true,
    createdAt: serverTimestamp(),
  });
}

export async function atualizarGrupoAfiliado(id, dados) {
  if (!db) throw new Error("Firebase não configurado");
  const grupoId = validarId(id);
  if (!grupoId) throw new Error("Grupo inválido");
  const patch = {};
  if (dados.nome != null) patch.nome = textoSeguro(dados.nome, 80);
  if (dados.ativo != null) patch.ativo = Boolean(dados.ativo);
  if (dados.jid != null) patch.jid = textoSeguro(dados.jid, 80);
  if (Array.isArray(dados.pessoas)) {
    patch.pessoas = dados.pessoas.map((n) => validarWhatsapp(n)).filter(Boolean).slice(0, 200);
  }
  return updateDoc(doc(db, COL_GRUPOS, grupoId), patch);
}

export async function excluirGrupoAfiliado(id) {
  if (!db) throw new Error("Firebase não configurado");
  const grupoId = validarId(id);
  if (!grupoId) throw new Error("Grupo inválido");
  return deleteDoc(doc(db, COL_GRUPOS, grupoId));
}

export async function registrarDisparoAfiliado(dados) {
  if (!db) throw new Error("Firebase não configurado");
  return addDoc(collection(db, COL_DISPAROS), {
    texto: textoSeguro(dados.texto, 4000),
    grupos: Array.isArray(dados.grupos) ? dados.grupos.slice(0, 80) : [],
    ok: Number(dados.ok || 0),
    falhas: Number(dados.falhas || 0),
    createdAt: serverTimestamp(),
  });
}

export async function lerConfigAfiliados() {
  if (!db) return {};
  const snap = await getDoc(doc(db, "afiliados_config", DOC_CONFIG));
  return snap.exists() ? snap.data() : {};
}
