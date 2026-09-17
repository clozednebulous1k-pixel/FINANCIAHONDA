"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import WhatsappStatus from "../../components/WhatsappStatus";
import {
  atualizarGrupoAfiliado,
  criarGrupoAfiliado,
  excluirGrupoAfiliado,
  ouvirConfigAfiliados,
  ouvirGruposAfiliados,
  registrarDisparoAfiliado,
  salvarConfigAfiliados,
} from "../../lib/afiliados";
import { emailPermitido, loginDoCrm, validarWhatsapp } from "../../lib/security";
import { montarTextoOferta } from "../../lib/textoAchadinho";
import { ritmoAuto, RITMOS_AUTO } from "../../lib/ritmoAfiliados";

const MENUS = [
  { id: "ofertas", label: "Robô", icon: "🤖" },
  { id: "grupos", label: "Grupos", icon: "👥" },
  { id: "disparo", label: "Postar", icon: "🚀" },
  { id: "auto", label: "Auto", icon: "⏰" },
  { id: "conexao", label: "Conexão", icon: "📶" },
  { id: "config", label: "Links", icon: "🔗" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayGrupoMs() {
  return 8000 + Math.floor(Math.random() * 7000);
}

export default function AfiliadosPage() {
  const router = useRouter();
  const { user, loading, logout, pronto } = useAuth();
  const [menu, setMenu] = useState("ofertas");
  const [waConectado, setWaConectado] = useState(false);
  const [erro, setErro] = useState("");
  const [grupos, setGrupos] = useState([]);
  const [config, setConfig] = useState({
    meliAffiliateId: "",
    meliAffiliateWord: "",
    shopeeAffiliateId: "",
    autoAtivo: false,
    autoRitmo: "volume",
    autoIntervaloMin: 8,
    autoMaxDia: 100,
    autoHoraIni: 8,
    autoHoraFim: 22,
    autoGancho: "🔥 ACHADINHO",
    autoStatus: "",
    autoMsgsDia: 0,
    autoProdutosDia: 0,
    autoDia: "",
    autoLastTitulo: "",
    autoLastGrupo: "",
  });
  const [termo, setTermo] = useState("oferta do dia");
  const [origem, setOrigem] = useState("todos");
  const [soPromo, setSoPromo] = useState(true);
  const [produtos, setProdutos] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionados, setSelecionados] = useState({});
  const [textoExtra, setTextoExtra] = useState("🔥 ACHADINHO");
  const [disparando, setDisparando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [syncGrupos, setSyncGrupos] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ nome: "", tipo: "whatsapp", jid: "", pessoas: "" });
  const [urlOferta, setUrlOferta] = useState("");
  const [importando, setImportando] = useState(false);
  const [modoRobo, setModoRobo] = useState(true);
  const [autoPing, setAutoPing] = useState("");
  const pararRef = useRef(false);

  const escolhidos = useMemo(
    () => produtos.filter((p) => selecionados[p.id]),
    [produtos, selecionados],
  );
  const gruposAtivos = useMemo(() => grupos.filter((g) => g.ativo !== false), [grupos]);
  const preview = useMemo(
    () => (escolhidos[0] ? montarTextoOferta(escolhidos[0], textoExtra) : textoExtra),
    [escolhidos, textoExtra],
  );

  useEffect(() => {
    if (!loading && !user) router.replace(loginDoCrm("afiliados"));
    if (!loading && user && !emailPermitido(user.email)) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return undefined;
    const a = ouvirGruposAfiliados(setGrupos, () => setErro("Sem permissão nos grupos. Publique as regras novas do Firebase."));
    const b = ouvirConfigAfiliados((dados) => {
      setConfig((atual) => ({
        ...atual,
        meliAffiliateId: dados?.meliAffiliateId || "",
        meliAffiliateWord: dados?.meliAffiliateWord || "",
        shopeeAffiliateId: dados?.shopeeAffiliateId || "",
        autoAtivo: Boolean(dados?.autoAtivo),
        autoRitmo: dados?.autoRitmo || "volume",
        autoIntervaloMin: Number(dados?.autoIntervaloMin) || 8,
        autoMaxDia: Number(dados?.autoMaxDia) >= 20 ? Number(dados.autoMaxDia) : 100,
        autoHoraIni: Number(dados?.autoHoraIni) || 8,
        autoHoraFim: Number(dados?.autoHoraFim) || 22,
        autoGancho: dados?.autoGancho || "🔥 ACHADINHO",
        autoStatus: dados?.autoStatus || "",
        autoMsgsDia: Number(dados?.autoMsgsDia) || 0,
        autoProdutosDia: Number(dados?.autoProdutosDia) || 0,
        autoDia: dados?.autoDia || "",
        autoLastTitulo: dados?.autoLastTitulo || "",
        autoLastGrupo: dados?.autoLastGrupo || "",
      }));
    });
    return () => {
      a?.();
      b?.();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    let ativo = true;
    async function checarWa() {
      try {
        const res = await fetch("/api/whatsapp/status?conta=afiliados", { cache: "no-store" });
        const data = await res.json();
        if (ativo) setWaConectado(Boolean(data.connected));
      } catch {
        if (ativo) setWaConectado(false);
      }
    }
    checarWa();
    const timer = setInterval(checarWa, 15000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !config.autoAtivo) return undefined;
    async function ping() {
      try {
        const res = await fetch("/api/afiliados/auto", { method: "POST", cache: "no-store" });
        const data = await res.json();
        if (data.pulou === "sem-admin") {
          setAutoPing("Falta FIREBASE_SERVICE_ACCOUNT_JSON na Vercel para o automático funcionar.");
        } else if (data.pulou === "sem-evolution") {
          setAutoPing("Evolution desligada. O automático não consegue postar.");
        } else {
          setAutoPing("");
        }
      } catch {
        // o próximo ciclo tenta de novo
      }
    }
    ping();
    const timer = setInterval(ping, 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, [user, config.autoAtivo]);

  useEffect(() => {
    if (user && pronto) rodarRobo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pronto]);

  async function buscarOfertas(q, { robo = false } = {}) {
    const query = String(q ?? termo).trim() || "oferta do dia";
    setBuscando(true);
    setErro("");
    setModoRobo(robo);
    try {
      const params = new URLSearchParams({
        q: query,
        origem: robo ? "mercadolivre" : origem,
        promo: soPromo || robo ? "1" : "0",
        meli: config.meliAffiliateId || "",
        meliWord: config.meliAffiliateWord || "",
        shopee: config.shopeeAffiliateId || "",
      });
      if (robo) params.set("robo", "1");
      const res = await fetch(`/api/afiliados/produtos?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na busca");
      setProdutos(Array.isArray(data.produtos) ? data.produtos : []);
      setAvisos(Array.isArray(data.avisos) ? data.avisos : []);
      setTermo(query);
    } catch (error) {
      setErro(error.message || "Não foi possível buscar ofertas");
    } finally {
      setBuscando(false);
    }
  }

  async function rodarRobo() {
    setOrigem("mercadolivre");
    setSoPromo(true);
    await buscarOfertas("preço bom", { robo: true });
  }

  function toggleProduto(id) {
    setSelecionados((atual) => ({ ...atual, [id]: !atual[id] }));
  }

  async function colarLink(event) {
    event.preventDefault();
    if (!urlOferta.trim() || importando) return;
    setImportando(true);
    setErro("");
    try {
      const res = await fetch("/api/afiliados/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlOferta,
          meli: config.meliAffiliateId || "",
          meliWord: config.meliAffiliateWord || "",
          shopee: config.shopeeAffiliateId || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.meli?.tool || data.meli?.word) {
          setConfig((atual) => ({
            ...atual,
            meliAffiliateId: data.meli.tool || atual.meliAffiliateId,
            meliAffiliateWord: data.meli.word || atual.meliAffiliateWord,
          }));
          setMenu("config");
        }
        throw new Error(data.error || "Não foi possível ler o link");
      }
      const item = data.produto;
      setProdutos((lista) => [item, ...lista.filter((p) => p.id !== item.id)]);
      setSelecionados((atual) => ({ ...atual, [item.id]: true }));
      setUrlOferta("");
      setMenu("ofertas");
    } catch (error) {
      setErro(error.message || "Falha ao importar o link");
    } finally {
      setImportando(false);
    }
  }

  async function importarGruposWa() {
    setSyncGrupos(true);
    setErro("");
    try {
      const res = await fetch("/api/afiliados/grupos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao ler grupos");
      const existentes = new Set(grupos.map((g) => g.jid).filter(Boolean));
      let novos = 0;
      for (const item of data.grupos || []) {
        if (!item.jid || existentes.has(item.jid)) continue;
        await criarGrupoAfiliado({
          nome: item.nome,
          tipo: "whatsapp",
          jid: item.jid,
        });
        existentes.add(item.jid);
        novos += 1;
      }
      setProgresso(novos ? `${novos} grupo(s) importado(s) do WhatsApp.` : "Nenhum grupo novo.");
    } catch (error) {
      setErro(error.message || "Falha ao importar grupos");
    } finally {
      setSyncGrupos(false);
    }
  }

  async function salvarLista(event) {
    event.preventDefault();
    setErro("");
    try {
      const pessoas = String(novoGrupo.pessoas || "")
        .split(/[\n,;]+/)
        .map((n) => validarWhatsapp(n))
        .filter(Boolean);
      await criarGrupoAfiliado({
        nome: novoGrupo.nome,
        tipo: novoGrupo.tipo,
        jid: novoGrupo.jid,
        pessoas,
      });
      setNovoGrupo({ nome: "", tipo: "whatsapp", jid: "", pessoas: "" });
    } catch (error) {
      setErro(error.message || "Não foi possível salvar o grupo");
    }
  }

  async function dispararAchadinhos(lista) {
    if (disparando) return;
    const ofertas = (lista || escolhidos).slice(0, 3);
    const fila = gruposAtivos;
    if (!fila.length) {
      setErro("Primeiro importe os grupos em Grupos. Você precisa estar neles no WhatsApp.");
      setMenu("grupos");
      return;
    }
    if (!ofertas.length && !textoExtra.trim()) {
      setErro("Escolha um achadinho ou escreva um texto.");
      return;
    }
    if (!waConectado) {
      setErro("WhatsApp desconectado. Vá em Conexão e leia o QR com o 11 95202-5568.");
      setMenu("conexao");
      return;
    }
    const qtd = Math.max(ofertas.length, textoExtra.trim() ? 1 : 0);
    if (!window.confirm(`Postar ${qtd} achadinho(s) em ${fila.length} grupo(s)? Um por vez, com intervalo de ~8–15s.`)) {
      return;
    }

    pararRef.current = false;
    setDisparando(true);
    setErro("");
    let ok = 0;
    let falhas = 0;
    const rodada = ofertas.length ? ofertas : [null];

    for (let p = 0; p < rodada.length; p += 1) {
      const produto = rodada[p];
      for (let i = 0; i < fila.length; i += 1) {
        if (pararRef.current) break;
        const grupo = fila[i];
        const nomeOferta = produto?.titulo ? String(produto.titulo).slice(0, 40) : "texto";
        setProgresso(`Postando ${p + 1}/${rodada.length} · grupo ${i + 1}/${fila.length}: ${grupo.nome} · ${nomeOferta}`);
        try {
          const res = await fetch("/api/afiliados/disparar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grupo,
              produtos: produto ? [produto] : [],
              texto: textoExtra,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Falha no envio");
          ok += Number(data.enviados || 0);
          falhas += Number(data.falhas || 0);
        } catch (error) {
          falhas += 1;
          setErro(error.message || "Falha no envio");
        }
        if (!pararRef.current && (p < rodada.length - 1 || i < fila.length - 1)) {
          await sleep(delayGrupoMs());
        }
      }
      if (pararRef.current) break;
    }

    try {
      await registrarDisparoAfiliado({
        texto: textoExtra,
        grupos: fila.map((g) => g.nome),
        ok,
        falhas,
      });
    } catch {
      // histórico opcional
    }
    setProgresso(pararRef.current
      ? `Parou. Enviados ${ok}, falhas ${falhas}.`
      : `Pronto. Enviados ${ok}, falhas ${falhas}.`);
    setDisparando(false);
  }

  function postarCard(item) {
    setSelecionados({ [item.id]: true });
    setMenu("disparo");
    dispararAchadinhos([item]);
  }

  async function salvarAuto(patch) {
    const proximo = { ...config, ...patch };
    setConfig(proximo);
    try {
      await salvarConfigAfiliados(proximo);
      if (patch.autoAtivo) {
        setProgresso("Robô automático ligado. Ele busca e posta sozinho, com pausa anti-ban.");
        fetch("/api/afiliados/auto", { method: "POST", cache: "no-store" }).catch(() => {});
      } else if (patch.autoAtivo === false) {
        setProgresso("Robô automático desligado.");
      }
    } catch (error) {
      setErro(error.message || "Não foi possível salvar o automático");
    }
  }

  if (loading || !user) {
    return (
      <main className="crm-shell crm-loading">
        <p>Carregando CRM de afiliados…</p>
      </main>
    );
  }

  return (
    <div className="crm-shell is-afiliados">
      <aside className="crm-nav">
        <div className="crm-brand">
          <span className="crm-mark">A</span>
          <div>
            <strong>CRM Afiliados</strong>
            <small>
              {config.autoAtivo ? "Auto on · " : ""}
              {waConectado ? "11 95202-5568 on" : "11 95202-5568 off"}
            </small>
          </div>
        </div>
        <nav className="crm-menu">
          {MENUS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={menu === item.id ? "is-on" : ""}
              onClick={() => setMenu(item.id)}
            >
              <span className="crm-menu-label">
                <span className="crm-menu-ico" aria-hidden="true">{item.icon}</span>
                {item.label}
              </span>
              {item.id === "grupos" ? <em className="crm-nav-count">{grupos.length}</em> : null}
              {item.id === "disparo" && escolhidos.length ? (
                <em className="crm-nav-badge">{escolhidos.length}</em>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="crm-nav-foot">
          <a href="/painel">CRM Honda</a>
          <button type="button" onClick={() => logout()}>Sair</button>
        </div>
      </aside>

      <main className="crm-main">
        {erro ? <p className="crm-erro-banner">{erro}</p> : null}

        {menu === "ofertas" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Robô de ofertas</h1>
              <p>Busca sozinho itens com preço bom no Mercado Livre e já cola o seu link de afiliado.</p>
            </div>
            <div className="aff-robo-bar">
              <button type="button" className="btn-robo" onClick={rodarRobo} disabled={buscando}>
                {buscando && modoRobo ? "Robô vasculhando…" : "Robô: preço bom no Mercado Livre"}
              </button>
              <span>Varre ofertas do dia, promoção e liquidação. Prioriza maior desconto e menor preço.</span>
            </div>
            <form
              className="aff-busca"
              onSubmit={(e) => {
                e.preventDefault();
                buscarOfertas(termo);
              }}
            >
              <input
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Ex: air fryer, fone bluetooth, TV 50"
                maxLength={80}
              />
              <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
                <option value="todos">ML + Shopee</option>
                <option value="mercadolivre">Mercado Livre</option>
                <option value="shopee">Shopee</option>
              </select>
              <label className="aff-check">
                <input type="checkbox" checked={soPromo} onChange={(e) => setSoPromo(e.target.checked)} />
                Só promoção
              </label>
              <button type="submit" className="btn-primary" disabled={buscando}>
                {buscando && !modoRobo ? "Buscando…" : "Buscar"}
              </button>
            </form>
            <form className="aff-colar" onSubmit={colarLink}>
              <input
                value={urlOferta}
                onChange={(e) => setUrlOferta(e.target.value)}
                placeholder="Ou cole o link da oferta do Mercado Livre / Shopee"
                maxLength={500}
              />
              <button type="submit" className="btn-chamar" disabled={importando || !urlOferta.trim()}>
                {importando ? "Lendo…" : "Adicionar com meu link"}
              </button>
            </form>
            {avisos.length ? <p className="aff-aviso">{avisos.join(" · ")}</p> : null}
            <div className="aff-grid">
              {produtos.map((item) => (
                <article key={item.id} className={`aff-card ${selecionados[item.id] ? "is-on" : ""}`}>
                  <button type="button" className="aff-card-hit" onClick={() => toggleProduto(item.id)}>
                    {item.imagem ? <img src={item.imagem} alt="" /> : <div className="aff-noimg" />}
                    <span className={`aff-loja is-${item.origem}`}>
                      {item.origem === "shopee" ? "Shopee" : "Mercado Livre"}
                    </span>
                    {item.desconto ? <em className="aff-off">-{item.desconto}%</em> : null}
                    <h3>{item.titulo}</h3>
                    <p>
                      {item.precoDeTxt ? <s>{item.precoDeTxt}</s> : null}
                      <strong>{item.precoTxt}</strong>
                    </p>
                  </button>
                  <a href={item.link} target="_blank" rel="noreferrer">Abrir link</a>
                  <button
                    type="button"
                    className="btn-achadinho"
                    disabled={disparando || !waConectado}
                    onClick={() => postarCard(item)}
                  >
                    Postar nos grupos
                  </button>
                </article>
              ))}
            </div>
            {!buscando && !produtos.length ? (
              <p className="aff-vazio">Nenhuma oferta agora. Clique no robô amarelo ou cole o link do produto.</p>
            ) : null}
          </section>
        ) : null}

        {menu === "grupos" ? (
          <section className="crm-pane">
            <div className="crm-pane-top-row">
              <div>
                <h1>Grupos de achadinhos</h1>
                <p>O celular 11 95202-5568 precisa estar nos grupos. Depois importe e deixe ativos.</p>
              </div>
              <button type="button" className="btn-chamar" onClick={importarGruposWa} disabled={syncGrupos || !waConectado}>
                {syncGrupos ? "Importando…" : "Importar grupos do WhatsApp"}
              </button>
            </div>
            <ol className="aff-passos">
              <li>Entre nos grupos de achadinhos / promoções com o <strong>11 95202-5568</strong> (ou crie os seus).</li>
              <li>Conecte o WhatsApp em <strong>Conexão</strong>.</li>
              <li>Clique em <strong>Importar grupos do WhatsApp</strong> e deixe ativos só os que vão receber oferta.</li>
              <li>No Robô, escolha 1 produto e clique em <strong>Postar nos grupos</strong>.</li>
            </ol>
            <form className="aff-novo-grupo" onSubmit={salvarLista}>
              <input
                required
                maxLength={80}
                placeholder="Nome do grupo"
                value={novoGrupo.nome}
                onChange={(e) => setNovoGrupo({ ...novoGrupo, nome: e.target.value })}
              />
              <select
                value={novoGrupo.tipo}
                onChange={(e) => setNovoGrupo({ ...novoGrupo, tipo: e.target.value })}
              >
                <option value="whatsapp">Grupo WhatsApp</option>
                <option value="lista">Lista de pessoas</option>
              </select>
              {novoGrupo.tipo === "whatsapp" ? (
                <input
                  required
                  placeholder="ID do grupo (…@g.us)"
                  value={novoGrupo.jid}
                  onChange={(e) => setNovoGrupo({ ...novoGrupo, jid: e.target.value })}
                />
              ) : (
                <textarea
                  required
                  rows={3}
                  placeholder="WhatsApps, um por linha"
                  value={novoGrupo.pessoas}
                  onChange={(e) => setNovoGrupo({ ...novoGrupo, pessoas: e.target.value })}
                />
              )}
              <button type="submit" className="btn-primary">Salvar grupo</button>
            </form>
            <ul className="aff-grupos">
              {grupos.map((grupo) => (
                <li key={grupo.id}>
                  <div>
                    <strong>{grupo.nome}</strong>
                    <small>
                      {grupo.tipo === "lista"
                        ? `${(grupo.pessoas || []).length} pessoas`
                        : grupo.jid}
                    </small>
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={grupo.ativo !== false}
                      onChange={(e) => atualizarGrupoAfiliado(grupo.id, { ativo: e.target.checked })}
                    />
                    Ativo no disparo
                  </label>
                  <button type="button" onClick={() => excluirGrupoAfiliado(grupo.id)}>Apagar</button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {menu === "disparo" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Postar nos grupos</h1>
              <p>Igual os grupos de achadinhos: uma foto + de/por + seu link de afiliado, um produto por vez, em todos os grupos ativos.</p>
            </div>
            <p className="aff-resumo">
              {escolhidos.length} achadinho(s) · {gruposAtivos.length} grupo(s) ativo(s)
            </p>
            <textarea
              className="aff-texto"
              rows={2}
              maxLength={120}
              value={textoExtra}
              onChange={(e) => setTextoExtra(e.target.value)}
              placeholder="🔥 ACHADINHO"
            />
            {preview ? (
              <pre className="aff-preview">{preview}</pre>
            ) : (
              <p className="aff-vazio">Selecione um produto no Robô para ver o preview.</p>
            )}
            <div className="crm-pane-actions">
              <button type="button" className="btn-chamar" onClick={() => dispararAchadinhos()} disabled={disparando || !waConectado}>
                {disparando ? "Postando…" : "Postar em todos os grupos"}
              </button>
              {disparando ? (
                <button type="button" onClick={() => { pararRef.current = true; }}>Parar</button>
              ) : null}
            </div>
            {progresso ? <p className="disparo-box">{progresso}</p> : null}
            <ul className="aff-escolhidos">
              {escolhidos.map((item) => (
                <li key={item.id}>
                  <span>{item.titulo}</span>
                  <button type="button" onClick={() => toggleProduto(item.id)}>tirar</button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {menu === "auto" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Robô automático</h1>
              <p>Os grupos grandes mandam uns 100 achadinhos por dia. O ritmo Volume 100 faz o mesmo: um post a cada ~7 minutos, o dia inteiro, sem rajada.</p>
            </div>
            <div className="aff-auto-card">
              <label className="aff-auto-liga">
                <input
                  type="checkbox"
                  checked={Boolean(config.autoAtivo)}
                  onChange={(e) => salvarAuto({ autoAtivo: e.target.checked })}
                />
                <strong>{config.autoAtivo ? "Ligado" : "Desligado"}</strong>
                <span>{config.autoAtivo ? "Procurando e postando sozinho" : "Nada é enviado até você ligar"}</span>
              </label>
              <p className="aff-auto-status">{config.autoStatus || "Ainda não rodou."}</p>
              <p className="aff-resumo">
                Hoje: {config.autoMsgsDia || 0}/{config.autoMaxDia || 100} posts
                {" · "}
                {config.autoProdutosDia || 0} produtos
                {config.autoLastGrupo ? ` · último: ${config.autoLastGrupo}` : ""}
              </p>
              {config.autoLastTitulo ? <p className="aff-aviso">Última oferta: {config.autoLastTitulo}</p> : null}
            </div>
            <div className="aff-ritmos">
              {Object.values(RITMOS_AUTO).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={config.autoRitmo === item.id ? "is-on" : ""}
                  onClick={() => salvarAuto({
                    autoRitmo: item.id,
                    autoMaxDia: item.id === "volume" ? 100 : item.maxMsgs,
                    autoIntervaloMin: item.intervaloProdutoMin,
                  })}
                >
                  <strong>{item.label}</strong>
                  <span>{item.detalhe}</span>
                </button>
              ))}
            </div>
            <form
              className="aff-config"
              onSubmit={async (e) => {
                e.preventDefault();
                await salvarAuto({
                  autoRitmo: config.autoRitmo,
                  autoIntervaloMin: config.autoIntervaloMin,
                  autoMaxDia: config.autoMaxDia,
                  autoHoraIni: config.autoHoraIni,
                  autoHoraFim: config.autoHoraFim,
                  autoGancho: config.autoGancho || textoExtra,
                });
                setProgresso("Ajustes do automático salvos.");
              }}
            >
              <label>
                Começa às
                <select
                  value={config.autoHoraIni}
                  onChange={(e) => setConfig({ ...config, autoHoraIni: Number(e.target.value) })}
                >
                  <option value={8}>08:00</option>
                  <option value={9}>09:00</option>
                  <option value={10}>10:00</option>
                </select>
              </label>
              <label>
                Para às
                <select
                  value={config.autoHoraFim}
                  onChange={(e) => setConfig({ ...config, autoHoraFim: Number(e.target.value) })}
                >
                  <option value={20}>20:00</option>
                  <option value={21}>21:00</option>
                  <option value={22}>22:00</option>
                </select>
              </label>
              <label>
                Texto de abertura
                <input
                  value={config.autoGancho || ""}
                  onChange={(e) => setConfig({ ...config, autoGancho: e.target.value })}
                  maxLength={80}
                  placeholder="🔥 ACHADINHO"
                />
              </label>
              <button type="submit" className="btn-primary">Salvar horário</button>
            </form>
            <ol className="aff-passos">
              <li>No Volume 100 ele manda cerca de <strong>100 posts por dia</strong> (1 a cada ~7 min, das 8h às 22h).</li>
              <li>Continua <strong>um grupo por vez</strong>. Não dispara 100 de uma vez — é isso que bane.</li>
              <li>Aceita até 40 grupos ativos. Com 5 grupos, são ~20 ofertas × 5 = 100 posts.</li>
              <li>Deixe esta aba aberta no plano gratuito da Vercel.</li>
              <li>Precisa do Firebase Admin: <code>FIREBASE_SERVICE_ACCOUNT_JSON</code>.</li>
            </ol>
            {autoPing ? <p className="crm-erro-banner">{autoPing}</p> : null}
            {gruposAtivos.length > ritmoAuto(config.autoRitmo).maxGrupos ? (
              <p className="crm-erro-banner">
                Você tem {gruposAtivos.length} grupos ativos. Neste ritmo o automático usa só os {ritmoAuto(config.autoRitmo).maxGrupos} primeiros.
              </p>
            ) : null}
            {!waConectado ? (
              <p className="crm-erro-banner">WhatsApp desconectado. O automático não posta até ler o QR em Conexão.</p>
            ) : null}
          </section>
        ) : null}

        {menu === "conexao" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Conexão WhatsApp</h1>
              <p>Este CRM usa o seu celular <strong>11 95202-5568</strong>. O CRM Honda continua no 11 94753-9917.</p>
            </div>
            <WhatsappStatus conta="afiliados" onConnected={setWaConectado} />
          </section>
        ) : null}

        {menu === "config" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Seus links de afiliado</h1>
              <p>Os IDs entram em cada oferta encontrada automaticamente.</p>
            </div>
            <form
              className="aff-config"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await salvarConfigAfiliados(config);
                  setProgresso("IDs de afiliado salvos.");
                } catch (error) {
                  setErro(error.message || "Falha ao salvar");
                }
              }}
            >
              <label>
                Cole o link de afiliado do Mercado Livre
                <input
                  value={config.meliAffiliateId}
                  onChange={(e) => {
                    const valor = e.target.value;
                    try {
                      const url = new URL(valor);
                      setConfig({
                        ...config,
                        meliAffiliateId: url.searchParams.get("matt_tool") || valor,
                        meliAffiliateWord: url.searchParams.get("matt_word") || config.meliAffiliateWord,
                      });
                    } catch {
                      setConfig({ ...config, meliAffiliateId: valor });
                    }
                  }}
                  placeholder="62300245 ou cole o link inteiro do ML"
                />
              </label>
              <label>
                Mercado Livre (matt_word)
                <input
                  value={config.meliAffiliateWord}
                  onChange={(e) => setConfig({ ...config, meliAffiliateWord: e.target.value })}
                  placeholder="bbhgadcfe38621"
                />
              </label>
              <label>
                Shopee (uls_trackid)
                <input
                  value={config.shopeeAffiliateId}
                  onChange={(e) => setConfig({ ...config, shopeeAffiliateId: e.target.value })}
                  placeholder="ID / sub_id do afiliado Shopee"
                />
              </label>
              <button type="submit" className="btn-primary">Salvar IDs</button>
            </form>
            <p className="aff-aviso">
              <strong>Shopee (obrigatório para busca automática):</strong> entre em
              {" "}<a href="https://affiliate.shopee.com.br" target="_blank" rel="noreferrer">affiliate.shopee.com.br</a>,
              abra Open API / ferramentas de desenvolvedor, copie App ID e Secret e cole na Vercel:
              SHOPEE_APP_ID e SHOPEE_SECRET. Depois faça redeploy. Enquanto isso, cole o link do produto na tela Ofertas.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
