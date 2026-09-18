import { textoSeguro } from "./security";

function nomeEmpresa(empresa) {
  const limpo = textoSeguro(empresa?.nome, 50);
  return limpo || "sua empresa";
}

export const TEXTOS_AGENCIA = [
  {
    id: "atencao-1",
    label: "Abertura 1",
    texto: (empresa) =>
      `Oi, tudo bem?\n\n` +
      `Aqui é o Alessandro, da equipe Conect Web Mídia.\n\n` +
      `Te chamo porque vi a ${nomeEmpresa(empresa)} e achei que vocês devem estar perdendo tempo com gargalo do dia a dia: WhatsApp lotado, cliente sem resposta, agenda na mão, disparo de mensagem um por um.\n\n` +
      `A gente ajuda tanto com site quanto com marketing — e também sistema pra tirar trava de atendimento, disparo e organização.\n\n` +
      `O que mais emperra aí hoje: aparecer no Google, trazer cliente ou organizar o WhatsApp?`,
  },
  {
    id: "atencao-2",
    label: "Abertura 2",
    texto: (empresa) =>
      `Fala, tudo certo?\n\n` +
      `Alessandro falando, da Conect Web Mídia.\n\n` +
      `A gente ajuda empresa com site e com marketing, pra parar de trabalhar no improviso.\n\n` +
      `A ${nomeEmpresa(empresa)} consegue tirar gargalo de disparo de mensagem, fila de cliente e divulgação — tudo no mesmo time.\n\n` +
      `Qual parte mais te toma tempo aí?`,
  },
  {
    id: "atencao-3",
    label: "Abertura 3",
    texto: (empresa) =>
      `Oi! Beleza?\n\n` +
      `Sou o Alessandro, faço parte da equipe Conect Web Mídia.\n\n` +
      `Passei na ${nomeEmpresa(empresa)} pra te apresentar: a gente ajuda tanto com site quanto com marketing, e com sistema se a operação estiver emperrada.\n\n` +
      `Vale pra trazer cliente, disparo de mensagem, agenda e follow-up.\n\n` +
      `Posso te perguntar qual gargalo dói mais no dia a dia?`,
  },
  {
    id: "atencao-4",
    label: "Abertura 4",
    texto: (empresa) =>
      `E aí, tudo bem?\n\n` +
      `Alessandro da Conect Web Mídia.\n\n` +
      `Te chamo direto: a gente ajuda tanto com site quanto com marketing, pra empresa que ainda perde cliente por falta de presença e organização.\n\n` +
      `Na ${nomeEmpresa(empresa)} dá pra tirar gargalo de divulgação, atendimento e disparo no WhatsApp.\n\n` +
      `O que vocês mais querem resolver primeiro?`,
  },
];

export function montarAbordagemAgencia(empresa, indice = 0) {
  const item = TEXTOS_AGENCIA[Math.abs(Number(indice) || 0) % TEXTOS_AGENCIA.length];
  return item.texto(empresa);
}

/** Cold outreach: 1 msg a cada ~80–120s, lote de 10. */
export function delayAgenciaMs() {
  return 80 * 1000 + Math.floor(Math.random() * 40 * 1000);
}

export const LOTE_AGENDA = 10;
