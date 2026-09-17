import { FieldValue } from "firebase-admin/firestore";
import { adminPronto, getAdminDb } from "./firebaseAdmin";
import { evolutionConfigurado, enviarImagemDestino, enviarTextoDestino } from "./evolution";
import { buscarProdutosAfiliados } from "./produtosAfiliados";
import { montarTextoOferta } from "./textoAchadinho";
import { validarWhatsapp } from "./security";
import { ritmoAuto } from "./ritmoAfiliados";

const DOC = "geral";

function clamp(n, min, max, padrao) {
  const v = Number(n);
  if (!Number.isFinite(v)) return padrao;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function relogioBrasil(date = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return { hora, dia, ms: date.getTime() };
}

function destinosDoGrupo(grupo) {
  if (grupo?.tipo === "lista") {
    return (Array.isArray(grupo.pessoas) ? grupo.pessoas : [])
      .map((n) => validarWhatsapp(n))
      .filter(Boolean)
      .slice(0, 20);
  }
  const jid = String(grupo?.jid || "").trim();
  return jid.includes("@g.us") ? [jid] : [];
}

async function postarNoGrupo(grupo, produto, gancho) {
  const destinos = destinosDoGrupo(grupo);
  if (!destinos.length) throw new Error("grupo sem destino");
  const texto = montarTextoOferta(produto, gancho);
  const imagem = String(produto?.imagem || "");
  for (const destino of destinos.slice(0, 1)) {
    if (imagem) {
      try {
        await enviarImagemDestino(destino, imagem, texto, "afiliados");
      } catch {
        await enviarTextoDestino(destino, texto, "afiliados");
      }
    } else {
      await enviarTextoDestino(destino, texto, "afiliados");
    }
  }
}

export async function rodarTickRoboAfiliados() {
  if (!adminPronto()) {
    return { ok: false, pulou: "sem-admin", detalhe: "Falta FIREBASE_SERVICE_ACCOUNT_JSON na Vercel." };
  }
  if (!evolutionConfigurado()) {
    return { ok: false, pulou: "sem-evolution", detalhe: "Evolution desligada." };
  }

  const db = getAdminDb();
  const ref = db.collection("afiliados_config").doc(DOC);
  const snap = await ref.get();
  const cfg = snap.data() || {};

  if (!cfg.autoAtivo) {
    return { ok: true, pulou: "desligado" };
  }

  const agora = relogioBrasil();
  const horaIni = clamp(cfg.autoHoraIni, 7, 12, 8);
  const horaFim = clamp(cfg.autoHoraFim, 18, 23, 22);
  const ritmo = ritmoAuto(cfg.autoRitmo);
  const salvo = Number(cfg.autoMaxDia);
  const maxMsgs = salvo >= 20 ? clamp(salvo, 20, ritmo.maxMsgs, ritmo.maxMsgs) : ritmo.maxMsgs;
  if (agora.hora < horaIni || agora.hora >= horaFim) {
    await ref.set({ autoStatus: `Pausado: fora do horário (${horaIni}h–${horaFim}h)` }, { merge: true });
    return { ok: true, pulou: "fora-horario" };
  }

  const mesmoDia = cfg.autoDia === agora.dia;
  const msgsDia = mesmoDia ? Number(cfg.autoMsgsDia || 0) : 0;
  const produtosDia = mesmoDia ? Number(cfg.autoProdutosDia || 0) : 0;

  if (msgsDia >= maxMsgs || produtosDia >= ritmo.maxProdutos) {
    await ref.set(
      { autoStatus: `Limite do dia: ${produtosDia} achadinhos, ${msgsDia} envios.`, autoDia: agora.dia },
      { merge: true },
    );
    return { ok: true, pulou: "limite-dia" };
  }

  const lastAt = Number(cfg.autoLastAt || 0);
  const jitter = Number(cfg.autoNextJitter || 0);
  if (Date.now() < lastAt + ritmo.minEnvioMs + jitter) {
    return { ok: true, pulou: "espera" };
  }

  let fila = Array.isArray(cfg.autoFila) ? cfg.autoFila.filter((g) => g && (g.jid || g.pessoas)) : [];
  let produto = cfg.autoProduto && cfg.autoProduto.link ? cfg.autoProduto : null;
  let novosProdutos = produtosDia;

  if (!fila.length || !produto) {
    const intervaloMs = clamp(cfg.autoIntervaloMin, 5, 90, ritmo.intervaloProdutoMin) * 60 * 1000;
    if (Date.now() < Number(cfg.autoLastProdutoAt || 0) + intervaloMs) {
      return { ok: true, pulou: "espera-produto" };
    }

    const gruposSnap = await db.collection("afiliados_grupos").get();
    const grupos = gruposSnap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((g) => g.ativo !== false)
      .slice(0, ritmo.maxGrupos);
    if (!grupos.length) {
      await ref.set({ autoStatus: "Ligado, mas não há grupo ativo." }, { merge: true });
      return { ok: true, pulou: "sem-grupo" };
    }

    const busca = await buscarProdutosAfiliados({
      robo: true,
      origem: "mercadolivre",
      soPromo: true,
      meliTag: cfg.meliAffiliateId || "",
      meliWord: cfg.meliAffiliateWord || "",
    });
    const usados = new Set(Array.isArray(cfg.autoPostados) ? cfg.autoPostados : []);
    const lista = Array.isArray(busca.produtos) ? busca.produtos : [];
    produto =
      lista.find((p) => p.desconto >= 15 && p.link && !usados.has(p.id)) ||
      lista.find((p) => p.link && !usados.has(p.id)) ||
      null;
    if (!produto) {
      await ref.set({ autoStatus: "Não achei oferta nova agora. Tento de novo no próximo ciclo." }, { merge: true });
      return { ok: true, pulou: "sem-oferta" };
    }

    fila = grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      tipo: g.tipo,
      jid: g.jid || "",
      pessoas: Array.isArray(g.pessoas) ? g.pessoas : [],
    }));
    novosProdutos += 1;
  }

  const grupo = fila[0];
  const resto = fila.slice(1);

  try {
    await postarNoGrupo(grupo, produto, cfg.autoGancho || "🔥 ACHADINHO");
  } catch (error) {
    await ref.set(
      {
        autoLastAt: Date.now(),
        autoNextJitter: Math.floor(Math.random() * ritmo.jitterMaxMs),
        autoStatus: `Falha em ${grupo?.nome || "grupo"}: ${error.message || "erro"}`,
        autoDia: agora.dia,
        autoMsgsDia: msgsDia,
        autoProdutosDia: novosProdutos,
      },
      { merge: true },
    );
    return { ok: false, pulou: "falha-envio", detalhe: error.message };
  }

  const postados = [...(Array.isArray(cfg.autoPostados) ? cfg.autoPostados : []), produto.id]
    .filter(Boolean)
    .slice(-200);
  const acabouRodada = resto.length === 0;

  await ref.set(
    {
      autoFila: resto,
      autoProduto: acabouRodada ? null : produto,
      autoPostados: postados,
      autoLastAt: Date.now(),
      autoLastProdutoAt: acabouRodada ? Date.now() : Number(cfg.autoLastProdutoAt || Date.now()),
      autoNextJitter: Math.floor(Math.random() * ritmo.jitterMaxMs),
      autoMsgsDia: msgsDia + 1,
      autoProdutosDia: novosProdutos,
      autoDia: agora.dia,
      autoLastTitulo: String(produto.titulo || "").slice(0, 120),
      autoLastGrupo: String(grupo.nome || "").slice(0, 80),
      autoStatus: acabouRodada
        ? `Terminei a rodada: ${String(produto.titulo || "").slice(0, 60)}`
        : `Postei em ${grupo.nome}. Faltam ${resto.length} grupo(s).`,
      autoUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    ok: true,
    enviou: true,
    grupo: grupo.nome,
    produto: produto.titulo,
    faltam: resto.length,
  };
}
