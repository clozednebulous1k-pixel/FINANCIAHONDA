export const TIPOS_LEAD = ["FINANCIAMENTO", "CONSÓRCIO", "CONHECER MOTOS"];
export const ORIGENS_LEAD = ["trafego-pago", "formulario"];
export const STATUS_IDS = [
  "novo",
  "chamou",
  "aguardando_resposta",
  "nao_atendeu",
  "em_atendimento",
  "visita",
  "ganho",
  "perdido",
];
export const CNH_OPCOES = ["Sim", "Não"];

const LIMITES = {
  nome: 120,
  whatsapp: 20,
  modelo: 80,
  observacao: 500,
  email: 120,
  senha: 128,
};

export function textoSeguro(valor, max) {
  return String(valor ?? "")
    .replace(/[<>`$]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export function soDigitos(valor, max = 13) {
  return String(valor ?? "").replace(/\D/g, "").slice(0, max);
}

export function validarEmail(email) {
  const limpo = textoSeguro(email, LIMITES.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return "";
  return limpo;
}

export const EMAILS_PERMITIDOS = ["matheus.honda@gmail.com"];

export function emailPermitido(email) {
  const limpo = validarEmail(email);
  return Boolean(limpo && EMAILS_PERMITIDOS.includes(limpo));
}

export function validarWhatsapp(valor) {
  const digits = soDigitos(valor);
  if (digits.length < 10 || digits.length > 13) return "";
  return digits;
}

export function validarLead(dados) {
  const nome = textoSeguro(dados.nome, LIMITES.nome);
  const whatsapp = validarWhatsapp(dados.whatsapp);
  const tipo = TIPOS_LEAD.includes(dados.tipo) ? dados.tipo : "";
  const modelo = textoSeguro(dados.modelo, LIMITES.modelo);
  const observacao = textoSeguro(dados.observacao, LIMITES.observacao);
  const origem = ORIGENS_LEAD.includes(dados.origem) ? dados.origem : "trafego-pago";
  const cnh = CNH_OPCOES.includes(dados.cnh) ? dados.cnh : "Não";
  const status = validarStatus(dados.status) || "novo";

  if (!nome || !whatsapp || !tipo) {
    throw new Error("Dados inválidos");
  }

  return { nome, whatsapp, tipo, modelo, observacao, origem, cnh, status };
}

export function validarStatus(status) {
  return STATUS_IDS.includes(status) ? status : "";
}

export function validarId(id) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(String(id || "")) ? String(id) : "";
}

export { LIMITES };
