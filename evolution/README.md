# Evolution API — Honda CRM

Número WhatsApp Business: **11 94753-9917**  
Site CRM: **https://financiamentodaminhahonda.vercel.app/**

## Local (PC)

```bash
cd evolution
docker compose up -d
```

Painel: http://localhost:8080  
API key: no arquivo `.env` (`AUTHENTICATION_API_KEY`)

## VPS (recomendado — sem localtunnel)

### 1) Conferir portas (não interfere nos outros Docker)

Na VPS:

```bash
# envie a pasta evolution/ ou só este arquivo
bash check-ports-vps.sh
```

O script mostra o que está ocupado e gera `honda-evolution-ports.env` com portas livres.

### 2) Subir só a Evolution (Postgres/Redis internos)

```bash
cp .env.vps.example .env.vps
# Edite SERVER_URL = http://IP_DA_VPS:8080  (ou https://wa.seudominio.com)
# Se 8080 estiver ocupada, use a porta sugerida pelo script:
# export EVOLUTION_HOST_PORT=8088

docker compose -f docker-compose.vps.yml --env-file .env.vps up -d
```

### 3) Variáveis na Vercel

| Variável | Valor |
|----------|--------|
| `EVOLUTION_API_URL` | URL pública da Evolution na VPS (ex. `http://IP:8080` ou `https://wa...`) |
| `EVOLUTION_API_KEY` | mesma `AUTHENTICATION_API_KEY` do `.env.vps` |
| `EVOLUTION_INSTANCE` | `honda-crm` |
| `EVOLUTION_WEBHOOK_SECRET` | `honda_webhook_2026` |

Redeploy da Vercel depois de salvar.

### 4) Conectar WhatsApp

1. Abra https://financiamentodaminhahonda.vercel.app/painel → **Conexão**
2. Escaneie o QR com o WhatsApp Business **11 94753-9917**

## Parar

```bash
# local
docker compose down

# VPS
docker compose -f docker-compose.vps.yml --env-file .env.vps down
```
