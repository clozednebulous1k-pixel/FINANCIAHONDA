export const TIPOS_LEAD = ["CONSTATANDO", "FINANCIAMENTO", "CONSÓRCIO", "CONHECER MOTOS"];
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

export const EMAIL_HONDA = "matheus.honda@gmail.com";
export const EMAIL_AFILIADOS_PADRAO = "afiliados.crm@gmail.com";

function emailEnvAfiliados() {
  try {
    const a = process.env.EMAIL_AFILIADOS;
    const b = process.env.NEXT_EMAIL_AFILIADOS;
    const c = process.env.NEXT_PUBLIC_EMAIL_AFILIADOS;
    return String(a || b || c || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export const EMAIL_AFILIADOS = emailEnvAfiliados() || EMAIL_AFILIADOS_PADRAO;

export const EMAILS_PERMITIDOS = [...new Set([EMAIL_HONDA, EMAIL_AFILIADOS_PADRAO, EMAIL_AFILIADOS].filter(Boolean))];

export function emailPermitido(email) {
  const limpo = validarEmail(email);
  return Boolean(limpo && EMAILS_PERMITIDOS.includes(limpo));
}

export function podeAcessarAfiliados(email) {
  return emailPermitido(email);
}

export function crmDoEmail(email) {
  const limpo = validarEmail(email);
  if (limpo === EMAIL_HONDA) return "honda";
  if (EMAILS_PERMITIDOS.includes(limpo) && limpo !== EMAIL_HONDA) return "afiliados";
  return "";
}

export function rotaDoCrm(email) {
  return crmDoEmail(email) === "afiliados" ? "/afiliados" : "/painel";
}

export function loginDoCrm(crm) {
  return crm === "afiliados" ? "/login-afiliados" : "/login";
}

export function chaveWhatsapp(valor) {
  let digits = soDigitos(valor, 13);
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

export function validarWhatsapp(valor) {
  const digits = soDigitos(valor);
  if (digits.length < 10 || digits.length > 13) return "";
  return digits;
}

export function celularWhatsapp(valor) {
  let digits = soDigitos(valor, 13);
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.length !== 11) return "";
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return "";
  if (digits[2] !== "9") return "";
  return digits;
}

export function formatarWhatsapp(valor) {
  const digits = celularWhatsapp(valor) || soDigitos(valor, 13).replace(/^55/, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
