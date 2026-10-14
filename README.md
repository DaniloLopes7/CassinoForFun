# 🎰 DBET — Cassino social for fun

> **Toda a emoção do cassino, zero risco.**
> Jogo de entretenimento. Sem dinheiro real, sem prêmios reais.

DBET é um cassino social: slots, blackjack, crash, plinko, dados, mines, HiLo, coinflip e **apostas esportivas com odds em tempo real** — tudo com fichas 100% fictícias. Progressão por XP, ranking, missões, bônus diário, chat com rain de fichas e sistema provably fair verificável.

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Socket.IO Client, i18next (11 idiomas) |
| Backend | Node.js, Express, Socket.IO, Mongoose (MongoDB), node-cron |
| Bot | discord.js (read-only) |
| Infra | Docker Compose (mongo replica set + backend + frontend) |

## Subir o ambiente (recomendado)

```bash
cp backend/.env.template backend/.env   # ajuste JWT_SECRET, ADMIN_EMAILS, ODDS_API_KEY
docker compose up -d
# Frontend → http://localhost:5173   (com proxy /api e websockets)
# Backend  → http://localhost:5000/health
```

O primeiro `docker compose up` da sessão pode precisar iniciar o replica set do Mongo:

```bash
docker exec dbet-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"mongo:27017"}]})'
```

### Sem Docker

```bash
# MongoDB rodando localmente (replica set recomendado p/ transacoes)
cp backend/.env.template backend/.env
cd backend && npm install && npm run dev
cd frontend && npm install && cp .env.template .env && npm run dev
```

## Apostas esportivas

- **Sem `ODDS_API_KEY`**: provedor DEMO gera partidas sintéticas (Premier League, Brasileirão, NBA, ATP) com odds e liquidação automática — ideal para desenvolvimento.
- **Com `ODDS_API_KEY`** (https://the-odds-api.com, plano gratuito): sincroniza eventos reais a cada 20 min (`ODDS_SYNC_CRON`), trava a odd no momento da aposta e liquida automaticamente consultando placares. Esportes configuráveis em `ODDS_API_SPORTS`.
- Margem da casa (vig): 4% aplicada sobre odds consenso.
- Fallback manual no backoffice: criar evento, resolver placar, suspender/cancelar mercado (com reembolso).

## Backoffice (`/backoffice`)

Contas admin são criadas automaticamente para e-mails listados em `ADMIN_EMAILS` (backend/.env). Funções:
- Dashboard (usuários, volume, apostas)
- Gestão de usuários: promover/rebaixar admin, banir, ajustar saldo
- Gestão esportiva: sincronização manual, criar/resolver eventos, suspender mercados
- Auditoria de transações

## Provably fair

Cada aposta usa `HMAC-SHA256(serverSeed, "clientSeed:nonce:cursor")` → 52 bits → float uniforme. O hash SHA-256 da seed do servidor é publicado antes da aposta; a seed é revelada ao rotacioná-la. Verifique em `/fair` ou via `POST /fair/verify`. Crash usa hash chain em rounds globais (`/fair/live-rounds`).

## Jogos

| Jogo | Tipo | Multiplicador máx | House edge |
|---|---|---|---|
| Crash | ao vivo (multiplayer) | 1000× | 3% |
| Coinflip | PvP | 1.96× | 2% |
| Slots | solo | 50× | por paytable |
| Dice | solo | ~99/1 | 1% |
| Plinko | solo | 120× | 3% |
| Mines | solo (sessão) | progressivo | 1% |
| HiLo | solo (sessão) | progressivo | 2%/step |
| Blackjack | solo vs dealer | 3:2 | regras padrão |

## Economia fictícia

- Saldo inicial: **R$ 10.000,00** fictícios
- Rede de segurança: saldo zerado pode recarregar R$ 500 a cada 1h
- Bônus diário com streak (R$ 250 + R$ 50/dia, máx. 7 dias)
- XP por aposta → níveis; referral no nível 5 do indicado
- **Não existe compra de fichas com dinheiro real — por decisão de produto e por conformidade legal.**

## i18n

11 idiomas: pt, en, es, fr, de, it, ja, ko, zh, vi, id (fallback en). Detecção automática com persistência em `dbet.language`.

## Acessibilidade & jogo responsável

- Contraste WCAG AA, alvos de toque ≥ 44px, foco visível
- Respeita `prefers-reduced-motion`
- Controle de som (header) e aviso permanente: *"Jogo de entretenimento. Sem dinheiro real, sem prêmios reais."*
- Moeda estritamente fictícia; leaderboard é o único "prêmio"

## Testes

```bash
cd backend && npm test           # jest: matematica, provably fair, economia, engines
```

## Estrutura

```
frontend/  app React (Vite) — pages por jogo em src/pages, componentes do design system em src/components
backend/   API Express + Socket.IO — engines em /games, rotas em /routes, serviços em /services
bot/       bot Discord read-only (/dbet-ranking, /dbet-profile)
docker-compose.yml
```

## Scripts úteis

```bash
./scripts/dev.sh start-bg    # backend local fora do docker
npm run test:backend         # suite jest
npm run build                # build de producao do frontend (dist/)
```
## Autor

**Danilo Almeida Lopes** — estudante de Ciência de Dados.

## Licença

MIT — veja [LICENSE](LICENSE).
