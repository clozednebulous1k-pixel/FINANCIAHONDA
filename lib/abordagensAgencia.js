import { textoSeguro } from "./security";

/** Mesma abordagem, várias escritas — cada número recebe uma diferente. */
const VARIANTES = [
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
    "Também cuidamos de Instagram, Google e WhatsApp, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Meu nome é Alessandro, da consultoria Web e Mídia.",
    "A gente ajuda empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
    "Também cuidamos de Instagram, Google e WhatsApp, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, conversamos um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá! Tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas em todo o Brasil com site, automação, CRM, ERP e o software que precisar.",
    "Cuidamos também de Instagram, Google e WhatsApp, pra o atendimento ficar mais rápido.",
    "Se fizer sentido, a gente conversa um pouco, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
    "Olhamos Instagram, Google e WhatsApp também, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido pra vocês, a gente conversa um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem com você?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que faltar.",
    "Também cuidamos de Instagram, Google e WhatsApp, para o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente troca uma ideia, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Aqui é o Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
    "Instagram, Google e WhatsApp também ficam com a gente, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, conversamos um pouquinho sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "A gente ajuda empresas de todo o Brasil com site, CRM, ERP, automação e o software que fizer falta.",
    "Também cuidamos de Google, Instagram e WhatsApp, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Te interessa?",
  ],
  [
    "Olá, tudo bem?",
    "Sou o Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que vocês precisarem.",
    "Também cuidamos de Instagram, Google e WhatsApp, pra o cliente ter resposta mais rápida.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM e ERP, além do software que fizer falta.",
    "Cuidamos de Instagram, Google e WhatsApp também, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, marcamos um papo curto, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "A gente ajuda empresas em todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
    "Também cuidamos do Instagram, do Google e do WhatsApp, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Combinado?",
  ],
  [
    "Olá! Tudo bem?",
    "Meu nome é Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software necessário.",
    "Também cuidamos de Instagram, Google e WhatsApp, pra o atendimento ser mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, CRM, automação, ERP e o software que fizer falta.",
    "Google, Instagram e WhatsApp entram junto, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, conversamos um pouco, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que a empresa precisar.",
    "Também cuidamos de Instagram, Google e WhatsApp, para o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Topa?",
  ],
  [
    "Olá, tudo bem?",
    "Aqui é o Alessandro, da consultoria Web e Mídia.",
    "A gente ajuda empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
    "Também olhamos Instagram, Google e WhatsApp, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e qualquer software que fizer falta.",
    "Cuidamos também de Instagram, Google e WhatsApp, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido pra vocês, conversamos um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Sou o Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
    "Instagram, Google e WhatsApp também, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Beleza?",
  ],
  [
    "Olá! Tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "A gente ajuda empresas de todo o Brasil com site, automação, CRM, ERP e o software que faltar.",
    "Também cuidamos de Instagram, Google e WhatsApp, pra o cliente ter um atendimento mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Meu nome é Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, ERP, CRM, automação e o software que fizer falta.",
    "Também cuidamos de Instagram, Google e WhatsApp, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "Nós ajudamos empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta no dia a dia.",
    "Também cuidamos de Instagram, Google e WhatsApp, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Te parece bom?",
  ],
  [
    "Olá, tudo bem?",
    "Me chamo Alessandro, da consultoria Web e Mídia.",
    "A gente ajuda empresas de todo o Brasil com site, automação, CRM, ERP e o software que fizer falta.",
    "Cuidamos de Instagram, Google e WhatsApp também, pra o cliente ser atendido mais rápido.",
    "Se fizer sentido, a gente conversa um pouquinho, sem compromisso. Pode ser?",
  ],
];

export const TEXTOS_AGENCIA = VARIANTES.map((baloes, i) => ({
  id: `v${i + 1}`,
  label: `Texto ${i + 1}`,
  baloes: () => baloes,
}));

function indiceVariante(empresa, indice = 0) {
  const fone = String(empresa?.whatsapp || "").replace(/\D/g, "");
  const mistura = Number(fone.slice(-4) || 0);
  return (Math.abs(Number(indice) || 0) + mistura) % TEXTOS_AGENCIA.length;
}

export function montarAbordagemAgencia(empresa, indice = 0) {
  const item = TEXTOS_AGENCIA[indiceVariante(empresa, indice)];
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
