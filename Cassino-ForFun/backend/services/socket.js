/**
 * Camada Socket.IO: auth por JWT, presenca (online), chat, rain,
 * e wiring dos jogos ao vivo (crash / coinflip).
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, ChatMessage, Rain } = require('../models');
const { createCrashGame, createCoinflip } = require('../games/live');
const { creditUser, chargeUser } = require('../utils/economy');

const RAIN_COST = 25_000; // R$ 250 para abrir chuva
const RAIN_AMOUNT_EACH = 1_000; // R$ 10 por participante
const RAIN_MAX = 25;

function setupSocket(io) {
  const online = new Map(); // userId -> { username, avatar, level, sockets:Set }

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const payload = jwt.verify(token, config.jwtSecret);
        socket.userId = payload.uid;
      }
    } catch {
      /* anonimo */
    }
    next();
  });

  const crash = createCrashGame(io, online);
  const coinflip = createCoinflip(io);

  function onlineUsers() {
    return [...online.entries()].map(([id, u]) => ({ id, username: u.username, avatar: u.avatar, level: u.level }));
  }
  function broadcastOnline() {
    io.emit('onlineUsers', onlineUsers());
  }

  io.on('connection', async (socket) => {
    let me = null;
    if (socket.userId) {
      me = await User.findById(socket.userId);
      if (me && !me.banned) {
        const entry = online.get(me._id.toString()) || { username: me.username, avatar: me.avatar, level: me.level, sockets: new Set() };
        entry.sockets.add(socket.id);
        online.set(me._id.toString(), entry);
        broadcastOnline();
      } else {
        me = null;
      }
    }

    socket.emit('crash:state', crash.publicState());
    socket.emit('coinflip:lobbies', coinflip.listOpen());
    socket.emit('chat:history', await ChatMessage.find({ deleted: false }).sort({ createdAt: -1 }).limit(50).lean().then((r) => r.reverse()));
    const openRain = await Rain.findOne({ status: 'open' });
    socket.emit('rain:state', openRain || null);

    socket.on('disconnect', () => {
      if (!me) return;
      const entry = online.get(me._id.toString());
      if (entry) {
        entry.sockets.delete(socket.id);
        if (entry.sockets.size === 0) online.delete(me._id.toString());
        broadcastOnline();
      }
    });

    // ---------- Chat ----------
    socket.on('chat:send', async ({ text }) => {
      try {
        if (!me) throw new Error('unauthorized');
        if (me.mutedUntil && me.mutedUntil > new Date()) throw new Error('muted');
        const clean = String(text || '').slice(0, 280).trim();
        if (!clean) return;
        const msg = await ChatMessage.create({ user: me._id, username: me.username, avatar: me.avatar, text: clean });
        io.emit('chat:message', msg);
      } catch (e) {
        socket.emit('actionError', { scope: 'chat', error: e.message });
      }
    });

    // ---------- Rain ----------
    socket.on('rain:start', async () => {
      try {
        if (!me) throw new Error('unauthorized');
        const existing = await Rain.findOne({ status: 'open' });
        if (existing) throw new Error('rain_active');
        await chargeUser(me._id, RAIN_COST, { type: 'rain', meta: { action: 'start' } });
        const rain = await Rain.create({
          amountPerUser: RAIN_AMOUNT_EACH,
          maxUsers: RAIN_MAX,
          createdBy: me._id,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
        io.emit('rain:state', rain);
      } catch (e) {
        socket.emit('actionError', { scope: 'rain', error: e.message });
      }
    });

    socket.on('rain:join', async () => {
      try {
        if (!me) throw new Error('unauthorized');
        const rain = await Rain.findOne({ status: 'open' });
        if (!rain) throw new Error('no_rain');
        if (rain.participants.some((p) => p.equals(me._id))) throw new Error('already_joined');
        rain.participants.push(me._id);
        if (rain.participants.length >= rain.maxUsers) {
          rain.status = 'distributed';
          await rain.save();
          for (const p of rain.participants) {
            await creditUser(p, rain.amountPerUser, { type: 'rain', meta: { rain: rain._id } });
          }
          io.emit('rain:state', null);
          io.emit('rain:distributed', { amount: rain.amountPerUser, count: rain.participants.length });
        } else {
          await rain.save();
          io.emit('rain:state', rain);
        }
      } catch (e) {
        socket.emit('actionError', { scope: 'rain', error: e.message });
      }
    });

    // ---------- Crash ----------
    socket.on('crash:bet', async ({ amount }) => {
      try {
        if (!me) throw new Error('unauthorized');
        const st = await crash.placeBet(me, amount);
        socket.emit('crash:betAccepted', { amount });
        broadcastUserUpdate(me._id);
        socket.emit('crash:state', st);
      } catch (e) {
        socket.emit('actionError', { scope: 'crash', error: e.message });
      }
    });

    socket.on('crash:cashout', async () => {
      try {
        if (!me) throw new Error('unauthorized');
        const out = await crash.cashout(me);
        socket.emit('crash:cashed', out);
        broadcastUserUpdate(me._id);
      } catch (e) {
        socket.emit('actionError', { scope: 'crash', error: e.message });
      }
    });

    // ---------- Coinflip ----------
    socket.on('coinflip:create', async ({ amount, side }) => {
      try {
        if (!me) throw new Error('unauthorized');
        await coinflip.create(me, amount, side);
        broadcastUserUpdate(me._id);
      } catch (e) {
        socket.emit('actionError', { scope: 'coinflip', error: e.message });
      }
    });
    socket.on('coinflip:join', async ({ lobbyId }) => {
      try {
        if (!me) throw new Error('unauthorized');
        await coinflip.join(me, lobbyId);
        broadcastUserUpdate(me._id);
      } catch (e) {
        socket.emit('actionError', { scope: 'coinflip', error: e.message });
      }
    });
    socket.on('coinflip:cancel', async ({ lobbyId }) => {
      try {
        if (!me) throw new Error('unauthorized');
        await coinflip.cancel(me, lobbyId);
        broadcastUserUpdate(me._id);
      } catch (e) {
        socket.emit('actionError', { scope: 'coinflip', error: e.message });
      }
    });
  });

  async function broadcastUserUpdate(userId) {
    const user = await User.findById(userId);
    if (!user) return;
    const entry = online.get(userId.toString());
    if (entry) {
      for (const sid of entry.sockets) {
        io.to(sid).emit('user:update', user.toSelf());
      }
    }
  }

  return { broadcastUserUpdate, onlineUsers };
}

module.exports = { setupSocket };
