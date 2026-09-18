import { textoSeguro } from "./security";

function nomeEmpresa(empresa) {
  const limpo = textoSeguro(empresa?.nome, 50);
  return limpo || "sua empresa";
}

export const TEXTOS_AGENCIA = [
  {
    id: "atencao-1",
    label: "Abertura",
    texto: (empresa) =>
      `Oi, tudo bem?\n\n` +
      `Aqui é o Alessandro, da equipe Conect Web Mídia.\n\n` +
      `Te chamo porque vi a ${nomeEmpresa(empresa)} e quis saber como vocês estão recebendo cliente hoje, no WhatsApp, no Google ou no boca a boca.\n\n` +
      `A gente faz site, landing page, marketing, tráfego pago e sistema, pra facilitar atendimento, disparo e organização, se fizer sentido pra vocês.\n\n` +
      `O que vocês mais gostariam de melhorar primeiro?`,
  },
  {
    id: "reuniao-1",
    label: "Reunião",
    texto: (empresa) =>
      `Oi, tudo bem?\n\n` +
      `Alessandro da Conect Web Mídia.\n\n` +
      `Vi a ${nomeEmpresa(empresa)} e achei que vale uma conversa rápida. A gente faz site, landing page, tráfego pago, marketing e sistema, tudo no mesmo time.\n\n` +
      `Sem enrolação: 15 minutinhos no Google Meet ou no telefone, vocês falam o que querem fortalecer e eu te mostro o caminho.\n\n` +
      `Qual dia dessa semana fica melhor pra agendar?`,
  },
  {
    id: "trafego-1",
    label: "Tráfego",
    texto: (empresa) =>
      `Fala, tudo certo?\n\n` +
      `Alessandro falando, da Conect Web Mídia.\n\n` +
      `Muita empresa da região ainda depende só do boca a boca. A gente cuida de tráfego pago no Instagram e no Google, com landing page e WhatsApp prontos pra receber o cliente.\n\n` +
      `Na ${nomeEmpresa(empresa)} dá pra juntar anúncio, site e atendimento, sem espalhar isso em vários fornecedores.\n\n` +
      `Vocês já anunciam hoje, ou ainda não começaram?`,
  },
  {
    id: "atencao-2",
    label: "Presença",
    texto: (empresa) =>
      `Oi! Beleza?\n\n` +
      `Sou o Alessandro, faço parte da equipe Conect Web Mídia.\n\n` +
      `Passei na ${nomeEmpresa(empresa)} pra te apresentar: a gente faz site, landing page, marketing, tráfego pago e sistema, o pacote inteiro, do jeito que a empresa precisar.\n\n` +
      `Vale pra trazer cliente, disparo de mensagem, agenda e follow-up.\n\n` +
      `O que vocês mais querem fortalecer no dia a dia?`,
  },
  {
    id: "agenda-1",
    label: "Agenda",
    texto: (empresa) =>
      `E aí, tudo bem?\n\n` +
      `Alessandro da Conect Web Mídia.\n\n` +
      `Queria marcar uma reunião curta com a ${nomeEmpresa(empresa)}. Em 15 minutos a gente vê site, landing page, tráfego pago e, se precisar, um sistema pra organizar atendimento e disparo.\n\n` +
      `Pode ser Meet, ligação ou até um áudio, o que for mais fácil pra vocês.\n\n` +
      `Prefere manhã ou tarde?`,
  },
  {
    id: "landing-1",
    label: "Landing",
    texto: (empresa) =>
      `Oi, tudo bem?\n\n` +
      `Aqui é o Alessandro, da Conect Web Mídia.\n\n` +
      `Landing page + tráfego pago costuma ser o atalho: a pessoa clica no anúncio, cai numa página objetiva e chama no WhatsApp.\n\n` +
      `A gente monta isso pra ${nomeEmpresa(empresa)}, e se quiser a gente soma site completo e sistema de atendimento.\n\n` +
      `Vocês preferem começar pelo anúncio ou pela página?`,
  },
  {
    id: "sistema-1",
    label: "Sistema",
    texto: (empresa) =>
      `Fala, tudo certo?\n\n` +
      `Alessandro, Conect Web Mídia.\n\n` +
      `Além de site, landing page e tráfego pago, a gente faz sistema pra organizar lead, disparo e follow-up, pra ${nomeEmpresa(empresa)} não perder conversa no meio do dia.\n\n` +
      `Tudo conversa: anúncio traz, a página recebe, o WhatsApp atende.\n\n` +
      `O que pesa mais aí hoje, divulgação ou organização?`,
  },
  {
    id: "reuniao-2",
    label: "Conversa",
    texto: (empresa) =>
      `Oi! Tudo bem?\n\n` +
      `Sou o Alessandro, da equipe Conect Web Mídia.\n\n` +
      `Não vou alongar: queria só agendar uma conversa de 10 a 15 minutos com a ${nomeEmpresa(empresa)} pra ver site, marketing, tráfego pago e sistema.\n\n` +
      `Se não fizer sentido, a gente encerra na hora. Se fizer, saímos com um plano simples do que dá pra melhorar.\n\n` +
      `Terça ou quinta te atende melhor?`,
  },
  {
    id: "google-1",
    label: "Google",
    texto: (empresa) =>
      `E aí, tudo bem?\n\n` +
      `Alessandro da Conect Web Mídia.\n\n` +
      `Quando alguém pesquisa o serviço de vocês no Google, a ${nomeEmpresa(empresa)} aparece com site, landing page e anúncio, ou ainda fica só no perfil e no WhatsApp?\n\n` +
      `A gente cuida de tráfego pago, site e marketing pra essa busca virar conversa e cliente.\n\n` +
      `Quer que eu te explique em uma reunião curta como isso funcionaria aí?`,
  },
  {
    id: "whats-1",
    label: "WhatsApp",
    texto: (empresa) =>
      `Oi, tudo bem?\n\n` +
      `Aqui é o Alessandro, da Conect Web Mídia.\n\n` +
      `Vi a ${nomeEmpresa(empresa)} e pensei no combo que mais funciona no Brasil: tráfego pago trazendo gente, landing page explicando rápido e o WhatsApp fechando.\n\n` +
      `A gente faz isso, e também site e sistema, se vocês quiserem deixar atendimento e disparo mais redondos.\n\n` +
      `Posso te chamar 15 minutos essa semana pra alinharmos?`,
  },
  {
    id: "anuncio-1",
    label: "Anúncio",
    texto: (empresa) =>
      `Fala, tudo certo?\n\n` +
      `Alessandro falando, Conect Web Mídia.\n\n` +
      `Tráfego pago sem página boa queima verba. A gente monta o anúncio, a landing page e o caminho até o WhatsApp da ${nomeEmpresa(empresa)}.\n\n` +
      `Se faltar site ou um sistema pra organizar os leads, a gente faz junto.\n\n` +
      `Vocês já investem em anúncio, ou ainda não testaram?`,
  },
  {
    id: "horario-1",
    label: "Horário",
    texto: (empresa) =>
      `Oi! Beleza?\n\n` +
      `Sou o Alessandro, da equipe Conect Web Mídia.\n\n` +
      `Queria encaixar um horário com a ${nomeEmpresa(empresa)} pra falar de site, landing page, tráfego pago, marketing e sistema.\n\n` +
      `Reunião curta, objetiva, só pra ver o que dá pra melhorar na captação e no atendimento.\n\n` +
      `Me fala um dia e um horário que eu confirmo com você.`,
  },
];

export function montarAbordagemAgencia(empresa, indice = 0) {
  const item = TEXTOS_AGENCIA[Math.abs(Number(indice) || 0) % TEXTOS_AGENCIA.length];
  return item.texto(empresa);
}

/** Cold outreach: 1 msg a cada ~85–130s, lote de 10, textos diferentes. */
export function delayAgenciaMs() {
  return 85 * 1000 + Math.floor(Math.random() * 45 * 1000);
}

export const LOTE_AGENDA = 10;
