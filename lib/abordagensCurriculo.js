import { textoSeguro } from "./security";

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

const VARIANTES_CURRICULO = [
  (ola) => [
    `${ola}, tudo bem?`,
    "Me chamo Alessandro Silva Cardoso, atuo como Desenvolvedor Web e Analista de Sistemas.",
    "Tenho experiência com desenvolvimento web moderno (React, Next.js, Node.js, TypeScript), banco de dados (MySQL, PostgreSQL, Prisma), automações e suporte a sistemas em produção.",
    "Gostaria de apresentar meu perfil profissional e meu portfólio para oportunidades ou projetos da equipe:",
    "🔗 Portfólio / Projetos: https://potfolio-rxgy.vercel.app/\n📧 E-mail: alesilvacardoso01@icloud.com\n📱 WhatsApp: (11) 95202-5568",
    "Com quem da área técnica ou recrutamento posso compartilhar meu currículo completo em PDF?",
  ],
  (ola) => [
    `${ola}! Tudo bem com você?`,
    "Sou o Alessandro Cardoso, desenvolvedor web e analista de sistemas.",
    "Trabalho na construção de aplicações escaláveis, automações de processos, APIs e integração de sistemas (React, Next, Node, SQL, Docker).",
    "Estou me apresentando para posições e parcerias em tecnologia e desenvolvimento:",
    "🌐 Portfólio online: https://potfolio-rxgy.vercel.app/\n📩 Contato: alesilvacardoso01@icloud.com",
    "Caso tenham oportunidades em aberto, posso enviar meu currículo detalhado por aqui?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Prazer, sou Alessandro Cardoso. Sou desenvolvedor web com forte atuação em soluções práticas de software, integrações e rotinas operacionais.",
    "Possuo vivência prática como desenvolvedor e suporte técnico de sistemas, criando painéis administrativos, CRMs e plataformas web completas.",
    "Meu portfólio e projetos estão disponíveis em: https://potfolio-rxgy.vercel.app/",
    "Seria possível encaminhar meu currículo para a equipe de tecnologia ou RH de vocês?",
  ],
  (ola) => [
    `${ola}, tudo bem?`,
    "Meu nome é Alessandro Silva Cardoso, sou Desenvolvedor de Software.",
    "Estou buscando novas oportunidades e parcerias para somar em projetos de desenvolvimento web (Full Stack / Front / Back-end), automação e banco de dados.",
    "Deixo à disposição meu site com resumo das experiências e projetos desenvolvidos: https://potfolio-rxgy.vercel.app/",
    "Poderiam me indicar o canal ou responsável para envio do meu currículo completo?",
  ],
];

export const MODELOS_CURRICULO = [
  { id: 0, titulo: "Apresentação Desenvolvedor Full Stack / Sistemas" },
  { id: 1, titulo: "Foco em Aplicações Web, APIs e Automação" },
  { id: 2, titulo: "Experiência Prática em Sistemas e CRM" },
  { id: 3, titulo: "Apresentação Direta com Link de Portfólio" },
];

export function montarAbordagemCurriculo(empresa, indice = 0) {
  const ola = saudacaoPeriodo();
  const fn = VARIANTES_CURRICULO[Math.abs(Number(indice) || 0) % VARIANTES_CURRICULO.length];
  const blocos = fn(ola);
  return blocos.join("\n\n");
}

export function delayCurriculoMs() {
  // Entre 18 e 35 segundos para ritmo seguro anti-spam
  return 18000 + Math.floor(Math.random() * 17000);
}
