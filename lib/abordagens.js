import { celularWhatsapp, soDigitos, textoSeguro, validarWhatsapp } from "./security";

export const VENDEDOR = {
  nome: "Matheus Ormond",
  loja: "Honda",
};

function primeiroNome(nome) {
  const limpo = textoSeguro(nome, 40);
  if (!limpo) return "";
  const parte = limpo.split(/\s+/)[0];
  if (!parte || parte.length < 2 || /^_/.test(parte)) return "";
  return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
}

/** Mensagens pré-prontas no tom do Matheus Ormond (Honda 0km). */
export const MENSAGENS_PRONTAS = [
  {
    id: "abertura-1",
    label: "Abertura modelo",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Opa${n ? `, ${n}` : ""}, beleza?\n\n` +
        `Vi que você respondeu nosso formulário e demonstrou interesse em uma Honda 0km 🏍️\n\n` +
        `Me fala uma coisa: qual modelo você está pensando em comprar?\n` +
        `Assim já te passo as condições e opções disponíveis.`
      );
    },
  },
  {
    id: "abertura-2",
    label: "Abertura condições",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Fala${n ? ` ${n}` : ""}! Tudo certo?\n\n` +
        `Vi que você se interessou por uma Honda 0km através do nosso formulário.\n\n` +
        `Qual modelo você está procurando?\n` +
        `Me passa que eu já verifico preço, entrada e condições de financiamento pra você.`
      );
    },
  },
  {
    id: "abertura-3",
    label: "Apresentação",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Oi${n ? ` ${n}` : ""}! Tudo bem?\n\n` +
        `Aqui é o Matheus Ormond, da Honda.\n` +
        `Vi seu interesse em moto 0km e posso te ajudar com as melhores condições.\n\n` +
        `Qual modelo você tem em mente?`
      );
    },
  },
  {
    id: "follow-modelo",
    label: "Pedir modelo",
    texto: () =>
      `Fechou! Me confirma só o modelo que você está pensando (ex.: CG, Biz, Pop, XRE…)\n` +
      `Que eu já te passo as opções e valores.`,
  },
  {
    id: "follow-financiamento",
    label: "Financiamento",
    texto: () =>
      `Perfeito. Pra eu te passar as condições certinhas, me fala:\n` +
      `• modelo de interesse\n` +
      `• se prefere financiar ou consórcio\n` +
      `• e se tem valor de entrada em mente`,
  },
  {
    id: "follow-visita",
    label: "Convidar loja",
    texto: () =>
      `Show! Quando puder, posso te receber na loja pra ver a moto 0km de perto e fechar as condições.\n` +
      `Qual dia e horário fica melhor pra você?`,
  },
  {
    id: "follow-cnh",
    label: "Confirmar CNH",
    texto: () =>
      `Só pra eu já deixar tudo alinhado: você já tem CNH categoria A?\n` +
      `Isso ajuda a acelerar a liberação do financiamento.`,
  },
  {
    id: "follow-retorno",
    label: "Retorno",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Opa${n ? ` ${n}` : ""}! Passando de novo aqui 👊\n\n` +
        `Ainda está de olho em uma Honda 0km?\n` +
        `Me fala o modelo que eu te mando as condições atualizadas.`
      );
    },
  },
];

const TEMPLATES = MENSAGENS_PRONTAS.filter((m) =>
  ["abertura-1", "abertura-2", "abertura-3", "follow-retorno", "follow-financiamento", "follow-modelo"].includes(m.id),
);

export function montarAbordagem(nome, indice = 0) {
  const item = TEMPLATES[Math.abs(indice) % TEMPLATES.length];
  return item.texto(nome);
}

export function textoMensagemPronta(id, nome = "") {
  const item = MENSAGENS_PRONTAS.find((m) => m.id === id);
  if (!item) return "";
  return item.texto(nome);
}

export function delayAntiBanMs() {
  return 25000 + Math.floor(Math.random() * 20000);
}

export function telefoneE164(valor) {
  const local = celularWhatsapp(valor) || validarWhatsapp(valor);
  if (!local) return "";
  const digits = soDigitos(local);
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}
