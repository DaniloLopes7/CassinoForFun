// Smoke test manual do socket (nao roda no jest): node __tests__/socket-smoke.cjs <TOKEN>
const { io } = require('socket.io-client');
const axios = require('axios');

async function main() {
  const login = await axios.post('http://localhost:5000/auth/login', { email: 't1@dbet.app', password: 'secret123' });
  const token = login.data.token;
  const s = io('http://localhost:5000', { auth: { token } });

  s.on('crash:state', (st) => {
    console.log('[crash]', st.status, 'round', st.roundId, 'mult', st.multiplier, 'bets', st.bets.length);
    if (st.status === 'betting') s.emit('crash:bet', { amount: 300 });
    if (st.status === 'crashed' && !process.env.DONE) {
      process.env.DONE = '1';
      setTimeout(() => process.exit(0), 500);
    }
  });
  s.on('crash:tick', () => {
    s.emit('crash:cashout');
  });
  s.on('crash:cashed', (r) => console.log('[cashed]', r));
  s.on('actionError', (e) => console.log('[error]', e));
  s.on('chat:history', (h) => console.log('[chat history]', h.length, 'mensagens'));
  s.on('chat:message', (mm) => console.log('[chat]', mm.username + ':', mm.text));
  s.on('onlineUsers', (u) => console.log('[online]', u.map((x) => x.username).join(',')));
  s.on('connect', () => {
    console.log('[connect]');
    s.emit('chat:send', { text: 'DBET online!' });
  });
  setTimeout(() => process.exit(1), 30000);
}
main();
