#!/usr/bin/env bash
# Rode na VPS: bash check-ports-vps.sh
# Confere portas e Docker antes de subir a Evolution (Honda CRM).

set -euo pipefail

SITE_VERCEL="https://financiamentodaminhahonda.vercel.app"
WEBHOOK_URL="${SITE_VERCEL}/api/whatsapp/webhook"

# Portas que o stack Honda quer usar (host)
WANT_API=8080
WANT_PG=5434
WANT_REDIS=6380

# Alternativas se a preferida estiver ocupada
ALT_API=(8080 8088 8090 18080 9080)
ALT_PG=(5434 5435 5436)
ALT_REDIS=(6380 6381 6382)

verde() { printf '\033[0;32m%s\033[0m\n' "$*"; }
amarelo() { printf '\033[0;33m%s\033[0m\n' "$*"; }
vermelho() { printf '\033[0;31m%s\033[0m\n' "$*"; }
info() { printf '\033[0;36m%s\033[0m\n' "$*"; }

porta_ocupada() {
  local porta="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tuln 2>/dev/null | grep -qE "[.:]${porta}\\b" && return 0
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$porta" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi
  if command -v netstat >/dev/null 2>&1; then
    netstat -tuln 2>/dev/null | grep -qE "[.:]${porta}\\b" && return 0
  fi
  # fallback: tenta bind com bash /dev/tcp (pode falhar em alguns hosts)
  (echo >/dev/tcp/127.0.0.1/"$porta") >/dev/null 2>&1 && return 0
  return 1
}

quem_usa() {
  local porta="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tulnp 2>/dev/null | grep -E "[.:]${porta}\\b" | head -n 3 || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$porta" -sTCP:LISTEN 2>/dev/null | head -n 5 || true
  else
    echo "(instale ss ou lsof para ver o processo)"
  fi
}

primeira_livre() {
  local p
  for p in "$@"; do
    if ! porta_ocupada "$p"; then
      echo "$p"
      return 0
    fi
  done
  echo ""
  return 1
}

echo "=============================================="
echo "  Honda CRM — check de portas (VPS)"
echo "=============================================="
echo "Site Vercel: $SITE_VERCEL"
echo "Webhook:     $WEBHOOK_URL"
echo "Data:        $(date -Is 2>/dev/null || date)"
echo

info ">>> Docker"
if command -v docker >/dev/null 2>&1; then
  verde "Docker OK: $(docker --version)"
  docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || amarelo "Compose não encontrado (instale docker compose plugin)"
  echo
  info "Containers em execução:"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
else
  vermelho "Docker NÃO instalado nesta VPS"
fi
echo

info ">>> Memória / disco (resumo)"
free -h 2>/dev/null | head -n 2 || true
df -h / 2>/dev/null | tail -n 1 || true
echo

checar_porta() {
  local nome="$1"
  local porta="$2"
  if porta_ocupada "$porta"; then
    vermelho "[OCUPADA] $nome :$porta"
    quem_usa "$porta" | sed 's/^/  /'
  else
    verde "[LIVRE]   $nome :$porta"
  fi
}

info ">>> Portas preferidas do Honda Evolution"
checar_porta "Evolution API" "$WANT_API"
checar_porta "Postgres host" "$WANT_PG"
checar_porta "Redis host" "$WANT_REDIS"
echo

API_PORT="$(primeira_livre "${ALT_API[@]}")"
PG_PORT="$(primeira_livre "${ALT_PG[@]}")"
REDIS_PORT="$(primeira_livre "${ALT_REDIS[@]}")"

info ">>> Sugestão automática"
if [[ -n "$API_PORT" && -n "$PG_PORT" && -n "$REDIS_PORT" ]]; then
  verde "Use estas portas no host:"
  echo "  EVOLUTION_HOST_PORT=$API_PORT"
  echo "  POSTGRES_HOST_PORT=$PG_PORT"
  echo "  REDIS_HOST_PORT=$REDIS_PORT"
else
  vermelho "Não achei porta livre nas listas. Escolha manualmente outras portas."
fi
echo

# Gera um .env.ports sugerido no diretório atual (se tiver permissão)
OUT_FILE="./honda-evolution-ports.env"
{
  echo "# Gerado por check-ports-vps.sh em $(date -Is 2>/dev/null || date)"
  echo "EVOLUTION_HOST_PORT=${API_PORT:-8080}"
  echo "POSTGRES_HOST_PORT=${PG_PORT:-5434}"
  echo "REDIS_HOST_PORT=${REDIS_PORT:-6380}"
  echo "SITE_VERCEL=$SITE_VERCEL"
  echo "WEBHOOK_URL=$WEBHOOK_URL"
} > "$OUT_FILE" 2>/dev/null && verde "Arquivo gerado: $OUT_FILE" || amarelo "Não foi possível gravar $OUT_FILE"
echo

info ">>> Próximos passos"
echo "1) Envie a pasta evolution/ para a VPS"
echo "2) Ajuste as portas no docker-compose.vps.yml se necessário"
echo "3) Suba: docker compose -f docker-compose.vps.yml --env-file .env.vps up -d"
echo "4) Na Vercel, defina:"
echo "   EVOLUTION_API_URL=https://SEU-DOMINIO-OU-IP:PORTA"
echo "   (ou melhor: https://wa.seudominio.com atrás do Nginx)"
echo "5) EVOLUTION_API_KEY / EVOLUTION_INSTANCE iguais ao .env.vps"
echo "6) Redeploy da Vercel e escaneie o QR no /painel → Conexão"
echo
amarelo "Dica: Postgres e Redis NÃO precisam ficar públicos — o compose VPS deixa só a API exposta."
echo "=============================================="
