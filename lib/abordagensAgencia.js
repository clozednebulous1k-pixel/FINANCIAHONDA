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
      `Te chamo porque vi a ${nomeEmpresa(empresa)} e quis saber como vocês estão recebendo cliente hoje, no WhatsApp, no Google ou no boca a boca.\n\n` +
      `A gente faz de tudo: site, landing page, marketing e sistema, pra facilitar atendimento, disparo e organização, se fizer sentido pra vocês.\n\n` +
      `O que vocês mais gostariam de melhorar: site, landing page, marketing ou o WhatsApp?`,
  },
  {
    id: "atencao-2",
    label: "Abertura 2",
    texto: (empresa) =>
      `Fala, tudo certo?\n\n` +
      `Alessandro falando, da Conect Web Mídia.\n\n` +
      `A gente faz site, landing page, marketing e o operacional, pra empresa que quer crescer com mais ordem.\n\n` +
      `A ${nomeEmpresa(empresa)} pode usar isso no disparo de mensagem, no atendimento e na divulgação, tudo no mesmo time.\n\n` +
      `O que vocês sentem que dá pra melhorar primeiro?`,
  },
  {
    id: "atencao-3",
    label: "Abertura 3",
    texto: (empresa) =>
      `Oi! Beleza?\n\n` +
      `Sou o Alessandro, faço parte da equipe Conect Web Mídia.\n\n` +
      `Passei na ${nomeEmpresa(empresa)} pra te apresentar: a gente faz site, landing page, marketing e sistema, o pacote inteiro, do jeito que a empresa precisar.\n\n` +
      `Vale pra trazer cliente, disparo de mensagem, agenda e follow-up.\n\n` +
      `O que vocês mais querem fortalecer no dia a dia?`,
  },
  {
    id: "atencao-4",
    label: "Abertura 4",
    texto: (empresa) =>
      `E aí, tudo bem?\n\n` +
      `Alessandro da Conect Web Mídia.\n\n` +
      `Te chamo direto: a gente faz site, landing page, marketing e sistema, pra empresa que quer mais presença e um atendimento mais organizado.\n\n` +
      `Na ${nomeEmpresa(empresa)} dá pra somar divulgação, atendimento e disparo no WhatsApp.\n\n` +
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
