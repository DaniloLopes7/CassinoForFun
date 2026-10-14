/**
 * DBET Backend — ponto de entrada.
 * Express (REST) + Socket.IO (chat, rain, crash, coinflip) + Mongoose.
 */
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cron = require('node-cron');

const config = require('./config');
const { attachUser } = require('./middleware/auth');
const { setupSocket } = require('./services/socket');
const sportsService = require('./services/oddsApi');

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log(`[db] conectado: ${config.mongoUri}`);

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '256kb' }));
  app.use(attachUser);

  app.get('/health', (_req, res) => res.json({ ok: true, name: 'DBET', ts: Date.now() }));

  app.use('/auth', require('./routes/auth'));
  app.use('/users', require('./routes/users'));
  app.use('/games', require('./routes/games'));
  app.use('/fair', require('./routes/fair'));
  app.use('/sports', require('./routes/sports'));
  app.use('/admin', require('./routes/admin'));
  app.use('/missions', require('./routes/missions'));
  app.use('/referrals', require('./routes/referrals'));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  // Handler de erros
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  });

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: true, credentials: true } });
  app.set('io', io);
  const socketLayer = setupSocket(io);
  app.set('socketLayer', socketLayer);

  // ---------- Cron: esportes ----------
  const sportsAvailable = mongoose.models.SportEvent != null;
  if (sportsAvailable) {
    // sync inicial em background
    sportsService.syncEvents(io).then((r) => console.log('[sports] sync inicial:', r));
    cron.schedule(config.oddsSyncCron, async () => {
      await sportsService.syncEvents(io).catch((e) => console.error('[sports] sync:', e.message));
      await sportsService.sweepEventStatuses().catch(() => {});
      await sportsService.settleFinished(io).catch((e) => console.error('[sports] settle:', e.message));
    });
    // varredura de status/liquidacao mais frequente
    cron.schedule('*/3 * * * *', async () => {
      await sportsService.sweepEventStatuses().catch(() => {});
      await sportsService.settleFinished(io).catch(() => {});
    });
  }

  server.listen(config.port, () => {
    console.log(`[dbet] backend na porta ${config.port} (${config.env})`);
    console.log('[dbet] Jogo de entretenimento. Sem dinheiro real, sem premios reais.');
  });
}

main().catch((e) => {
  console.error('Falha ao iniciar:', e);
  process.exit(1);
});
