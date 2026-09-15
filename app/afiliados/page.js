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
import { crmDoEmail, loginDoCrm, validarWhatsapp } from "../../lib/security";

const MENUS = [
  { id: "ofertas", label: "Ofertas", icon: "🔎" },
  { id: "grupos", label: "Grupos", icon: "👥" },
  { id: "disparo", label: "Disparo", icon: "🚀" },
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
  const [config, setConfig] = useState({ meliAffiliateId: "", meliAffiliateWord: "", shopeeAffiliateId: "" });
  const [termo, setTermo] = useState("oferta do dia");
  const [origem, setOrigem] = useState("todos");
  const [soPromo, setSoPromo] = useState(true);
  const [produtos, setProdutos] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionados, setSelecionados] = useState({});
  const [textoExtra, setTextoExtra] = useState("Olha essa oferta 🔥");
  const [disparando, setDisparando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [syncGrupos, setSyncGrupos] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ nome: "", tipo: "whatsapp", jid: "", pessoas: "" });
  const [urlOferta, setUrlOferta] = useState("");
  const [importando, setImportando] = useState(false);
  const pararRef = useRef(false);

  const escolhidos = useMemo(
    () => produtos.filter((p) => selecionados[p.id]),
    [produtos, selecionados],
  );
  const gruposAtivos = useMemo(() => grupos.filter((g) => g.ativo !== false), [grupos]);

  useEffect(() => {
    if (!loading && !user) router.replace(loginDoCrm("afiliados"));
    if (!loading && user && crmDoEmail(user.email) !== "afiliados") router.replace("/painel");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return undefined;
    const a = ouvirGruposAfiliados(setGrupos, () => setErro("Sem permissão nos grupos. Publique as regras novas do Firebase."));
    const b = ouvirConfigAfiliados((dados) => {
      setConfig({
        meliAffiliateId: dados?.meliAffiliateId || "",
        meliAffiliateWord: dados?.meliAffiliateWord || "",
        shopeeAffiliateId: dados?.shopeeAffiliateId || "",
      });
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
        const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
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
    if (user && pronto) buscarOfertas("oferta do dia");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pronto]);

  async function buscarOfertas(q) {
    const query = String(q ?? termo).trim() || "oferta do dia";
    setBuscando(true);
    setErro("");
    try {
      const params = new URLSearchParams({
        q: query,
        origem,
        promo: soPromo ? "1" : "0",
        meli: config.meliAffiliateId || "",
        meliWord: config.meliAffiliateWord || "",
        shopee: config.shopeeAffiliateId || "",
      });
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

  async function dispararTodos() {
    if (disparando) return;
    const fila = gruposAtivos;
    if (!fila.length) {
      setErro("Cadastre ou ative pelo menos um grupo.");
      return;
    }
    if (!escolhidos.length && !textoExtra.trim()) {
      setErro("Selecione ofertas ou escreva um texto.");
      return;
    }
    if (!waConectado) {
      setErro("WhatsApp desconectado. Vá em Conexão e confirme.");
      return;
    }
    if (!window.confirm(`Disparar para ${fila.length} grupo(s)? Intervalo de ~8–15s entre cada um.`)) {
      return;
    }

    pararRef.current = false;
    setDisparando(true);
    setErro("");
    let ok = 0;
    let falhas = 0;

    for (let i = 0; i < fila.length; i += 1) {
      if (pararRef.current) break;
      const grupo = fila[i];
      setProgresso(`Enviando ${i + 1}/${fila.length}: ${grupo.nome}`);
      try {
        const res = await fetch("/api/afiliados/disparar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grupo,
            produtos: escolhidos,
            texto: textoExtra,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no envio");
        ok += Number(data.enviados || 0);
        falhas += Number(data.falhas || 0);
      } catch (error) {
        falhas += 1;
        setProgresso(`Falha em ${grupo.nome}: ${error.message || "erro"}`);
      }

      if (pararRef.current) break;
      if (i < fila.length - 1) {
        const espera = delayGrupoMs();
        const fim = Date.now() + espera;
        while (Date.now() < fim) {
          if (pararRef.current) break;
          const restam = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
          setProgresso(`Enviados até agora: ${ok}. Próximo grupo em ${restam}s…`);
          await sleep(1000);
        }
      }
    }

    try {
      await registrarDisparoAfiliado({
        texto: textoExtra,
        grupos: fila.map((g) => g.nome),
        ok,
        falhas,
      });
    } catch {
      // histórico é opcional
    }

    setProgresso(
      pararRef.current
        ? `Parado: ${ok} envios, ${falhas} falhas.`
        : `Concluído: ${ok} envios${falhas ? `, ${falhas} falhas` : ""}.`,
    );
    setDisparando(false);
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
            <small>{waConectado ? "WhatsApp on" : "WhatsApp off"}</small>
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
          <button type="button" onClick={() => logout()}>Sair</button>
        </div>
      </aside>

      <main className="crm-main">
        {erro ? <p className="crm-erro-banner">{erro}</p> : null}

        {menu === "ofertas" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Buscador de ofertas</h1>
              <p>Promoções no Mercado Livre e Shopee, já com o seu link de afiliado.</p>
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
                {buscando ? "Buscando…" : "Buscar"}
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
                </article>
              ))}
            </div>
            {!buscando && !produtos.length ? <p className="aff-vazio">Nenhuma oferta agora. Tente outro termo.</p> : null}
          </section>
        ) : null}

        {menu === "grupos" ? (
          <section className="crm-pane">
            <div className="crm-pane-top-row">
              <div>
                <h1>Grupos</h1>
                <p>Importe grupos do WhatsApp ou crie listas de pessoas para receber os links.</p>
              </div>
              <button type="button" className="btn-chamar" onClick={importarGruposWa} disabled={syncGrupos || !waConectado}>
                {syncGrupos ? "Importando…" : "Importar grupos do WhatsApp"}
              </button>
            </div>
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
              <h1>Disparo nos grupos</h1>
              <p>Envia os links selecionados para todos os grupos ativos.</p>
            </div>
            <p className="aff-resumo">
              {escolhidos.length} oferta(s) · {gruposAtivos.length} grupo(s) ativo(s)
            </p>
            <textarea
              className="aff-texto"
              rows={3}
              maxLength={800}
              value={textoExtra}
              onChange={(e) => setTextoExtra(e.target.value)}
              placeholder="Texto que vai acima do link"
            />
            <div className="crm-pane-actions">
              <button type="button" className="btn-chamar" onClick={dispararTodos} disabled={disparando || !waConectado}>
                {disparando ? "Disparando…" : "Disparar em todos os grupos"}
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

        {menu === "conexao" ? (
          <section className="crm-pane">
            <div className="crm-pane-top">
              <h1>Conexão WhatsApp</h1>
              <p>Mesma instância do CRM Honda. Conecte para importar grupos e disparar.</p>
            </div>
            <WhatsappStatus />
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
