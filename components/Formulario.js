"use client";

import { useEffect, useState } from "react";
import { CONFIG, FLUXOS } from "../lib/formulario";
import { criarLead } from "../lib/leads";
import { trackPixel } from "../lib/pixel";
import { CNH_OPCOES, LIMITES, celularWhatsapp, formatarWhatsapp } from "../lib/security";
import LoginButton from "./LoginButton";

const OPCOES = [
  {
    tipo: "FINANCIAMENTO",
    titulo: "Financiamento",
    desc: "Simule parcelas e entrada para sair de moto nova.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M6 18h36" stroke="currentColor" strokeWidth="2" />
        <path d="M14 26h8M14 32h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="34" cy="27" r="4" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    tipo: "CONSÓRCIO",
    titulo: "Consórcio",
    desc: "Planeje a compra com parcelas que cabem no bolso.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" />
        <path d="M24 14v10l7 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    tipo: "CONHECER MOTOS",
    titulo: "Conhecer motos",
    desc: "Descubra o modelo certo e fale com o consultor.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <circle cx="12" cy="34" r="6" stroke="currentColor" strokeWidth="2" />
        <circle cx="36" cy="34" r="6" stroke="currentColor" strokeWidth="2" />
        <path d="M18 34h8l6-10h6M22 24h-6l-4 10M26 24l-4-8h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function montarMensagem(tipo, respostas, contato = {}) {
  const linhas = [`*Novo atendimento ${CONFIG.nomeLoja}*`, `Interesse: ${tipo}`, ""];
  if (contato.nome) linhas.push(`Nome: ${contato.nome}`);
  if (contato.whatsapp) linhas.push(`WhatsApp: ${contato.whatsapp}`);
  Object.entries(respostas).forEach(([chave, valor]) => {
    linhas.push(`${chave}: ${valor}`);
  });
  linhas.push("", "Cliente clicou no formulário e enviou pelo WhatsApp.");
  return linhas.join("\n");
}

function observacaoDasRespostas(respostas) {
  return Object.entries(respostas)
    .map(([chave, valor]) => `${chave}: ${valor}`)
    .join(" · ")
    .slice(0, LIMITES.observacao);
}

export default function Formulario() {
  const [tela, setTela] = useState("home");
  const [tipo, setTipo] = useState("");
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [nomeCliente, setNomeCliente] = useState("");
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [enviandoDados, setEnviandoDados] = useState(false);
  const [dadosSalvos, setDadosSalvos] = useState(false);
  const [confirmarTelefone, setConfirmarTelefone] = useState(false);
  const [erroDados, setErroDados] = useState("");

  const perguntas = FLUXOS[tipo] || [];
  const atual = perguntas[passo];
  const mensagem = montarMensagem(tipo, respostas, { nome: nomeCliente, whatsapp: whatsappCliente });
  const whatsappHref = `https://wa.me/${CONFIG.whatsappLoja}?text=${encodeURIComponent(mensagem)}`;

  function irHome() {
    setTela("home");
    setTipo("");
    setPasso(0);
    setRespostas({});
    setEnviandoDados(false);
    setDadosSalvos(false);
    setConfirmarTelefone(false);
    setErroDados("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    setNomeCliente(window.localStorage.getItem("honda-cliente-nome") || "");
    setWhatsappCliente(window.localStorage.getItem("honda-cliente-whatsapp") || "");
  }, []);

  function iniciar(novoTipo) {
    setTipo(novoTipo);
    setPasso(0);
    setRespostas({});
    setDadosSalvos(false);
    setConfirmarTelefone(false);
    setErroDados("");
    setTela("quiz");
    trackPixel("ViewContent", { content_name: novoTipo, content_category: "formulario" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function escolher(chave, valor) {
    const proximas = { ...respostas, [chave]: valor };
    setRespostas(proximas);
    if (passo + 1 < perguntas.length) {
      setPasso(passo + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setTela("sucesso");
    trackPixel("Lead", { content_name: tipo, content_category: "formulario" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltar() {
    if (passo === 0) {
      irHome();
      return;
    }
    setPasso(passo - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarDados(event) {
    event.preventDefault();
    if (dadosSalvos || enviandoDados) return;
    setErroDados("");
    const nome = nomeCliente.trim();
    const whatsapp = celularWhatsapp(whatsappCliente);
    if (nome.length < 2) {
      setErroDados("Preencha seu nome.");
      return;
    }
    if (!whatsapp) {
      setErroDados("Confira o WhatsApp: DDD + 9 + 8 números. Ex: (11) 99999-9999.");
      setConfirmarTelefone(false);
      return;
    }
    if (!confirmarTelefone) {
      setWhatsappCliente(formatarWhatsapp(whatsapp));
      setConfirmarTelefone(true);
      return;
    }

    setEnviandoDados(true);
    try {
      const guarda = await fetch("/api/lead-guard", { method: "POST" });
      if (guarda.status === 429) {
        setErroDados("Muitas tentativas. Espere alguns minutos.");
        return;
      }
      await criarLead({
        nome,
        whatsapp,
        tipo,
        modelo: respostas.Modelo || "",
        observacao: observacaoDasRespostas(respostas),
        origem: "formulario",
        cnh: CNH_OPCOES.includes(respostas.CNH) ? respostas.CNH : "Não",
        respostas,
      });
      window.localStorage.setItem("honda-cliente-nome", nome);
      window.localStorage.setItem("honda-cliente-whatsapp", formatarWhatsapp(whatsapp));
      setDadosSalvos(true);
      setConfirmarTelefone(false);
      trackPixel("CompleteRegistration", { content_name: tipo });
    } catch (error) {
      setErroDados("Não foi possível salvar. Tente de novo ou envie pelo WhatsApp.");
    } finally {
      setEnviandoDados(false);
    }
  }

  return (
    <>
      <div className="bg-glow" aria-hidden="true" />

      <header className="topbar">
        <button className="brand" type="button" onClick={irHome} aria-label="Voltar ao início">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-text">
            <strong>HONDA</strong>
            <small>Atendimento ao cliente</small>
          </span>
        </button>
        <LoginButton />
      </header>

      <main>
        {tela === "home" && (
          <section className="view">
            <p className="eyebrow">É só clicar</p>
            <h1>Como podemos te ajudar hoje?</h1>
            <p className="lead">
              Escolha uma opção. Depois é só ir clicando. No final, um toque envia tudo no WhatsApp do consultor.
            </p>
            <div className="cards">
              {OPCOES.map((opcao) => (
                <button key={opcao.tipo} className="card" type="button" onClick={() => iniciar(opcao.tipo)}>
                  <span className="card-icon" aria-hidden="true">{opcao.icon}</span>
                  <span className="card-body">
                    <span className="card-title">{opcao.titulo}</span>
                    <span className="card-desc">{opcao.desc}</span>
                  </span>
                  <span className="card-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {tela === "quiz" && atual && (
          <section className="view">
            <button className="back" type="button" onClick={voltar}>← Voltar</button>
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${((passo + 1) / perguntas.length) * 100}%` }} />
            </div>
            <p className="eyebrow">{tipo} · {passo + 1} de {perguntas.length}</p>
            <h1>{atual.pergunta}</h1>
            <div className="options">
              {atual.opcoes.map((opcao) => (
                <button key={opcao} className="option" type="button" onClick={() => escolher(atual.key, opcao)}>
                  {opcao}
                </button>
              ))}
            </div>
          </section>
        )}

        {tela === "sucesso" && (
          <section className="view">
            <p className="eyebrow">Pronto</p>
            <h1>Toque para enviar ao consultor</h1>
            <p className="lead">
              Todas as respostas já estão juntas. O WhatsApp abre com a mensagem pronta para o vendedor.
            </p>
            <div className="preview">{mensagem}</div>
            <a
              className="btn-whatsapp"
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackPixel("Contact", { content_name: tipo, content_category: "whatsapp" })}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M20.5 3.5A11 11 0 0 0 2.1 16.7L1 23l6.5-1.1A11 11 0 1 0 20.5 3.5zm-8.5 18a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.8.6.6-3.7-.2-.3A9.1 9.1 0 1 1 12 21.5zm5.2-6.8c-.3-.1-1.6-.8-1.9-.9s-.4-.1-.6.1-.7.9-.8 1c-.2.2-.3.2-.6.1a7.5 7.5 0 0 1-2.2-1.4 8.3 8.3 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.3-.4.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.5-.8-2s-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.5 4 15 15 0 0 0 1.5.5 3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3z" />
              </svg>
              Enviar no WhatsApp
            </a>

            <form className="chamada-box" autoComplete="on" onSubmit={salvarDados}>
              <p className="chamada-tag">Quer que o vendedor te chame?</p>
              <h2>Adicione seu nome e WhatsApp</h2>
              <p>Se o celular já tiver esses dados, o preenchimento automático completa para você.</p>
              {dadosSalvos ? (
                <p className="chamada-ok">Pronto! O consultor vai te chamar no WhatsApp.</p>
              ) : (
                <>
                  <label>
                    Seu nome
                    <input
                      type="text"
                      name="name"
                      autoComplete="name"
                      autoCapitalize="words"
                      autoCorrect="off"
                      required
                      maxLength={LIMITES.nome}
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      placeholder="Nome completo"
                    />
                  </label>
                  <label className={`campo-telefone ${celularWhatsapp(whatsappCliente) ? "is-ok" : whatsappCliente ? "is-bad" : ""}`}>
                    Confira seu WhatsApp
                    <input
                      type="tel"
                      name="tel"
                      autoComplete="tel-national"
                      inputMode="tel"
                      required
                      maxLength={16}
                      value={whatsappCliente}
                      onChange={(e) => {
                        setConfirmarTelefone(false);
                        setWhatsappCliente(formatarWhatsapp(e.target.value));
                      }}
                      placeholder="(11) 99999-9999"
                    />
                  </label>
                  {whatsappCliente && (
                    <p className={`telefone-status ${celularWhatsapp(whatsappCliente) ? "is-ok" : "is-bad"}`}>
                      {celularWhatsapp(whatsappCliente)
                        ? `Número válido: ${formatarWhatsapp(whatsappCliente)}`
                        : "WhatsApp incompleto. Use DDD + 9 + 8 números."}
                    </p>
                  )}
                  {confirmarTelefone && (
                    <div className="telefone-confirme">
                      <p>Confira o número antes de enviar</p>
                      <strong>{formatarWhatsapp(whatsappCliente)}</strong>
                      <p>Este WhatsApp está certo?</p>
                    </div>
                  )}
                  {erroDados && <p className="erro">{erroDados}</p>}
                  <button className="btn-chamada" type="submit" disabled={enviandoDados}>
                    {enviandoDados
                      ? "Enviando..."
                      : confirmarTelefone
                        ? "Sim, número certo · Enviar"
                        : "Verificar e enviar dados"}
                  </button>
                  {confirmarTelefone && (
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={() => setConfirmarTelefone(false)}
                    >
                      Corrigir número
                    </button>
                  )}
                </>
              )}
            </form>

            <button className="btn-ghost" type="button" onClick={irHome}>Começar de novo</button>
          </section>
        )}
      </main>

      <footer>
        <p>Atendimento Honda · respostas vão direto para o consultor no WhatsApp</p>
      </footer>
    </>
  );
}
