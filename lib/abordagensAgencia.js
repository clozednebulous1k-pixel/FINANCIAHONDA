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
      "Oi, tudo bem? Desculpa o incômodo.",
      "Aqui é o Alessandro, da Conect Web Mídia.",
      `Te chamo porque vi a ${nomeEmpresa(empresa)} e queria falar com alguém que atende o cliente aí, só pra uma conversa rápida.`,
      "Não é proposta fechada. É mais pra te ouvir e ver se a gente consegue ajudar vocês a receber melhor quem já procura.",
      "Se fizer sentido, marcamos uma ligação sem compromisso. Você consegue me passar pra essa pessoa, ou prefere que eu fale com você mesmo?",
    ],
  },
  {
    id: "reuniao-1",
    label: "Reunião",
    baloes: (empresa) => [
      "Oi, tudo bem?",
      "Alessandro da Conect Web Mídia. Tô passando só pra me apresentar.",
      `Queria conectar com alguém da ${nomeEmpresa(empresa)} que cuida do atendimento ou da captação de cliente.`,
      "Pode ser uma ligação curta, 10 minutinhos, sem compromisso. Se não for o momento, a gente deixa quieto.",
      "Tem alguém aí que eu possa falar, ou você mesmo olha isso?",
    ],
  },
  {
    id: "trafego-1",
    label: "Tráfego",
    baloes: (empresa) => [
      "Fala, tudo certo?",
      "Alessandro, Conect Web Mídia.",
      "Tô procurando quem conversa com o cliente no dia a dia, não o dono de tudo, se não for o caso.",
      `Vi a ${nomeEmpresa(empresa)} e fiquei na dúvida se vocês estão conseguindo atender todo mundo que chega, ou se parte se perde no WhatsApp.`,
      "Se topar, a gente marca um papo sem compromisso, só pra eu entender. Quem seria a pessoa certa aí?",
    ],
  },
  {
    id: "atencao-2",
    label: "Presença",
    baloes: (empresa) => [
      "Oi, beleza?",
      "Sou o Alessandro, da Conect Web Mídia.",
      `Não vou te vender nada agora. Só queria saber se na ${nomeEmpresa(empresa)} tem alguém responsável por cliente, marketing ou atendimento.`,
      "A ideia é uma conversa leve, pra eu entender como vocês recebem as pessoas hoje.",
      "Se puder me apontar essa pessoa, ou se for você, a gente pode marcar uma ligação sem compromisso.",
    ],
  },
  {
    id: "agenda-1",
    label: "Agenda",
    baloes: (empresa) => [
      "E aí, tudo bem?",
      "Alessandro da Conect Web Mídia.",
      `Será que dá pra eu falar com alguém da ${nomeEmpresa(empresa)} uns 10 minutos, sem compromisso?`,
      "Pode ser ligação, Meet, o que for mais tranquilo. Quero só entender como o cliente chega até vocês.",
      "Você que olha isso, ou tem outra pessoa que eu deveria procurar?",
    ],
  },
  {
    id: "landing-1",
    label: "Landing",
    baloes: (empresa) => [
      "Oi, tudo bem?",
      "Aqui é o Alessandro, da Conect Web Mídia.",
      "Tô tentando falar com quem cuida do cliente aí, de um jeito bem direto, sem enrolação.",
      `Passei na ${nomeEmpresa(empresa)} porque achei que vale um papo curto, só pra te ouvir.`,
      "Se topar, marcamos uma ligação sem compromisso. Se não for pra agora, sem problema. Consegue me ajudar com isso?",
    ],
  },
  {
    id: "sistema-1",
    label: "Sistema",
    baloes: (empresa) => [
      "Fala, tudo certo?",
      "Alessandro, Conect Web Mídia.",
      `Queria me conectar com alguém da ${nomeEmpresa(empresa)} que organiza o atendimento, pra não ficar te enchendo se não for com você.`,
      "É uma conversa de gente, não apresentação de pacote. Quero entender onde o cliente trava.",
      "Dá pra marcar uma ligação curta, sem compromisso, ou prefere que eu mande um áudio?",
    ],
  },
  {
    id: "reuniao-2",
    label: "Conversa",
    baloes: (empresa) => [
      "Oi, tudo bem?",
      "Sou o Alessandro, da equipe Conect Web Mídia.",
      `Tô procurando a pessoa da ${nomeEmpresa(empresa)} que conversa com o cliente. Se for você, ótimo. Se não for, me aponta, por favor.`,
      "Queria só um papo sem compromisso, 10 minutos, pra ver se a gente consegue facilitar a vida de vocês.",
      "Se não fizer sentido, a gente nem continua. Topa uma ligação essa semana?",
    ],
  },
  {
    id: "google-1",
    label: "Google",
    baloes: (empresa) => [
      "E aí, tudo bem?",
      "Alessandro da Conect Web Mídia. Desculpa chegar do nada.",
      `Quando alguém procura vocês, a ${nomeEmpresa(empresa)} consegue atender com calma, ou o WhatsApp fica cheio demais?`,
      "Não preciso de resposta longa. Queria só falar com quem olha isso aí.",
      "Se puder, marcamos uma ligação sem compromisso. Você seria a pessoa, ou me passa alguém?",
    ],
  },
  {
    id: "whats-1",
    label: "WhatsApp",
    baloes: (empresa) => [
      "Oi, tudo bem?",
      "Aqui é o Alessandro, da Conect Web Mídia.",
      `Te achei pelo WhatsApp da ${nomeEmpresa(empresa)} e quis ser discreto: tô procurando quem atende o cliente, pra uma conversa rápida.`,
      "Sem reunião formal, sem pressão. Uma ligação curta, sem compromisso, só pra eu te ouvir.",
      "Consegue me ajudar a chegar nessa pessoa?",
    ],
  },
  {
    id: "anuncio-1",
    label: "Anúncio",
    baloes: (empresa) => [
      "Fala, tudo certo?",
      "Alessandro falando, Conect Web Mídia.",
      "Tô mais pra procurador do cliente do que pra vendedor agora: quero entender como a pessoa chega até vocês e se alguém atende direito.",
      `Na ${nomeEmpresa(empresa)} quem cuida disso? Você, ou tem outra pessoa?`,
      "Se topar, a gente marca uma ligação sem compromisso. Se não for o momento, me fala que eu não insisto.",
    ],
  },
  {
    id: "horario-1",
    label: "Horário",
    baloes: (empresa) => [
      "Oi, beleza?",
      "Sou o Alessandro, da Conect Web Mídia.",
      `Queria encaixar um horário leve com alguém da ${nomeEmpresa(empresa)}, só pra conversar, sem compromisso.`,
      "Pode ser 10 minutos no telefone, no intervalo de vocês. Eu pergunto, vocês falam, e a gente vê se faz sentido.",
      "Me aponta a pessoa certa, ou me diz um horário que eu ligo pra você.",
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
