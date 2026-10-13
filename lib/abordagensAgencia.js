import { textoSeguro } from "./security";

export const SITE_CONECT = "https://consultoriaconectwebmidia.vercel.app/";

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

function nomeEmpresa(empresa) {
  const limpo = textoSeguro(empresa?.nome, 50);
  return limpo || "sua empresa";
}

/** Mesma abordagem, várias escritas. Cada número recebe uma diferente. */
const VARIANTES = [
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    `Oi, vimos que você tem uma empresa, a ${nomeEmpresa(empresa)}, e te faço uma pergunta.`,
    "Existe algum gargalo aí hoje? Precisa de leads, de alguma automação ou de melhorar processos?",
    "Aqui é o Alessandro, da Consultoria Conect Web e Midia. A gente cuida de site, landing page, tráfego pago, marketing e sistema.",
    `Se alguma dessas opções te interessa, visita nosso site ${SITE_CONECT} e a gente marca uma reunião pra ver o que dá pra melhorar.`,
  ],
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    `Oi, vimos a ${nomeEmpresa(empresa)} e te faço uma pergunta direta.`,
    "Vocês estão precisando de mais leads, ou o gargalo é atender quem já chega?",
    "Sou o Alessandro, da Consultoria Conect Web e Midia. Dá pra resolver com tráfego pago, landing page e um processo mais redondo no WhatsApp.",
    `Se alguma dessas opções te interessa, visita ${SITE_CONECT} e a gente marca uma reunião pra ver o que dá pra melhorar.`,
  ],
  (ola, empresa) => [
    `${ola}! Tudo bem?`,
    "Oi, vimos que você tem uma empresa e te faço uma pergunta.",
    `Na ${nomeEmpresa(empresa)} falta alguma automação? Follow-up, disparo, agenda, ou o processo ainda é tudo na mão?`,
    "Alessandro da Consultoria Conect Web e Midia. A gente faz site, sistema e automação pra isso não depender só de memória.",
    `Se alguma dessas opções te interessa, visita nosso site ${SITE_CONECT} e vamos marcar uma reunião.`,
  ],
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    `Oi, vimos a ${nomeEmpresa(empresa)} e te faço uma pergunta.`,
    "Existe algum gargalo nos processos? Cliente some, demora pra responder, ou a equipe se perde no meio do dia?",
    "Aqui é o Alessandro, da Consultoria Conect Web e Midia. A gente organiza isso com site, marketing e sistema, do jeito que fizer sentido.",
    `Se alguma dessas opções te interessa, visita ${SITE_CONECT} e a gente marca uma reunião pra ver o que dá pra melhorar.`,
  ],
  (ola, empresa) => [
    `${ola}, tudo bem com você?`,
    "Oi, vimos que você tem uma empresa e te faço uma pergunta.",
    "Existe algum gargalo? Necessita de leads, alguma automação, ou melhorar processos?",
    `Se alguma dessas opções te interessa, a ${nomeEmpresa(empresa)} pode ganhar com site, landing page, tráfego pago e uma reunião pra alinhar o próximo passo.`,
    `Alessandro, Consultoria Conect Web e Midia. Site: ${SITE_CONECT}`,
  ],
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    `Oi, vimos a ${nomeEmpresa(empresa)} e te faço uma pergunta.`,
    "Tem algum gargalo hoje em lead, automação ou processo que esteja atrapalhando o crescimento?",
    `Se sim, visita nosso site ${SITE_CONECT} e a gente marca uma reunião curta pra verificar o que dá pra melhorar nela.`,
    "Alessandro da Consultoria Conect Web e Midia. Sem enrolação, só pra entender a sua operação e apontar o caminho.",
  ],
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    "Oi, vimos que você tem uma empresa e te faço uma pergunta.",
    `O gargalo da ${nomeEmpresa(empresa)} é falta de lead, ou é o processo depois que o lead chega?`,
    "A gente trabalha tráfego pago, landing page e automação pra anúncio não cair no vazio.",
    `Alessandro, Consultoria Conect Web e Midia. Se te interessar, visita ${SITE_CONECT} e marcamos uma reunião.`,
  ],
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    `Oi, vimos a ${nomeEmpresa(empresa)} e te faço uma pergunta.`,
    "Vocês sentem gargalo na divulgação, no site, ou no processo de atender o cliente?",
    `Se alguma dessas opções te interessa, visita ${SITE_CONECT}. Aí marcamos uma reunião e vemos o que dá pra melhorar: site, landing, marketing ou sistema.`,
    "Alessandro da Consultoria Conect Web e Midia.",
  ],
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    "Oi, vimos que você tem uma empresa e te faço uma pergunta.",
    `Na ${nomeEmpresa(empresa)} o WhatsApp trava? Falta lead, falta automação, ou o processo de resposta que não acompanha?`,
    "A gente resolve isso com site, marketing e sistema, sem complicar o dia a dia de vocês.",
    `Alessandro, Consultoria Conect Web e Midia. Visita ${SITE_CONECT} e a gente marca uma reunião.`,
  ],
  (ola, empresa) => [
    `${ola}! Tudo bem?`,
    `Oi, vimos a ${nomeEmpresa(empresa)} e te faço uma pergunta bem objetiva.`,
    "Existe algum gargalo? Necessita de leads, alguma automação, melhorar processos?",
    `Se alguma dessas opções te interessa, visita ${SITE_CONECT} e vamos marcar uma reunião pra verificar o que podemos melhorar nela.`,
    "Alessandro da Consultoria Conect Web e Midia. Site, landing page, tráfego pago, marketing e sistema, tudo no mesmo time.",
  ],
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    "Oi, vimos que você tem uma empresa e te faço uma pergunta.",
    "Pra crescer agora, o que pesa mais: mais leads, uma automação, ou melhorar o processo que já existe?",
    `Na ${nomeEmpresa(empresa)} a gente consegue olhar isso junto, sem proposta pronta, na reunião.`,
    `Alessandro, Consultoria Conect Web e Midia. Site: ${SITE_CONECT}`,
  ],
  (ola, empresa) => [
    `${ola}, tudo bem?`,
    `Oi, vimos a ${nomeEmpresa(empresa)} e te faço uma pergunta.`,
    "Existe algum gargalo em lead, automação ou processo que valha uma conversa essa semana?",
    `Se alguma dessas opções te interessa, visita ${SITE_CONECT} e me fala um horário. A gente marca a reunião e verifica o que dá pra melhorar.`,
    "Alessandro da Consultoria Conect Web e Midia.",
  ],
];

export const TEXTOS_AGENCIA = VARIANTES.map((montar, i) => ({
  id: `v${i + 1}`,
  label: `Texto ${i + 1}`,
  baloes: (empresa) => montar(saudacaoPeriodo(), empresa),
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
    .slice(0, 6)
    .join("\n\n");
}

const BALOES_SITE = [
  `Caso tenha interesse ou alguma dúvida, visite nosso site: ${SITE_CONECT}`,
  `Se tiver interesse ou alguma dúvida, visita nosso site: ${SITE_CONECT}`,
  `Caso tenha interesse ou alguma dúvida, nosso site fica aqui: ${SITE_CONECT}`,
  `Se quiser ver mais ou tiver alguma dúvida, visita: ${SITE_CONECT}`,
  `Caso tenha interesse ou dúvida, dá uma olhada no site: ${SITE_CONECT}`,
];

/** Último balão da conversa, com o site. */
export function montarBalaoSiteAgencia(empresa, indice = 0) {
  const i = indiceVariante(empresa, indice) % BALOES_SITE.length;
  return textoSeguro(BALOES_SITE[i], 500);
}

/** Temporário: 1 pausa por conversa (~85–130s) para o WhatsApp não restringir. */
export function delayAgenciaMs() {
  return 85 * 1000 + Math.floor(Math.random() * 45 * 1000);
}

export const LOTE_AGENDA = 10;
