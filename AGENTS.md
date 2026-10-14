# AGENTS — Projeto DBET

## Visão do produto
Cassino social 100% fictício ("for fun"). NUNCA adicionar compra de fichas com dinheiro real. Aviso legal visível: "Jogo de entretenimento. Sem dinheiro real, sem prêmios reais."

## Arquitetura (monorepo)
- `frontend/` — React 18 + TS + Vite + Tailwind + i18next + Socket.IO client
- `backend/` — Express + Socket.IO + Mongoose (CommonJS, JS puro, sem TS)
- `bot/` — Discord read-only
- `docker-compose.yml` — mongo (replica set rs0) + backend + frontend

## Decisões de código (backend)
- Toda lógica de jogo/resultado é **server-side**. Front só envia intenção.
- Saldos em **centavos inteiros**. Toda movimentação via `backend/utils/economy.js` (`chargeUser`/`creditUser`) — registra ledger em `Transaction` e dá XP. Nunca editar `user.balance` diretamente.
- Provably fair via `backend/utils/provablyFair.js` + reserva de nonce atômica em `backend/utils/rng.js` (`nextRngFor`). Formato: `HMAC-SHA256(serverSeed, "clientSeed:nonce:cursor")` → 52 bits.
- Mutações em campos `state` (Mixed) de GameSession: o modelo já tem `pre('save')` com `markModified('state')`. Se criar outro schema com campo Object, replique.
- Crons em `backend/index.js` (sync de esportes, settlement, sweeps).
- Esportes: `backend/services/oddsApi.js` — sem `ODDS_API_KEY` usa provedor DEMO (partidas sintéticas). Vig configurável por constante `VIG`.

## Decisões de código (frontend)
- Tailwind com tokens DBET em `tailwind.config.js` (cores: base #0F0F14, deep #1B1030, gold #F5C542, danger #D7263D, felt #0B6B4B). Classes utilitárias `.dbet-*` em `src/index.css`.
- Números com `font-variant-numeric: tabular-nums` (classe `.tabular` ou `<Money>`).
- Páginas de jogo usam `GameLayout` (stage/controls/info) + `BetAmount`.
- Chamadas de jogo em `src/services/games.ts`; toda resposta solo dispara SFX via `utils/sound.ts` (respeita `dbet.sound=0`).
- i18n: chaves em `src/i18n/locales/*.json` (11 idiomas). NÃO inventar chaves novas sem adicionar em TODOS os idiomas. Fallback: `en`.
- Erros de API: `toast.error(t(\`errors.${code}\`, {defaultValue: code}))`.
- Autenticação: `UserContext.tsx`; login/401 disparam `authOpen`. Socket reconecta com token via `reconnectSocket()`.
- LocalStorage keys sempre com prefixo `dbet.`

## Testes
- Backend: `cd backend && npm test` (jest + mongodb-memory-server).
- Frontend: `cd frontend && npx tsc --noEmit` e `npx vite build` devem passar.

## Convenções
- Comentários e textos de código em português (marca global, texto de UI via i18n).
- Não recriar o que existe: consulte `services/api.ts`, `services/socket.ts`, `components/*` antes de criar novos padrões.
- Manter compatível com os motores em `backend/games/` — mudanças de payload exigem atualizar front + testes.
