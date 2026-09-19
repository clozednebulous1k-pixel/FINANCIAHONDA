import { textoSeguro } from "./security";

function nomeEmpresa(empresa) {
  const limpo = textoSeguro(empresa?.nome, 50);
  return limpo || "vocês";
}

export const TEXTOS_AGENCIA = [
  {
    id: "atencao-1",
    label: "Abertura",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      `A gente ajuda empresas como a ${nomeEmpresa(empresa)} com site, Instagram, Google e atendimento no WhatsApp.`,
      "A ideia é trazer cliente novo e não deixar quem já chama sem resposta.",
      "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "reuniao-1",
    label: "Reunião",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Trabalho com presença digital: site, anúncio e organização do WhatsApp.",
      `Posso te explicar rapidinho como isso ajuda a ${nomeEmpresa(empresa)} a aparecer melhor e atender quem chega.`,
      "É sem compromisso. Se topar, a gente marca um horário curto. Beleza?",
    ],
  },
  {
    id: "trafego-1",
    label: "Tráfego",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "A gente monta anúncio no Google e no Instagram de um jeito simples, pra trazer gente que realmente procura o que vocês oferecem.",
      `Se a ${nomeEmpresa(empresa)} quiser dar uma olhada, te conto como funciona em poucos minutos.`,
      "Sem pressão e sem pacote engessado. Topa?",
    ],
  },
  {
    id: "atencao-2",
    label: "Presença",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Nosso trabalho é deixar a empresa fácil de achar: site, perfil no Google, Instagram e um WhatsApp que responde direito.",
      `Achei que isso podia servir pra ${nomeEmpresa(empresa)}.`,
      "Se quiser, a gente conversa sem compromisso e você vê se cabe. Pode ser?",
    ],
  },
  {
    id: "agenda-1",
    label: "Agenda",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Oferecemos site, tráfego e organização do atendimento, sem enrolação.",
      `Se a ${nomeEmpresa(empresa)} tiver 10 minutinhos essa semana, te mostro o que a gente faz.`,
      "Pode ser ligação, no horário que for melhor. Sem compromisso.",
    ],
  },
  {
    id: "landing-1",
    label: "Landing",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Muita empresa nos procura pra ter uma página simples, que transforma visita do Instagram ou do Google em conversa no WhatsApp.",
      `Se fizer sentido pra ${nomeEmpresa(empresa)}, te mostro como fica.`,
      "Sem compromisso. Combinado?",
    ],
  },
  {
    id: "sistema-1",
    label: "Sistema",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "A gente ajuda com site, anúncio e um jeito mais redondo de receber o cliente no WhatsApp, pra não ficar tudo solto.",
      `Queria te oferecer isso pra ${nomeEmpresa(empresa)}, de um jeito bem direto.`,
      "Se fizer sentido, marcamos um papo curto, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "reuniao-2",
    label: "Conversa",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Trabalhamos com site, Instagram, Google e acompanhamento no WhatsApp. É consultoria de gente, não discurso de pacote.",
      `Se a ${nomeEmpresa(empresa)} estiver aberta a ouvir, te explico em 10 minutos.`,
      "Se não for o momento, sem problema. Se for, a gente marca. Topa?",
    ],
  },
  {
    id: "google-1",
    label: "Google",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "A gente cuida pra empresa aparecer certo no Google e receber o cliente no WhatsApp sem perder conversa.",
      `Posso te mostrar como isso ficaria pra ${nomeEmpresa(empresa)}.`,
      "É um papo curto, sem compromisso. Quer que eu te explique?",
    ],
  },
  {
    id: "whats-1",
    label: "WhatsApp",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "A gente ajuda com site, divulgação e um WhatsApp que não deixa o cliente esfriar.",
      `Quis te oferecer isso pra ${nomeEmpresa(empresa)}, sem enrolação.`,
      "Se fizer sentido, a gente conversa rápido, sem compromisso. Pode ser?",
    ],
  },
  {
    id: "anuncio-1",
    label: "Anúncio",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "Montamos anúncio, Instagram e página, e organizamos o WhatsApp pra quem clica ser atendido.",
      `Se a ${nomeEmpresa(empresa)} quiser, te conto em poucos minutos como a gente faz.`,
      "Sem compromisso. Se não for agora, me fala que eu não insisto.",
    ],
  },
  {
    id: "horario-1",
    label: "Horário",
    baloes: (empresa) => [
      "Olá, tudo bem?",
      "Me chamo Alessandro, da consultoria Web e Mídia.",
      "A gente oferece site, tráfego e cuidado com o WhatsApp, sem apresentação longa.",
      `Se tiver um horário leve, te explico o que podemos fazer pela ${nomeEmpresa(empresa)}.`,
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
