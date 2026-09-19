import { textoSeguro } from "./security";

export const TEXTOS_AGENCIA = [
  {
    id: "atencao-1",
    label: "Abertura",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com site, Instagram, Google e atendimento no WhatsApp.",
      "A ideia é trazer cliente novo e não deixar quem já chama sem resposta.",
      "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "reuniao-1",
    label: "Reunião",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com presença digital: site, anúncio e organização do WhatsApp.",
      "Posso te explicar rapidinho como isso ajuda a aparecer melhor e atender quem chega.",
      "É sem compromisso. Se topar, a gente marca um horário curto. Beleza?",
    ],
  },
  {
    id: "trafego-1",
    label: "Tráfego",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil a anunciar no Google e no Instagram, pra trazer gente que realmente procura o que vocês oferecem.",
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
      "Nós ajudamos lojas de todo o Brasil a ficarem fáceis de achar: site, perfil no Google, Instagram e um WhatsApp que responde direito.",
      "Acho que isso pode servir pra vocês também.",
      "Se quiser, a gente conversa sem compromisso e você vê se cabe. Pode ser?",
    ],
  },
  {
    id: "agenda-1",
    label: "Agenda",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com site, tráfego e organização do atendimento, sem enrolação.",
      "Se tiverem 10 minutinhos essa semana, te mostro o que a gente faz.",
      "Pode ser ligação, no horário que for melhor. Sem compromisso.",
    ],
  },
  {
    id: "landing-1",
    label: "Landing",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil a ter uma página simples, que transforma visita do Instagram ou do Google em conversa no WhatsApp.",
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
      "Nós ajudamos lojas de todo o Brasil com site, anúncio e um jeito mais redondo de receber o cliente no WhatsApp.",
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
      "Nós ajudamos lojas de todo o Brasil com site, Instagram, Google e acompanhamento no WhatsApp.",
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
      "Nós ajudamos lojas de todo o Brasil a aparecer certo no Google e receber o cliente no WhatsApp sem perder conversa.",
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
      "Nós ajudamos lojas de todo o Brasil com site, divulgação e um WhatsApp que não deixa o cliente esfriar.",
      "Quis te oferecer isso sem enrolação.",
      "Se fizer sentido, a gente conversa rápido, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "anuncio-1",
    label: "Anúncio",
    baloes: () => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nós ajudamos lojas de todo o Brasil com anúncio, Instagram e página, e organizamos o WhatsApp pra quem clica ser atendido.",
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
      "Nós ajudamos lojas de todo o Brasil com site, tráfego e cuidado com o WhatsApp.",
      "Se tiver um horário leve, te explico o que podemos fazer, sem apresentação longa.",
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
