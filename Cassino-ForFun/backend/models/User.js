const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: '' },

    // Saldo em centavos (inteiro) — moeda ficticia, sem valor real.
    balance: { type: Number, default: 0, min: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    banned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },

    // Provably fair
    clientSeed: { type: String, default: '' },
    serverSeed: { type: String, default: '' },
    serverSeedHash: { type: String, default: '' },
    nonce: { type: Number, default: 0 },
    revealedSeeds: [
      {
        serverSeed: String,
        serverSeedHash: String,
        rotateAtNonce: Number,
        revealedAt: Date,
      },
    ],

    // Social / economia
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastDailyBonusAt: { type: Date },
    dailyStreak: { type: Number, default: 0 },
    lastSafetyNetAt: { type: Date },

    stats: {
      bets: { type: Number, default: 0 },
      wagered: { type: Number, default: 0 }, // centavos
      won: { type: Number, default: 0 }, // centavos
      biggestWin: { type: Number, default: 0 },
    },

    mutedUntil: { type: Date },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    level: this.level,
    createdAt: this.createdAt,
    stats: this.stats,
  };
};

userSchema.methods.toSelf = function () {
  return {
    ...this.toPublic(),
    email: this.email,
    balance: this.balance,
    xp: this.xp,
    role: this.role,
    clientSeed: this.clientSeed,
    serverSeedHash: this.serverSeedHash,
    nonce: this.nonce,
    referralCode: this.referralCode,
    dailyStreak: this.dailyStreak,
  };
};

module.exports = mongoose.model('User', userSchema);
