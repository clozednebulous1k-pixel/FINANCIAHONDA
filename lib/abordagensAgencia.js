import { textoSeguro } from "./security";

function primeiroNome(nome) {
  const limpo = textoSeguro(nome, 40);
  if (!limpo) return "aí";
  const parte = limpo.split(/\s+/)[0];
  if (!parte || parte.length < 2) return "aí";
  return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
}

export const TEXTOS_AGENCIA = [
  {
    id: "site-1",
    label: "Site 1",
    texto: (empresa) => {
      const n = primeiroNome(empresa?.nome);
      return (
        `Oi, tudo bem? Vi a ${n} em ${empresa?.cidade || "da região"} e percebi que ainda não tem um site próprio.\n\n` +
        `A gente monta um site simples pra empresa aparecer no Google e receber cliente no WhatsApp.\n\n` +
        `Posso te mostrar um exemplo em 1 minuto?`
      );
    },
  },
  {
    id: "site-2",
    label: "Site 2",
    texto: (empresa) =>
      `Fala, tudo certo?\n\n` +
      `Passei na ${textoSeguro(empresa?.nome, 60) || "sua empresa"} e vi que o contato ainda depende só de indicação/mapa, sem site.\n\n` +
      `Faço site + WhatsApp organizado pra não perder cliente.\n\n` +
      `Quer que eu te mostre como ficaria o de vocês?`,
  },
  {
    id: "sistema-1",
    label: "Sistema 1",
    texto: (empresa) =>
      `Oi! Tudo bem?\n\n` +
      `Trabalho com sistema e site pra empresa que ainda controla tudo no caderninho/WhatsApp.\n\n` +
      `Vi a ${textoSeguro(empresa?.nome, 60) || "sua empresa"} e achei que um painel simples (agenda, cliente, follow-up) ia ajudar.\n\n` +
      `Te mostro um modelo?`,
  },
  {
    id: "sistema-2",
    label: "Sistema 2",
    texto: (empresa) =>
      `E aí, beleza?\n\n` +
      `Monto software sob medida: agenda, orçamento, estoque ou CRM no WhatsApp.\n\n` +
      `A ${textoSeguro(empresa?.nome, 60) || "sua empresa"} ainda está sem isso, certo?\n\n` +
      `Posso te perguntar rapidinho qual dor é maior aí?`,
  },
];

export function montarAbordagemAgencia(empresa, indice = 0) {
  const item = TEXTOS_AGENCIA[Math.abs(Number(indice) || 0) % TEXTOS_AGENCIA.length];
  return item.texto(empresa);
}
