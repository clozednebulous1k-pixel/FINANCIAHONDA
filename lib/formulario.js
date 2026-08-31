export const CONFIG = {
  whatsappLoja: "5511947539917",
  nomeLoja: "Honda",
};

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
