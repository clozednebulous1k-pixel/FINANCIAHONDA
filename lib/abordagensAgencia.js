import { textoSeguro } from "./security";

export const TEXTOS_AGENCIA = [
  {
    id: "atencao-1",
    label: "Abertura",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com site, Instagram, Google e automação do WhatsApp.",
      "A ideia é o cliente ser atendido mais rápido, sem vocês ficarem presos no celular o dia inteiro.",
      "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "reuniao-1",
    label: "Reunião",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com presença digital e automação: site, anúncio e WhatsApp que responde sozinho no primeiro contato.",
      "Posso te explicar rapidinho como isso organiza o atendimento e traz cliente.",
      "É sem compromisso. Se topar, a gente marca um horário curto. Beleza?",
    ],
  },
  {
    id: "trafego-1",
    label: "Tráfego",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil a anunciar no Google e no Instagram, e automatizar o WhatsApp pra quem clica não ficar sem resposta.",
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
      "Nós ajudamos lojas de todo o Brasil a ficarem fáceis de achar e a automatizar o atendimento: site, Google, Instagram e WhatsApp.",
      "Assim o cliente chega e já é recebido, mesmo fora do horário.",
      "Se quiser, a gente conversa sem compromisso e você vê se cabe. Pode ser?",
    ],
  },
  {
    id: "agenda-1",
    label: "Agenda",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com site, tráfego e automação do atendimento, sem enrolação.",
      "Se tiverem 10 minutinhos essa semana, te mostro como a automação funciona na prática.",
      "Pode ser ligação, no horário que for melhor. Sem compromisso.",
    ],
  },
  {
    id: "landing-1",
    label: "Landing",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil a ter uma página simples e uma automação no WhatsApp, pra visita virar conversa sem se perder.",
      "Se fizer sentido, te mostro como fica.",
      "Sem compromisso. Combinado?",
    ],
  },
  {
    id: "sistema-1",
    label: "Sistema",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com site, anúncio e automação no WhatsApp, pra o atendimento não ficar tudo na mão.",
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
      "Nós ajudamos lojas de todo o Brasil com site, Instagram, Google e automação de atendimento no WhatsApp.",
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
      "Nós ajudamos lojas de todo o Brasil a aparecer no Google e a automatizar o WhatsApp, pra não perder conversa.",
      "Posso te mostrar como essa automação funciona, bem rápido.",
      "É um papo curto, sem compromisso. Quer que eu te explique?",
    ],
  },
  {
    id: "whats-1",
    label: "WhatsApp",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com site, divulgação e automação no WhatsApp, pra o cliente não esfriar.",
      "A automação dá o primeiro retorno e organiza o que entra, sem vocês perderem venda.",
      "Se fizer sentido, a gente conversa rápido, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "anuncio-1",
    label: "Anúncio",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com anúncio, Instagram e automação no WhatsApp, pra quem clica ser atendido na hora.",
      "Se quiser, te conto em poucos minutos como a gente faz.",
      "Sem compromisso. Se não for agora, me fala que eu não insisto.",
    ],
  },
  {
    id: "horario-1",
    label: "Horário",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com site, tráfego e automação de WhatsApp.",
      "Se tiver um horário leve, te explico o que podemos automatizar aí, sem apresentação longa.",
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
