import { textoSeguro } from "./security";

export const TEXTOS_AGENCIA = [
  {
    id: "atencao-1",
    label: "Abertura",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
      "Também cuidamos de Instagram, Google e WhatsApp, pra o cliente ser atendido mais rápido.",
      "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "reuniao-1",
    label: "Reunião",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com presença digital, automação, CRM e ERP, do jeito que a operação precisar.",
      "Posso te explicar rapidinho como isso organiza o atendimento e o controle do dia a dia.",
      "É sem compromisso. Se topar, a gente marca um horário curto. Beleza?",
    ],
  },
  {
    id: "trafego-1",
    label: "Tráfego",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil a anunciar no Google e no Instagram, e a ter CRM, automação e o software certo pra não perder lead.",
      "Se quiser dar uma olhada, te conto como funciona em poucos minutos.",
      "Sem pressão e sem pacote engessado. Topa?",
    ],
  },
  {
    id: "atencao-2",
    label: "Presença",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil a ficarem fáceis de achar e a organizar o atendimento com CRM, ERP e automação.",
      "Site, Google, Instagram e WhatsApp entram no mesmo fluxo, do jeito que vocês precisarem.",
      "Se quiser, a gente conversa sem compromisso e você vê se cabe. Pode ser?",
    ],
  },
  {
    id: "agenda-1",
    label: "Agenda",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com site, tráfego, automação, CRM e ERP, sem enrolação.",
      "Se tiverem 10 minutinhos essa semana, te mostro o que dá pra encaixar aí.",
      "Pode ser ligação, no horário que for melhor. Sem compromisso.",
    ],
  },
  {
    id: "landing-1",
    label: "Landing",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com página, automação no WhatsApp, CRM e o software que a operação pedir.",
      "A visita vira conversa e o atendimento não se perde.",
      "Se fizer sentido, te mostro como fica. Sem compromisso. Combinado?",
    ],
  },
  {
    id: "sistema-1",
    label: "Sistema",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com software, CRM, ERP e automação, pra o atendimento e o controle não ficarem tudo na mão.",
      "Queria te oferecer isso de um jeito bem direto, sem enrolação.",
      "Se fizer sentido, marcamos um papo curto, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "reuniao-2",
    label: "Conversa",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com site, Instagram, Google, automação, CRM e ERP.",
      "É consultoria de gente, não discurso de pacote. Se estiver aberto a ouvir, te explico em 10 minutos.",
      "Se não for o momento, sem problema. Se for, a gente marca. Topa?",
    ],
  },
  {
    id: "google-1",
    label: "Google",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil a aparecer no Google e a ter CRM, automação e o sistema que precisar, pra não perder conversa.",
      "Posso te mostrar como isso funciona, bem rápido.",
      "É um papo curto, sem compromisso. Quer que eu te explique?",
    ],
  },
  {
    id: "whats-1",
    label: "WhatsApp",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com site, automação no WhatsApp, CRM e ERP, do que fizer falta.",
      "O primeiro retorno sai automático e o que entra fica organizado, sem perder venda.",
      "Se fizer sentido, a gente conversa rápido, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "anuncio-1",
    label: "Anúncio",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com anúncio, Instagram, automação, CRM e o software que a equipe precisar.",
      "Quem clica é atendido e o lead não se perde.",
      "Se quiser, te conto em poucos minutos. Sem compromisso. Se não for agora, me fala que eu não insisto.",
    ],
  },
  {
    id: "horario-1",
    label: "Horário",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos empresas de todo o Brasil com site, tráfego, automação, CRM e ERP.",
      "Se tiver um horário leve, te explico o que dá pra encaixar aí, sem apresentação longa.",
      "Eu pergunto, vocês falam, e a gente vê se cabe. Sem compromisso.",
    ],
  },
];

export function montarAbordagemAgencia(empresa, indice = 0) {
  const item = TEXTOS_AGENCIA[Math.abs(Number(indice) || 0) % TEXTOS_AGENCIA.length];
  return (item.baloes(empresa) || [])
    .map((parte) => textoSeguro(parte, 500))
    .filter(Boolean)
    .slice(0, 5)
    .join("\n\n");
}

/** Cold outreach: 1 empresa a cada ~85–130s, lote de 10, textos diferentes. */
export function delayAgenciaMs() {
  return 85 * 1000 + Math.floor(Math.random() * 45 * 1000);
}

export const LOTE_AGENDA = 10;
