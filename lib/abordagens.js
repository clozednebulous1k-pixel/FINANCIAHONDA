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

/** Mensagens pré-prontas no tom do Matheus Ormond (Honda 0km). Sempre terminam com pergunta sobre a compra. */
export const MENSAGENS_PRONTAS = [
  // —— Abertura modelo ——
  {
    id: "abertura-modelo-1",
    label: "Abertura modelo 1",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Opa${n ? `, ${n}` : ""}, beleza?\n\n` +
        `Vi que você respondeu nosso formulário e demonstrou interesse em uma Honda 0km 🏍️\n\n` +
        `Qual modelo você está pensando em comprar?`
      );
    },
  },
  {
    id: "abertura-modelo-2",
    label: "Abertura modelo 2",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `E aí${n ? `, ${n}` : ""}! Tudo bem?\n\n` +
        `Chegou seu contato pelo formulário sobre Honda 0km.\n\n` +
        `Qual modelo você quer comprar: CG, Biz, Pop, XRE ou outro?`
      );
    },
  },
  {
    id: "abertura-modelo-3",
    label: "Abertura modelo 3",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Oi${n ? ` ${n}` : ""}! Beleza?\n\n` +
        `Vi seu interesse em moto Honda 0km no formulário e queria te ajudar rapidinho.\n\n` +
        `Qual modelo está na sua mira pra comprar?`
      );
    },
  },
  {
    id: "abertura-modelo-4",
    label: "Abertura modelo 4",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Fala${n ? ` ${n}` : ""}! Suave?\n\n` +
        `Você preencheu o formulário pedindo info de Honda 0km.\n\n` +
        `Me conta: qual modelo você pretende comprar?`
      );
    },
  },

  // —— Abertura condições ——
  {
    id: "abertura-condicoes-1",
    label: "Abertura condições 1",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Fala${n ? ` ${n}` : ""}! Tudo certo?\n\n` +
        `Vi que você se interessou por uma Honda 0km através do nosso formulário.\n` +
        `Já te passo preço, entrada e condições de financiamento.\n\n` +
        `Qual modelo você está procurando pra comprar?`
      );
    },
  },
  {
    id: "abertura-condicoes-2",
    label: "Abertura condições 2",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Oi${n ? ` ${n}` : ""}! Tudo bem?\n\n` +
        `Recebi seu lead do formulário de Honda 0km.\n` +
        `Posso te montar as condições com entrada e parcelas.\n\n` +
        `Qual modelo você quer comprar pra eu simular?`
      );
    },
  },
  {
    id: "abertura-condicoes-3",
    label: "Abertura condições 3",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Opa${n ? `, ${n}` : ""}! Beleza?\n\n` +
        `Vi seu interesse em financiar Honda 0km pelo formulário.\n` +
        `Te ajudo com preço e melhores condições.\n\n` +
        `Qual moto você está pensando em comprar?`
      );
    },
  },
  {
    id: "abertura-condicoes-4",
    label: "Abertura condições 4",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `E aí${n ? ` ${n}` : ""}! Tudo certo?\n\n` +
        `Seu formulário de Honda 0km chegou aqui.\n` +
        `Consigo te passar valores de entrada e financiamento agora.\n\n` +
        `Qual modelo você quer que eu calcule pra compra?`
      );
    },
  },

  // —— Apresentação Matheus ——
  {
    id: "abertura-apresentacao-1",
    label: "Apresentação 1",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Oi${n ? ` ${n}` : ""}! Tudo bem?\n\n` +
        `Aqui é o Matheus Ormond, da Honda.\n` +
        `Vi seu interesse em moto 0km e posso te ajudar com as melhores condições.\n\n` +
        `Qual modelo você quer comprar?`
      );
    },
  },
  {
    id: "abertura-apresentacao-2",
    label: "Apresentação 2",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Fala${n ? ` ${n}` : ""}! Beleza?\n\n` +
        `Sou o Matheus Ormond, consultor Honda.\n` +
        `Vi que você pediu info de moto 0km no formulário.\n\n` +
        `Qual modelo você está querendo comprar?`
      );
    },
  },
  {
    id: "abertura-apresentacao-3",
    label: "Apresentação 3",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Opa${n ? `, ${n}` : ""}! Tudo certo?\n\n` +
        `Matheus Ormond falando, da Honda.\n` +
        `Chegou seu contato sobre Honda 0km e tô aqui pra te ajudar.\n\n` +
        `Qual moto você pretende comprar?`
      );
    },
  },
  {
    id: "abertura-apresentacao-4",
    label: "Apresentação 4",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Oi${n ? ` ${n}` : ""}! Suave?\n\n` +
        `Aqui é Matheus Ormond (Honda).\n` +
        `Vi seu interesse em 0km e posso te mostrar as condições disponíveis.\n\n` +
        `Qual modelo você tem em mente pra comprar?`
      );
    },
  },

  // —— Follow-ups ——
  {
    id: "follow-modelo",
    label: "Pedir modelo",
    texto: () =>
      `Fechou! Pra eu te passar as opções e valores certinhos…\n\n` +
      `Qual modelo você está pensando em comprar (CG, Biz, Pop, XRE…)?`,
  },
  {
    id: "follow-financiamento",
    label: "Financiamento",
    texto: () =>
      `Perfeito. Consigo montar as condições de financiamento pra você.\n\n` +
      `Você prefere financiar ou consórcio pra comprar a moto?`,
  },
  {
    id: "follow-entrada",
    label: "Entrada",
    texto: () =>
      `Show! Com ou sem entrada muda bastante a parcela.\n\n` +
      `Você já tem um valor de entrada em mente pra comprar a moto?`,
  },
  {
    id: "follow-visita",
    label: "Convidar loja",
    texto: () =>
      `Posso te receber na loja pra ver a Honda 0km de perto e fechar as condições.\n\n` +
      `Qual dia fica melhor pra você vir ver a moto?`,
  },
  {
    id: "follow-cnh",
    label: "Confirmar CNH",
    texto: () =>
      `Pra acelerar a liberação do financiamento da moto…\n\n` +
      `Você já tem CNH categoria A?`,
  },
  {
    id: "follow-retorno",
    label: "Retorno",
    texto: (nome) => {
      const n = primeiroNome(nome);
      return (
        `Opa${n ? ` ${n}` : ""}! Passando de novo aqui 👊\n\n` +
        `Ainda está de olho em uma Honda 0km?\n\n` +
        `Qual modelo você quer comprar?`
      );
    },
  },
];

/** Só aberturas — usadas no “Chamar quem não foi chamado” (rotaciona pra evitar texto idêntico). */
const TEMPLATES = MENSAGENS_PRONTAS.filter((m) => String(m.id).startsWith("abertura-"));

export function montarAbordagem(nome, indice = 0) {
  const item = TEMPLATES[Math.abs(indice) % TEMPLATES.length];
  return item.texto(nome);
}

export function textoMensagemPronta(id, nome = "") {
  const item = MENSAGENS_PRONTAS.find((m) => m.id === id);
  if (!item) return "";
  return item.texto(nome);
}

/** Intervalo entre disparos em massa (≈45–85s) para reduzir risco de ban. */
export function delayAntiBanMs() {
  return 45000 + Math.floor(Math.random() * 40000);
}

export function telefoneE164(valor) {
  const local = celularWhatsapp(valor) || validarWhatsapp(valor);
  if (!local) return "";
  const digits = soDigitos(local);
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}
