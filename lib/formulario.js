export const CONFIG = {
  whatsappLoja: "5511947539917",
  nomeLoja: "Yamaha",
  pixelId: "914786401641063",
};

const MODELOS = [
  "Ainda não sei / quero indicação",
  "Factor 150 ED",
  "Factor 150 DX",
  "FZ 15 Fazer ABS Connect",
  "FZ 15 Fazer ABS Connect KT",
  "FZ 25 Fazer ABS",
  "R15 ABS",
  "R15 ABS 70th",
  "YZF R3 ABS Connect",
  "YZF R3 ABS Connect 70th",
  "YZF R7",
  "YZF R7 70th",
  "MT-03 ABS",
  "MT-07 ABS",
  "Tracer 700",
  "XTZ 150 Crosser S",
  "XTZ 150 Crosser Z",
  "XTZ 150 Crosser Z KT",
  "XTZ 250 Lander ABS Connect",
  "XTZ 690 Ténéré",
  "Fluo ABS Hybrid Connect",
  "NMAX Connect 160 ABS",
  "XMAX 300 Connect",
  "Neo's Connected",
  "ZR Hybrid Connect",
  "Aero X",
  "TTR 230",
  "Outro modelo Yamaha",
];

const HORARIOS = ["Manhã", "Tarde", "Noite", "Qualquer horário"];

export const FLUXOS = {
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
        "A partir de R$ 800",
        "De R$ 800 a R$ 1.200",
        "De R$ 1.200 a R$ 2.000",
        "Acima de R$ 2.000",
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
        "A partir de R$ 800",
        "De R$ 800 a R$ 1.200",
        "De R$ 1.200 a R$ 2.000",
        "Acima de R$ 2.000",
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
      key: "CNH",
      pergunta: "Você tem CNH?",
      opcoes: ["Sim", "Não"],
    },
    {
      key: "Atendimento",
      pergunta: "Como prefere o atendimento?",
      opcoes: ["Visitar a loja", "Receber WhatsApp", "Tanto faz"],
    },
    { key: "Horário", pergunta: "Melhor horário para o consultor te chamar?", opcoes: HORARIOS },
  ],
};
