export const RITMOS_AUTO = {
  calmo: {
    id: "calmo",
    label: "Calmo",
    detalhe: "~40 posts/dia · 12 min entre cada",
    minEnvioMs: 12 * 60 * 1000,
    jitterMaxMs: 4 * 60 * 1000,
    intervaloProdutoMin: 15,
    maxMsgs: 40,
    maxProdutos: 40,
    maxGrupos: 15,
  },
  normal: {
    id: "normal",
    label: "Normal",
    detalhe: "~70 posts/dia · 8 min entre cada",
    minEnvioMs: 8 * 60 * 1000,
    jitterMaxMs: 3 * 60 * 1000,
    intervaloProdutoMin: 10,
    maxMsgs: 70,
    maxProdutos: 70,
    maxGrupos: 25,
  },
  volume: {
    id: "volume",
    label: "Volume 100",
    detalhe: "~100 posts/dia · 7 min entre cada · igual os grupos grandes",
    minEnvioMs: 7 * 60 * 1000,
    jitterMaxMs: 2 * 60 * 1000,
    intervaloProdutoMin: 8,
    maxMsgs: 100,
    maxProdutos: 100,
    maxGrupos: 40,
  },
};

export function ritmoAuto(id) {
  return RITMOS_AUTO[id] || RITMOS_AUTO.volume;
}
