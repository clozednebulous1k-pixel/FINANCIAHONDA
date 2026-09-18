import { textoSeguro } from "./security";

function nomeEmpresa(empresa) {
  const limpo = textoSeguro(empresa?.nome, 50);
  return limpo || "sua empresa";
}

export const TEXTOS_AGENCIA = [
  {
    id: "atencao-1",
    label: "Abertura",
    baloes: (empresa) => [
      "Oi, tudo bem?",
      "Aqui é o Alessandro, da equipe Conect Web Mídia.",
      `Te chamo porque vi a ${nomeEmpresa(empresa)} e quis saber como vocês estão recebendo cliente hoje, no WhatsApp, no Google ou no boca a boca.`,
      "A gente faz site, landing page, marketing, tráfego pago e sistema, pra facilitar atendimento, disparo e organização, se fizer sentido pra vocês.",
      "O que vocês mais gostariam de melhorar primeiro?",
    ],
  },
  {
    id: "reuniao-1",
    label: "Reunião",
    baloes: (empresa) => [
      "Oi, tudo bem?",
      "Alessandro da Conect Web Mídia.",
      `Vi a ${nomeEmpresa(empresa)} e achei que vale uma conversa rápida. A gente faz site, landing page, tráfego pago, marketing e sistema, tudo no mesmo time.`,
      "Sem enrolação: 15 minutinhos no Google Meet ou no telefone, vocês falam o que querem fortalecer e eu te mostro o caminho.",
      "Qual dia dessa semana fica melhor pra agendar?",
    ],
  },
  {
    id: "trafego-1",
    label: "Tráfego",
    baloes: (empresa) => [
      "Fala, tudo certo?",
      "Alessandro falando, da Conect Web Mídia.",
      "Muita empresa da região ainda depende só do boca a boca. A gente cuida de tráfego pago no Instagram e no Google, com landing page e WhatsApp prontos pra receber o cliente.",
      `Na ${nomeEmpresa(empresa)} dá pra juntar anúncio, site e atendimento, sem espalhar isso em vários fornecedores.`,
      "Vocês já anunciam hoje, ou ainda não começaram?",
    ],
  },
  {
    id: "atencao-2",
    label: "Presença",
    baloes: (empresa) => [
      "Oi! Beleza?",
      "Sou o Alessandro, faço parte da equipe Conect Web Mídia.",
      `Passei na ${nomeEmpresa(empresa)} pra te apresentar: a gente faz site, landing page, marketing, tráfego pago e sistema, o pacote inteiro, do jeito que a empresa precisar.`,
      "Vale pra trazer cliente, disparo de mensagem, agenda e follow-up.",
      "O que vocês mais querem fortalecer no dia a dia?",
    ],
  },
  {
    id: "agenda-1",
    label: "Agenda",
    baloes: (empresa) => [
      "E aí, tudo bem?",
      "Alessandro da Conect Web Mídia.",
      `Queria marcar uma reunião curta com a ${nomeEmpresa(empresa)}. Em 15 minutos a gente vê site, landing page, tráfego pago e, se precisar, um sistema pra organizar atendimento e disparo.`,
      "Pode ser Meet, ligação ou até um áudio, o que for mais fácil pra vocês.",
      "Prefere manhã ou tarde?",
    ],
  },
  {
    id: "landing-1",
    label: "Landing",
    baloes: (empresa) => [
      "Oi, tudo bem?",
      "Aqui é o Alessandro, da Conect Web Mídia.",
      "Landing page + tráfego pago costuma ser o atalho: a pessoa clica no anúncio, cai numa página objetiva e chama no WhatsApp.",
      `A gente monta isso pra ${nomeEmpresa(empresa)}, e se quiser a gente soma site completo e sistema de atendimento.`,
      "Vocês preferem começar pelo anúncio ou pela página?",
    ],
  },
  {
    id: "sistema-1",
    label: "Sistema",
    baloes: (empresa) => [
      "Fala, tudo certo?",
      "Alessandro, Conect Web Mídia.",
      `Além de site, landing page e tráfego pago, a gente faz sistema pra organizar lead, disparo e follow-up, pra ${nomeEmpresa(empresa)} não perder conversa no meio do dia.`,
      "Tudo conversa: anúncio traz, a página recebe, o WhatsApp atende.",
      "O que pesa mais aí hoje, divulgação ou organização?",
    ],
  },
  {
    id: "reuniao-2",
    label: "Conversa",
    baloes: (empresa) => [
      "Oi! Tudo bem?",
      "Sou o Alessandro, da equipe Conect Web Mídia.",
      `Não vou alongar: queria só agendar uma conversa de 10 a 15 minutos com a ${nomeEmpresa(empresa)} pra ver site, marketing, tráfego pago e sistema.`,
      "Se não fizer sentido, a gente encerra na hora. Se fizer, saímos com um plano simples do que dá pra melhorar.",
      "Terça ou quinta te atende melhor?",
    ],
  },
  {
    id: "google-1",
    label: "Google",
    baloes: (empresa) => [
      "E aí, tudo bem?",
      "Alessandro da Conect Web Mídia.",
      `Quando alguém pesquisa o serviço de vocês no Google, a ${nomeEmpresa(empresa)} aparece com site, landing page e anúncio, ou ainda fica só no perfil e no WhatsApp?`,
      "A gente cuida de tráfego pago, site e marketing pra essa busca virar conversa e cliente.",
      "Quer que eu te explique em uma reunião curta como isso funcionaria aí?",
    ],
  },
  {
    id: "whats-1",
    label: "WhatsApp",
    baloes: (empresa) => [
      "Oi, tudo bem?",
      "Aqui é o Alessandro, da Conect Web Mídia.",
      `Vi a ${nomeEmpresa(empresa)} e pensei no combo que mais funciona no Brasil: tráfego pago trazendo gente, landing page explicando rápido e o WhatsApp fechando.`,
      "A gente faz isso, e também site e sistema, se vocês quiserem deixar atendimento e disparo mais redondos.",
      "Posso te chamar 15 minutos essa semana pra alinharmos?",
    ],
  },
  {
    id: "anuncio-1",
    label: "Anúncio",
    baloes: (empresa) => [
      "Fala, tudo certo?",
      "Alessandro falando, Conect Web Mídia.",
      `Tráfego pago sem página boa queima verba. A gente monta o anúncio, a landing page e o caminho até o WhatsApp da ${nomeEmpresa(empresa)}.`,
      "Se faltar site ou um sistema pra organizar os leads, a gente faz junto.",
      "Vocês já investem em anúncio, ou ainda não testaram?",
    ],
  },
  {
    id: "horario-1",
    label: "Horário",
    baloes: (empresa) => [
      "Oi! Beleza?",
      "Sou o Alessandro, da equipe Conect Web Mídia.",
      `Queria encaixar um horário com a ${nomeEmpresa(empresa)} pra falar de site, landing page, tráfego pago, marketing e sistema.`,
      "Reunião curta, objetiva, só pra ver o que dá pra melhorar na captação e no atendimento.",
      "Me fala um dia e um horário que eu confirmo com você.",
    ],
  },
];

export function montarBaloesAgencia(empresa, indice = 0) {
  const item = TEXTOS_AGENCIA[Math.abs(Number(indice) || 0) % TEXTOS_AGENCIA.length];
  return (item.baloes(empresa) || [])
    .map((parte) => textoSeguro(parte, 500))
    .filter(Boolean)
    .slice(0, 5);
}

export function montarAbordagemAgencia(empresa, indice = 0) {
  return montarBaloesAgencia(empresa, indice).join("\n\n· · ·\n\n");
}

export function delayBalaoAgenciaMs() {
  return 2200 + Math.floor(Math.random() * 2300);
}

/** Cold outreach: 1 empresa a cada ~85–130s, lote de 10, textos diferentes. */
export function delayAgenciaMs() {
  return 85 * 1000 + Math.floor(Math.random() * 45 * 1000);
}

export const LOTE_AGENDA = 10;
