/**
 * DBET Sports — sincronizacao de eventos e odds.
 *
 * Fonte principal: The Odds API v4 (https://the-odds-api.com)
 *  - Sem ODDS_API_KEY -> provedor DEMO (partidas sinteticas, para desenvolvimento).
 *  - Com chave -> traz eventos reais, odds consenso (media das casas) e resultados.
 *
 * Mercados: h2h (vencedor; draw incluido no futebol).
 * Apos o fim do jogo, um job consulta /scores e liquida as apostas.
 */
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const { SportEvent, SportMarket, SportBet } = require('../models/sports');
const { creditUser } = require('../utils/economy');

const API_BASE = 'https://api.the-odds-api.com/v4';

// Vig (margem da casa) — retirada das odds justas consenso.
const VIG = 0.04;

function applyVig(odds) {
  return Math.max(1.01, Math.round(odds * (1 - VIG) * 100) / 100);
}

// ---------------------------------------------------------------- DEMO provider
function demoProvider() {
  const TEAMS = {
    soccer_epl: ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 'Tottenham', 'Newcastle', 'Aston Villa'],
    soccer_brazil_campeonato: ['Flamengo', 'Palmeiras', 'Corinthians', 'São Paulo', 'Grêmio', 'Fluminense', 'Botafogo', 'Santos'],
    basketball_nba: ['Lakers', 'Celtics', 'Warriors', 'Bucks', 'Nuggets', 'Suns', 'Heat', '76ers'],
    tennis_atp: ['Alcaraz', 'Sinner', 'Djokovic', 'Medvedev', 'Zverev', 'Tsitsipas', 'Rune', 'Fritz'],
  };
  const TITLES = {
    soccer_epl: 'Premier League',
    soccer_brazil_campeonato: 'Brasileirão Série A',
    basketball_nba: 'NBA',
    tennis_atp: 'ATP Tour',
  };

  function generate() {
    const events = [];
    const now = Date.now();
    for (const [sportKey, teams] of Object.entries(TEAMS)) {
      for (let i = 0; i < 4; i++) {
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        const home = shuffled[0];
        const away = shuffled[1];
        const startsAt = new Date(now + (i + 1) * 3 * 3600 * 1000 + Math.floor(Math.random() * 3600) * 1000);
        const isSoccer = sportKey.startsWith('soccer');
        const homeStrength = 0.35 + Math.random() * 0.45;
        const homeProb = homeStrength;
        const drawProb = isSoccer ? 0.27 : 0;
        const awayProb = 1 - homeProb - drawProb;
        const outcomes = [
          { key: 'home', label: home, odds: applyVig(1 / Math.max(0.05, homeProb)) },
          ...(isSoccer ? [{ key: 'draw', label: 'Empate', odds: applyVig(1 / drawProb) }] : []),
          { key: 'away', label: away, odds: applyVig(1 / Math.max(0.05, awayProb)) },
        ];
        events.push({
          externalId: `demo-${sportKey}-${crypto.createHash('md5').update(home + away + startsAt.getHours()).digest('hex').slice(0, 10)}`,
          sportKey,
          sportTitle: TITLES[sportKey] || sportKey,
          league: TITLES[sportKey] || '',
          homeTeam: home,
          awayTeam: away,
          startsAt,
          outcomes,
        });
      }
    }
    return events;
  }

  // Resultados demo: para eventos passados, sorteia placar
  function resultFor(event) {
    const isSoccer = event.sportKey.startsWith('soccer');
    if (isSoccer) {
      const hs = Math.floor(Math.random() * 4);
      const as = Math.floor(Math.random() * 3);
      return { homeScore: hs, awayScore: as };
    }
    const hs = 90 + Math.floor(Math.random() * 40);
    const as = 85 + Math.floor(Math.random() * 40);
    return hs === as ? { homeScore: hs + 2, awayScore: as } : { homeScore: hs, awayScore: as };
  }

  return { generate, resultFor };
}

// ---------------------------------------------------------------- The Odds API provider
function oddsApiProvider() {
  const client = axios.create({ baseURL: API_BASE, timeout: 15000 });

  async function fetchOddsForSport(sportKey) {
    const { data } = await client.get(`/sports/${sportKey}/odds/`, {
      params: {
        apiKey: config.oddsApiKey,
        regions: 'eu,uk,us',
        markets: 'h2h',
        oddsFormat: 'decimal',
      },
    });
    return data;
  }

  async function fetchScoresForSport(sportKey) {
    const { data } = await client.get(`/sports/${sportKey}/scores/`, {
      params: { apiKey: config.oddsApiKey, daysFrom: 2 },
    });
    return data;
  }

  return { fetchOddsForSport, fetchScoresForSport };
}

// ---------------------------------------------------------------- Sync
async function syncEvents(io) {
  const useDemo = !config.oddsApiKey;
  if (useDemo) {
    const demo = demoProvider();
    const events = demo.generate();
    for (const ev of events) {
      const existing = await SportEvent.findOne({ externalId: ev.externalId });
      if (existing) continue;
      const created = await SportEvent.create({ ...ev, status: 'scheduled', isDemo: true });
      await SportMarket.create({ event: created._id, key: 'h2h', outcomes: ev.outcomes });
    }
    return { synced: events.length, demo: true };
  }

  const api = oddsApiProvider();
  let count = 0;
  for (const sportKey of config.oddsApiSports) {
    try {
      const raw = await api.fetchOddsForSport(sportKey);
      for (const ev of raw.slice(0, 20)) {
        const existing = await SportEvent.findOne({ externalId: ev.id });
        // odds consenso = media das casas
        const outcomesByKey = {};
        for (const bk of ev.bookmakers || []) {
          const mkt = (bk.markets || []).find((m) => m.key === 'h2h');
          if (!mkt) continue;
          for (const o of mkt.outcomes) {
            outcomesByKey[o.name] = outcomesByKey[o.name] || [];
            outcomesByKey[o.name].push(o.price);
          }
        }
        const outcomes = Object.entries(outcomesByKey).map(([name, prices]) => ({
          key: name === ev.home_team ? 'home' : name === ev.away_team ? 'away' : 'draw',
          label: name === 'Draw' ? 'Empate' : name,
          odds: applyVig(prices.reduce((a, b) => a + b, 0) / prices.length),
        }));
        if (outcomes.length < 2) continue;

        if (existing) {
          // atualiza odds se mercado aberto
          const market = await SportMarket.findOne({ event: existing._id, status: 'open' });
          if (market) {
            market.outcomes = outcomes;
            await market.save();
          }
          continue;
        }
        const created = await SportEvent.create({
          externalId: ev.id,
          sportKey,
          sportTitle: ev.sport_title || '',
          league: ev.sport_title || '',
          homeTeam: ev.home_team,
          awayTeam: ev.away_team,
          startsAt: new Date(ev.commence_time),
          status: 'scheduled',
        });
        await SportMarket.create({ event: created._id, key: 'h2h', outcomes });
        count++;
      }
    } catch (e) {
      console.error(`[sports] sync falhou p/ ${sportKey}:`, e.message);
    }
  }
  if (io) io.emit('sports:updated', { at: Date.now() });
  return { synced: count, demo: false };
}

// Marca eventos iniciados como live e finalizados conforme horario
async function sweepEventStatuses() {
  const now = new Date();
  await SportEvent.updateMany({ status: 'scheduled', startsAt: { $lte: now } }, { status: 'live' });
  // demo: finaliza 2h30 apos inicio
  const demoCutoff = new Date(now.getTime() - 150 * 60 * 1000);
  await SportEvent.updateMany({ status: 'live', isDemo: true, startsAt: { $lte: demoCutoff } }, { status: 'finished' });
}

// Liquidacao: consulta resultados e paga vencedores.
// Busca /scores UMA vez por esporte (economia de quota da API).
async function settleFinished(io) {
  const finished = await SportEvent.find({ status: 'finished', $or: [{ homeScore: null }, { settled: { $ne: true } }] }).limit(100);
  const demo = demoProvider();
  const api = config.oddsApiKey ? oddsApiProvider() : null;

  // Agrupa por esporte para minimizar chamadas a API
  const scoresCache = new Map();
  async function scoresFor(sportKey) {
    if (!scoresCache.has(sportKey)) {
      const scores = await api.fetchScoresForSport(sportKey).catch(() => []);
      scoresCache.set(sportKey, scores || []);
    }
    return scoresCache.get(sportKey);
  }

  for (const ev of finished) {
    try {
      let homeScore = ev.homeScore;
      let awayScore = ev.awayScore;

      if (homeScore == null) {
        if (ev.isDemo || !api) {
          const r = demo.resultFor(ev);
          homeScore = r.homeScore;
          awayScore = r.awayScore;
        } else {
          const scores = await scoresFor(ev.sportKey);
          const match = (scores || []).find((s) => s.id === ev.externalId);
          if (!match || !match.completed) continue;
          const hs = (match.scores || []).find((s) => s.name === match.home_team);
          const as = (match.scores || []).find((s) => s.name === match.away_team);
          if (!hs || !as) continue;
          homeScore = Number(hs.score);
          awayScore = Number(as.score);
        }
      }

      ev.homeScore = homeScore;
      ev.awayScore = awayScore;
      ev.status = 'finished';
      await ev.save();

      const winner = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';
      const markets = await SportMarket.find({ event: ev._id, status: { $in: ['open', 'suspended'] } });
      for (const market of markets) {
        market.status = 'settled';
        market.winningOutcome = winner;
        await market.save();

        const bets = await SportBet.find({ market: market._id, status: 'pending' });
        for (const bet of bets) {
          if (bet.outcome === winner) {
            bet.status = 'won';
            bet.settledAt = new Date();
            await bet.save();
            await creditUser(bet.user, bet.potentialPayout, {
              type: 'sport_win',
              game: 'sports',
              meta: { event: ev._id, outcome: bet.outcome, odds: bet.odds },
            });
          } else {
            bet.status = 'lost';
            bet.settledAt = new Date();
            await bet.save();
          }
        }
      }
      if (io) io.emit('sports:settled', { eventId: ev._id, winner, homeScore, awayScore });
    } catch (e) {
      console.error('[sports] settle falhou:', e.message);
    }
  }
}

module.exports = { syncEvents, sweepEventStatuses, settleFinished, applyVig, VIG };
