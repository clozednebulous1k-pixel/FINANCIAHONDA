import { celularWhatsapp, soDigitos, textoSeguro, validarWhatsapp } from "./security";

const TEMPLATES = [
  (nome) =>
    `Olá${nome ? `, ${nome}` : ""}! Aqui é da Honda. Vi seu interesse em financiamento/consórcio de moto. Posso te ajudar com uma simulação rápida?`,
  (nome) =>
    `Oi${nome ? ` ${nome}` : ""}! Sou da equipe Honda. Recebemos seu contato sobre moto. Qual modelo você tem em mente?`,
  (nome) =>
    `Bom dia${nome ? `, ${nome}` : ""}! Passando pra confirmar seu interesse na Honda. Quer que eu monte as melhores condições pra você?`,
  (nome) =>
    `Olá${nome ? ` ${nome}` : ""}! Tudo bem? Vi que você pediu info de financiamento Honda. Posso te mostrar opções com e sem entrada.`,
  (nome) =>
    `Oi${nome ? `, ${nome}` : ""}! Aqui da Honda. Seu lead chegou pra gente — prefere falar de financiamento, consórcio ou só conhecer os modelos?`,
  (nome) =>
    `E aí${nome ? `, ${nome}` : ""}! Sou consultor Honda. Posso te ajudar a achar a moto certa e simular as parcelas agora?`,
];

function primeiroNome(nome) {
  const limpo = textoSeguro(nome, 40);
  if (!limpo) return "";
  const parte = limpo.split(/\s+/)[0];
  if (!parte || parte.length < 2 || /^_/.test(parte)) return "";
  return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
}

export function montarAbordagem(nome, indice = 0) {
  const fn = TEMPLATES[Math.abs(indice) % TEMPLATES.length];
  return fn(primeiroNome(nome));
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
