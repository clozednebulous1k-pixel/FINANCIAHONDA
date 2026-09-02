"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import { LIMITES, validarEmail } from "../../lib/security";

export default function LoginPage() {
  const router = useRouter();
  const { login, pronto } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [falhas, setFalhas] = useState(0);

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
    if (!emailLimpo || senha.length < 6 || senha.length > LIMITES.senha) {
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
      await login(emailLimpo, senha);
      router.replace("/painel");
    } catch (error) {
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
    <main className="auth-page">
      <Link className="back" href="/">← Voltar ao formulário</Link>
      <p className="eyebrow">Acesso do vendedor</p>
      <h1>Entrar no painel</h1>
      <p className="lead">Só a equipe da loja vê os leads do tráfego pago.</p>

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
            placeholder="vendedor@loja.com"
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
        {erro && <p className="erro">{erro}</p>}
        <button className="btn-primary" type="submit" disabled={enviando || !pronto || falhas >= 5}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
