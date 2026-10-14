const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'bet',
        'win',
        'refund',
        'bonus',
        'daily_gift',
        'referral',
        'admin_adjust',
        'rain',
        'tip',
        'sport_bet',
        'sport_win',
        'sport_refund',
      ],
      required: true,
    },
    amount: { type: Number, required: true }, // centavos, com sinal
    balanceAfter: { type: Number, required: true },
    game: { type: String, default: '' },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

const chatMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String,
    avatar: String,
    text: { type: String, maxlength: 280, required: true },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const rainSchema = new mongoose.Schema(
  {
    amountPerUser: { type: Number, required: true },
    maxUsers: { type: Number, default: 25 },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['open', 'distributed'], default: 'open' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const gameSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    game: { type: String, enum: ['blackjack', 'mines', 'hilo'], required: true },
    bet: { type: Number, required: true },
    state: { type: Object, required: true },
    status: { type: String, enum: ['active', 'done'], default: 'active' },
    nonce: { type: Number, required: true },
    serverSeedHash: { type: String, required: true },
  },
  { timestamps: true }
);
gameSessionSchema.pre('save', function () {
  this.markModified('state');
});

const liveRoundSchema = new mongoose.Schema(
  {
    game: { type: String, enum: ['crash', 'coinflip'], required: true, index: true },
    roundId: { type: Number, required: true },
    result: { type: Object, default: {} },
    serverSeedHash: String,
    serverSeed: String,
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

const friendSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    friend: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = {
  User: require('./User'),
  Transaction: mongoose.model('Transaction', transactionSchema),
  ChatMessage: mongoose.model('ChatMessage', chatMessageSchema),
  Rain: mongoose.model('Rain', rainSchema),
  GameSession: mongoose.model('GameSession', gameSessionSchema),
  LiveRound: mongoose.model('LiveRound', liveRoundSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Friend: mongoose.model('Friend', friendSchema),
};
