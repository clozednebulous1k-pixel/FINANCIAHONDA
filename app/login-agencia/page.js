"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import { EMAIL_AGENCIA, EMAIL_HONDA, LIMITES, emailPermitido, validarEmail } from "../../lib/security";

const CHAVE_EMAIL = "agencia-login-email";
const CHAVE_MANTER = "agencia-login-manter";

export default function LoginAgenciaPage() {
  const router = useRouter();
  const { login, pronto, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [manter, setManter] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [falhas, setFalhas] = useState(0);

  useEffect(() => {
    const emailSalvo = window.localStorage.getItem(CHAVE_EMAIL) || "";
    const manterSalvo = window.localStorage.getItem(CHAVE_MANTER);
    setEmail(emailSalvo);
    setManter(manterSalvo !== "0");
  }, []);

  useEffect(() => {
    if (!loading && user && emailPermitido(user.email)) router.replace("/agencia");
  }, [loading, user, router]);

  useEffect(() => {
    if (falhas < 5) return undefined;
    const timer = setTimeout(() => setFalhas(0), 60 * 1000);
    return () => clearTimeout(timer);
  }, [falhas]);

  async function entrar(event) {
    event.preventDefault();
    setErro("");
    if (falhas >= 5) {
      setErro("Muitas tentativas. Espere 1 minuto e tente de novo.");
      return;
    }
    const emailLimpo = validarEmail(email);
    if (!emailLimpo || !emailPermitido(emailLimpo) || senha.length < 6 || senha.length > LIMITES.senha) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    setEnviando(true);
    try {
      const guarda = await fetch("/api/login-guard", { method: "POST" });
      if (guarda.status === 429) {
        setErro("Muitas tentativas. Espere alguns minutos.");
        return;
      }
      if (!guarda.ok) {
        setErro("Não foi possível validar o acesso. Tente de novo.");
        return;
      }
      if (manter) {
        window.localStorage.setItem(CHAVE_EMAIL, emailLimpo);
        window.localStorage.setItem(CHAVE_MANTER, "1");
      } else {
        window.localStorage.removeItem(CHAVE_EMAIL);
        window.localStorage.setItem(CHAVE_MANTER, "0");
      }
      await login(emailLimpo, senha, manter);
      router.replace("/agencia");
    } catch {
      const novasFalhas = falhas + 1;
      setFalhas(novasFalhas);
      setErro(novasFalhas >= 5
        ? "Muitas tentativas. Espere 1 minuto e tente de novo."
        : "E-mail ou senha inválidos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="auth-page auth-agencia">
      <p className="eyebrow">CRM Agência</p>
      <h1>Sites e sistemas</h1>
      <p className="lead">
        Use a conta Honda para entrar agora. O e-mail {EMAIL_AGENCIA} só funciona depois de criado no Firebase.
        Conta Honda: {EMAIL_HONDA}.
      </p>

      {!pronto && (
        <p className="erro">Firebase ainda não está configurado. Coloque as chaves no arquivo .env.local.</p>
      )}

      <form className="auth-form" onSubmit={entrar} autoComplete="on">
        <label>
          E-mail
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={LIMITES.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={EMAIL_HONDA}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            maxLength={LIMITES.senha}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        <label className="lembrar">
          <input
            type="checkbox"
            checked={manter}
            onChange={(e) => setManter(e.target.checked)}
          />
          Salvar senha neste aparelho
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn-primary" type="submit" disabled={enviando || !pronto || falhas >= 5}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="auth-switch">
        CRM Honda? <Link href="/login">Entrar no painel de leads</Link>
        {" · "}
        Afiliados? <Link href="/login-afiliados">Disparo de links</Link>
      </p>
    </main>
  );
}
