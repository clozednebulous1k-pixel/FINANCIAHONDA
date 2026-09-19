const fs = require("fs");
const path = require("path");

const arquivos = [
  "c:\\Users\\alesi\\Downloads\\CLIENTES.txt",
  "c:\\Users\\alesi\\Downloads\\CLIENTES 2.txt",
];

const LIXO_NOME =
  /^(rotas|website|compartilhar|resultados|compras na loja|retirada|entrega|refei[cç][aã]o|nenhuma avalia[cç][aã]o|aberto|fechado|s[aã]o paulo|sp)$/i;
const ENDERECO = /^(av\.|rua |r\. |travessa |alameda |pra[cç]a |estrada |rodovia )/i;
const CEP = /^\d{5}-?\d{3}$/;
const NOTA = /^\d,[0-9]/;
const GRANDE =
  /mcdonald|burger king|subway|starbucks|habib|americanas|magazine luiza|magalu|carrefour|assai|droga raia|drogasil|pague menos|\bvivo\b|\bclaro\b|\btim\b|renner|\bcea\b|riachuelo|\bzara\b|chilli beans|\bpetz\b|centauro|casas bahia|tok.?stok|ikea|walmart|ifood|nubank|bradesco|itau|santander|banco do brasil|\bhonda\b|toyota|\bfiat\b|chevrolet|wework|shopping\s+center/i;

function soDigitos(v) {
  return String(v || "").replace(/\D/g, "");
}

function celular(valor, dddHint) {
  let d = soDigitos(valor);
  if (!d) return "";
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 8 && /^[6-9]/.test(d) && dddHint) d = dddHint + "9" + d;
  if (d.length === 9 && d[0] === "9" && dddHint) d = dddHint + d;
  if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = d.slice(0, 2) + "9" + d.slice(2);
  if (d.length !== 11) return "";
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return "";
  if (d[2] !== "9") return "";
  return d;
}

function nomeOk(n) {
  const s = String(n || "").replace(/\s+/g, " ").trim();
  if (s.length < 3 || s.length > 90) return "";
  if (LIXO_NOME.test(s)) return "";
  if (ENDERECO.test(s)) return "";
  if (CEP.test(s)) return "";
  if (NOTA.test(s)) return "";
  if (/^\d+$/.test(s)) return "";
  if (s.startsWith('"') || s.startsWith("“")) return "";
  return s;
}

function ehBlocoEmpresa(lines, i) {
  const a = (lines[i] || "").trim();
  const b = (lines[i + 1] || "").trim();
  return Boolean(a && a === b && nomeOk(a));
}

function parse(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let lastDdd = "11";
  for (let i = 0; i < lines.length; i += 1) {
    if (!ehBlocoEmpresa(lines, i)) continue;
    const nome = nomeOk(lines[i].trim());
    if (!nome) continue;
    let fim = Math.min(lines.length, i + 7);
    for (let j = i + 2; j < fim; j += 1) {
      if (ehBlocoEmpresa(lines, j)) {
        fim = j;
        break;
      }
    }
    const bloco = lines.slice(i, fim).join(" ");
    const tels = [...bloco.matchAll(/\(?(\d{2})\)?\s*(\d{4,5})[-\s]?(\d{4})/g)];
    let fone = "";
    for (const m of tels) {
      const cand = celular(m[0], lastDdd);
      if (cand) {
        fone = cand;
        lastDdd = cand.slice(0, 2);
        break;
      }
    }
    if (!fone) {
      const m2 = bloco.match(/\b(\d{4,5})-(\d{4})\b/);
      if (m2) fone = celular(m2[0], lastDdd);
    }
    if (!fone) continue;
    if (GRANDE.test(nome)) continue;
    out.push([nome, fone]);
    i = fim - 1;
  }
  return out;
}

const vistos = new Set();
const lista = [];
const stats = [];
for (const arq of arquivos) {
  const raw = fs.readFileSync(arq, "utf8");
  const itens = parse(raw);
  stats.push({ arquivo: path.basename(arq), brutos: itens.length });
  for (const [n, w] of itens) {
    if (vistos.has(w)) continue;
    vistos.add(w);
    lista.push([n, w]);
  }
}

const dest = path.join(__dirname, "..", "lib", "listaClientes.dados.js");
const corpo =
  "export const LISTA_CLIENTES = " +
  JSON.stringify(lista) +
  ";\n";
fs.writeFileSync(dest, corpo, "utf8");

const resumo = {
  stats,
  unicos: lista.length,
  amostra: lista.slice(0, 15),
  final: lista.slice(-8),
  bytes: Buffer.byteLength(corpo),
};
fs.writeFileSync(path.join(__dirname, "parse-clientes.out.json"), JSON.stringify(resumo, null, 2), "utf8");
console.log(JSON.stringify(resumo, null, 2));
