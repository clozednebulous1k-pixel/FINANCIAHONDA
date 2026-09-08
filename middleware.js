import { NextResponse } from "next/server";

const JANELA_MS = 10 * 60 * 1000;
const LIMITE = {
  login: 25,
  api: 180,
};

const hits = new Map();

function ipDoPedido(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return request.headers.get("x-real-ip") || "unknown";
}

function estourou(chave, maximo) {
  const agora = Date.now();
  const atual = hits.get(chave) || [];
  const recentes = atual.filter((tempo) => agora - tempo < JANELA_MS);
  if (recentes.length >= maximo) {
    hits.set(chave, recentes);
    return true;
  }
  recentes.push(agora);
  hits.set(chave, recentes);
  return false;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const ip = ipDoPedido(request);
  const login = pathname === "/login" || pathname.startsWith("/api/login-guard");
  const api = pathname.startsWith("/api/");

  // webhook e polling do chat não entram no rate limit agressivo
  if (
    pathname.startsWith("/api/whatsapp/webhook") ||
    pathname.startsWith("/api/whatsapp/messages") ||
    pathname.startsWith("/api/whatsapp/status")
  ) {
    return NextResponse.next();
  }

  if (login || api) {
    const maximo = login ? LIMITE.login : LIMITE.api;
    const prefixo = login ? "login" : "api";
    if (estourou(`${prefixo}:${ip}`, maximo)) {
      const msg = "Muitas tentativas. Espere alguns minutos.";
      if (api) {
        return NextResponse.json(
          { error: msg },
          { status: 429, headers: { "Retry-After": "600" } },
        );
      }
      return new NextResponse(msg, {
        status: 429,
        headers: { "Retry-After": "600" },
      });
    }
  }

  const response = NextResponse.next();
  if (pathname.startsWith("/login") || pathname.startsWith("/painel")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/login", "/painel/:path*", "/api/:path*"],
};
