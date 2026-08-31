const CONFIG = window.FORMULARIO_HONDA;

const MODELOS = [
  "Ainda não sei / quero indicação",
  "Pop 110i",
  "Navi",
  "Biz 125",
  "Elite 125",
  "CG 160 Start",
  "CG 160 Fan",
  "CG 160 Titan",
  "PCX",
  "ADV",
  "XRE 190",
  "NX 350 Sahara",
  "CB 300F Twister",
  "CB 500F",
  "CB 500X",
  "NC 750X",
  "Outro modelo Honda",
];

const HORARIOS = ["Manhã", "Tarde", "Noite", "Qualquer horário"];

const FLUXOS = {
  FINANCIAMENTO: [
    { key: "Modelo", pergunta: "Qual moto te interessa?", opcoes: MODELOS },
    {
      key: "Entrada",
      pergunta: "Quanto você tem de entrada?",
      opcoes: [
        "Sem entrada / preciso de orientação",
        "Até R$ 2.000",
        "De R$ 2.000 a R$ 5.000",
        "De R$ 5.000 a R$ 10.000",
        "Acima de R$ 10.000",
      ],
    },
    {
      key: "Parcela",
      pergunta: "Qual parcela cabe no bolso?",
      opcoes: [
        "Até R$ 300",
        "De R$ 300 a R$ 500",
        "De R$ 500 a R$ 800",
        "Acima de R$ 800",
        "Quero que o consultor indique",
      ],
    },
    { key: "Horário", pergunta: "Melhor horário para o consultor te chamar?", opcoes: HORARIOS },
  ],
  CONSÓRCIO: [
    { key: "Modelo", pergunta: "Qual moto te interessa?", opcoes: MODELOS },
    {
      key: "Parcela",
      pergunta: "Qual parcela mensal você prefere?",
      opcoes: [
        "Até R$ 250",
        "De R$ 250 a R$ 400",
        "De R$ 400 a R$ 600",
        "Acima de R$ 600",
        "Ainda não sei",
      ],
    },
    {
      key: "Já tem consórcio",
      pergunta: "Você já participa de algum consórcio?",
      opcoes: ["Não, seria o primeiro", "Sim, já tenho consórcio", "Já tive, mas não tenho agora"],
    },
    { key: "Horário", pergunta: "Melhor horário para o consultor te chamar?", opcoes: HORARIOS },
  ],
  "CONHECER MOTOS": [
    {
      key: "Uso",
      pergunta: "O que mais te interessa?",
      opcoes: [
        "Trabalho / dia a dia",
        "Lazer e passeio",
        "Scooter automática",
        "Trail / aventura",
        "Esportiva / naked",
        "Ainda não sei",
      ],
    },
    {
      key: "CNH A",
      pergunta: "Você tem CNH categoria A?",
      opcoes: ["Sim", "Não, ainda vou tirar", "Estou tirando agora"],
    },
    {
      key: "Atendimento",
      pergunta: "Como prefere o atendimento?",
      opcoes: ["Visitar a loja", "Receber WhatsApp", "Tanto faz"],
    },
    { key: "Horário", pergunta: "Melhor horário para o consultor te chamar?", opcoes: HORARIOS },
  ],
};

const views = {
  home: document.getElementById("view-home"),
  quiz: document.getElementById("view-quiz"),
  sucesso: document.getElementById("view-sucesso"),
};

const state = {
  tipo: "",
  passo: 0,
  respostas: {},
};

function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    const active = key === name;
    el.classList.toggle("is-active", active);
    el.hidden = !active;
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function perguntas() {
  return FLUXOS[state.tipo] || [];
}

function renderQuiz() {
  const lista = perguntas();
  const atual = lista[state.passo];
  const total = lista.length;
  const progresso = ((state.passo + 1) / total) * 100;

  document.getElementById("quiz-tipo").textContent = `${state.tipo} · ${state.passo + 1} de ${total}`;
  document.getElementById("quiz-pergunta").textContent = atual.pergunta;
  document.getElementById("progress-bar").style.width = `${progresso}%`;

  const caixa = document.getElementById("quiz-opcoes");
  caixa.innerHTML = "";
  atual.opcoes.forEach((opcao) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "option";
    botao.textContent = opcao;
    botao.addEventListener("click", () => escolher(atual.key, opcao));
    caixa.appendChild(botao);
  });
}

function escolher(chave, valor) {
  state.respostas[chave] = valor;
  if (state.passo + 1 < perguntas().length) {
    state.passo += 1;
    renderQuiz();
    return;
  }
  mostrarWhatsApp();
}

function montarMensagem() {
  const linhas = [
    `*Novo atendimento ${CONFIG.nomeLoja}*`,
    `Interesse: ${state.tipo}`,
    "",
  ];
  Object.entries(state.respostas).forEach(([chave, valor]) => {
    linhas.push(`${chave}: ${valor}`);
  });
  linhas.push("", "Cliente clicou no formulário e enviou pelo WhatsApp.");
  return linhas.join("\n");
}

function mostrarWhatsApp() {
  const mensagem = montarMensagem();
  document.getElementById("preview").textContent = mensagem;
  document.getElementById("btn-whatsapp").href =
    `https://wa.me/${CONFIG.whatsappLoja}?text=${encodeURIComponent(mensagem)}`;
  showView("sucesso");
}

function iniciar(tipo) {
  state.tipo = tipo;
  state.passo = 0;
  state.respostas = {};
  renderQuiz();
  showView("quiz");
}

function voltar() {
  if (state.passo === 0) {
    showView("home");
    return;
  }
  state.passo -= 1;
  renderQuiz();
}

function irHome() {
  state.tipo = "";
  state.passo = 0;
  state.respostas = {};
  showView("home");
}

document.querySelectorAll("[data-start]").forEach((botao) => {
  botao.addEventListener("click", () => iniciar(botao.dataset.start));
});
document.getElementById("btn-voltar").addEventListener("click", voltar);
document.getElementById("btn-home").addEventListener("click", irHome);
document.getElementById("btn-outro").addEventListener("click", irHome);

showView("home");
