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
      `Te chamo porque vi a ${nomeEmpresa(empresa)} e achei que vocês devem estar perdendo tempo com gargalo do dia a dia: WhatsApp lotado, cliente sem resposta, agenda na mão, disparo de mensagem um por um.\n\n` +
      `Eu faço site e sistema pra tirar isso da frente — atendimento, disparo, organização, o que estiver travando.\n\n` +
      `O que mais emperra aí hoje: WhatsApp, agenda ou aparecer no Google?`,
  },
  {
    id: "atencao-2",
    label: "Abertura 2",
    texto: (empresa) =>
      `Fala, tudo certo?\n\n` +
      `Aqui é de quem monta site e sistema pra empresa parar de trabalhar no improviso.\n\n` +
      `A ${nomeEmpresa(empresa)} consegue tirar gargalo de disparo de mensagem, fila de cliente e processo no caderno — tudo num fluxo só.\n\n` +
      `Qual parte mais te toma tempo aí?`,
  },
  {
    id: "atencao-3",
    label: "Abertura 3",
    texto: (empresa) =>
      `Oi! Beleza?\n\n` +
      `Passei na ${nomeEmpresa(empresa)} pra te apresentar o que eu faço: site pra trazer cliente e sistema pra destravar a operação.\n\n` +
      `Vale pra disparo de mensagem, agenda, follow-up, o pacote que estiver emperrado.\n\n` +
      `Posso te perguntar qual gargalo dói mais no dia a dia?`,
  },
  {
    id: "atencao-4",
    label: "Abertura 4",
    texto: (empresa) =>
      `E aí, tudo bem?\n\n` +
      `Te chamo direto: eu faço site e sistemas pra empresa que ainda perde cliente por falta de organização.\n\n` +
      `Na ${nomeEmpresa(empresa)} dá pra tirar gargalo de atendimento, disparo no WhatsApp e o restante do operacional.\n\n` +
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
