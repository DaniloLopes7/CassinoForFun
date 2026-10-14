const mongoose = require('mongoose');

// Evento esportivo (sincronizado da The Odds API ou do provedor demo)
const sportEventSchema = new mongoose.Schema(
  {
    externalId: { type: String, unique: true, sparse: true }, // id do provedor
    sportKey: { type: String, required: true, index: true }, // ex: soccer_epl
    sportTitle: { type: String, default: '' },
    league: { type: String, default: '' },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    startsAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'finished', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    homeScore: { type: Number, default: null },
    awayScore: { type: Number, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Mercado de apostas ligado a um evento (h2h = moneyline/vencedor)
const sportMarketSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'SportEvent', required: true, index: true },
    key: { type: String, default: 'h2h' }, // h2h | totals (extensivel)
    outcomes: [
      {
        key: String, // home | draw | away | over | under
        label: String,
        odds: { type: Number, required: true }, // decimal odds (ex: 2.10)
      },
    ],
    status: { type: String, enum: ['open', 'suspended', 'settled', 'cancelled'], default: 'open', index: true },
    winningOutcome: { type: String, default: null },
  },
  { timestamps: true }
);

const sportBetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'SportMarket', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'SportEvent', required: true },
    outcome: { type: String, required: true },
    odds: { type: Number, required: true }, // odds travadas no momento da aposta
    stake: { type: Number, required: true }, // centavos
    potentialPayout: { type: Number, required: true }, // centavos
    status: { type: String, enum: ['pending', 'won', 'lost', 'refunded'], default: 'pending', index: true },
    settledAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = {
  SportEvent: mongoose.model('SportEvent', sportEventSchema),
  SportMarket: mongoose.model('SportMarket', sportMarketSchema),
  SportBet: mongoose.model('SportBet', sportBetSchema),
};
