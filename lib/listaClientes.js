import { LISTA_CLIENTES } from "./listaClientes.dados";
import { celularWhatsapp, textoSeguro } from "./security";

export { LISTA_CLIENTES };

const NOME_FRACO =
  /^(lima|diadema|cargo|consult[oó]rio|comercio fechado|gerente comercial|buzzup)$/i;

export function nomeListaCurto(nome) {
  let s = String(nome || "").split("|")[0].split("/")[0].trim();
  s = s.replace(/\s+/g, " ");
  if (s.length > 48) {
    const corte = s.slice(0, 48);
    const sp = corte.lastIndexOf(" ");
    s = (sp > 18 ? corte.slice(0, sp) : corte).trim();
  }
  return textoSeguro(s, 50) || "sua empresa";
}

export function fatiaListaClientes({ excluir = [], cursor = 0, limite = 10 } = {}) {
  const bloqueados = new Set(
    (Array.isArray(excluir) ? excluir : [])
      .map((n) => celularWhatsapp(n) || String(n || "").replace(/\D/g, ""))
      .filter(Boolean),
  );
  const empresas = [];
  let i = Math.max(0, Number(cursor) || 0);
  const max = Math.min(Math.max(Number(limite) || 10, 1), 20);
  while (i < LISTA_CLIENTES.length && empresas.length < max) {
    const [nomeBruto, fone] = LISTA_CLIENTES[i] || [];
    i += 1;
    const nome = nomeListaCurto(nomeBruto);
    if (NOME_FRACO.test(nome)) continue;
    const cel = celularWhatsapp(fone);
    if (!cel || bloqueados.has(cel) || bloqueados.has(`55${cel}`)) continue;
    bloqueados.add(cel);
    empresas.push({
      id: `lista-${cel}`,
      nome,
      whatsapp: cel,
      whatsappOk: true,
      cidade: "São Paulo",
      bairro: "",
      endereco: "",
      categoria: "lista",
      site: "",
      precisaSite: true,
      precisaSoftware: true,
      porte: 1,
      motivo: "Lista",
      origem: "lista",
    });
  }
  return {
    empresas,
    cursor: i,
    restantes: Math.max(0, LISTA_CLIENTES.length - i),
    total: LISTA_CLIENTES.length,
    esgotada: i >= LISTA_CLIENTES.length,
  };
}
