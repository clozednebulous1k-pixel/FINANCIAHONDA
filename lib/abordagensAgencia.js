import { textoSeguro } from "./security";

/** Brasília: bom dia 05:00–12:00, boa tarde 12:01–17:59, boa noite 18:00–04:59. */
export function saudacaoPeriodo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hora = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minuto = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const hm = hora * 60 + minuto;
  if (hm >= 5 * 60 && hm <= 12 * 60) return "Bom dia";
  if (hm >= 12 * 60 + 1 && hm <= 17 * 60 + 59) return "Boa tarde";
  return "Boa noite";
}

/** Mesma abordagem, várias escritas — cada número recebe uma diferente. */
const VARIANTES = [
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, ele consegue receber as primeiras informações sem você precisar parar o que está fazendo para responder?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar sua presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama a empresa no WhatsApp ou no Instagram, ele consegue receber as primeiras informações sem você parar o que está fazendo pra responder?",
    "A gente ajuda empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}! Tudo bem?`,
    "Quando alguém chama sua empresa pelo WhatsApp ou Instagram, consegue receber as primeiras informações sem você precisar parar o que está fazendo?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar aí na empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Se um cliente chama pelo WhatsApp ou Instagram, ele recebe as primeiras informações sem você precisar parar o que está fazendo para responder?",
    "Ajudamos empresas a agilizar esse primeiro atendimento e melhorar sua presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem com você?`,
    "Quando um cliente chama sua empresa no WhatsApp ou no Instagram, ele consegue as primeiras informações sem você parar o que está fazendo?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando o cliente chama pelo WhatsApp ou Instagram, ele consegue receber as primeiras informações sem vocês precisarem parar o que estão fazendo para responder?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na empresa de vocês?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, ele recebe as primeiras informações sem você precisar parar tudo pra responder?",
    "A gente ajuda empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama no WhatsApp ou no Instagram, ele consegue as primeiras informações sem você interromper o que está fazendo para responder?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar sua presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, as primeiras informações chegam sem você precisar parar o que está fazendo?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar aí?",
  ],
  (ola) => [
    `${ola}! Tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, ele consegue receber as primeiras informações sem você parar o que está fazendo para responder?",
    "Ajudamos empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Se alguém chama sua empresa no WhatsApp ou no Instagram, recebe as primeiras informações sem você precisar parar o que está fazendo para responder?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar sua presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, ele consegue as primeiras informações sem você ter que parar o que está fazendo?",
    "A gente ajuda empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama pelo WhatsApp ou Instagram, ele recebe as primeiras informações sem você precisar parar o que está fazendo para responder?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e a melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa no WhatsApp ou Instagram, consegue receber as primeiras informações sem você parar o que está fazendo pra responder?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar sua presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Te mostro como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, ele consegue receber as primeiras informações sem vocês pararem o que estão fazendo?",
    "A gente ajuda empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, ele consegue as primeiras informações sem você precisar parar o que está fazendo para responder?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar a presença digital: WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}! Tudo bem?`,
    "Quando um cliente chama no WhatsApp ou no Instagram, ele recebe as primeiras informações sem você precisar parar o que está fazendo para responder?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar sua presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar aí na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, as primeiras informações chegam sem você ter que parar o que está fazendo para responder?",
    "Ajudamos empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, ele consegue receber as primeiras informações sem você precisar parar o que está fazendo?",
    "Nós ajudamos empresas a agilizar esse primeiro atendimento e melhorar a presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na empresa?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Quando um cliente chama sua empresa pelo WhatsApp ou Instagram, ele consegue receber as primeiras informações sem você precisar parar o que está fazendo para responder?",
    "A gente ajuda empresas a agilizar esse primeiro atendimento e melhorar sua presença digital, com WhatsApp, Instagram, Google, CRM, automações, sites, landing pages e anúncios.",
    "Prazer, sou Alessandro, da Consultoria Conect Web e Midia.",
    "Posso te mostrar como isso poderia funcionar na sua empresa?",
  ],
];

export const TEXTOS_AGENCIA = VARIANTES.map((montar, i) => ({
  id: `v${i + 1}`,
  label: `Texto ${i + 1}`,
  baloes: () => montar(saudacaoPeriodo()),
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

export const SITE_CONECT = "https://consultoriaconectwebmidia.vercel.app/";

const BALOES_SITE = [
  `Caso tenha interesse ou alguma dúvida, visite nosso site: ${SITE_CONECT}`,
  `Se tiver interesse ou alguma dúvida, visita nosso site: ${SITE_CONECT}`,
  `Caso tenha interesse ou alguma dúvida, nosso site fica aqui: ${SITE_CONECT}`,
  `Se quiser ver mais ou tiver alguma dúvida, visita: ${SITE_CONECT}`,
  `Caso tenha interesse ou dúvida, dá uma olhada no site: ${SITE_CONECT}`,
];

/** Último balão da conversa — site da Consultoria Conect Web e Midia. */
export function montarBalaoSiteAgencia(empresa, indice = 0) {
  const i = indiceVariante(empresa, indice) % BALOES_SITE.length;
  return textoSeguro(BALOES_SITE[i], 500);
}

/** Temporário: 1 pausa por conversa (~85–130s) para o WhatsApp não restringir. */
export function delayAgenciaMs() {
  return 85 * 1000 + Math.floor(Math.random() * 45 * 1000);
}

export const LOTE_AGENDA = 10;
