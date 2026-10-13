const uuid = require('uuid');
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  // the profile url. reminted when the name changes, with the one it replaces kept in
  // pastSlugs so a shared link still lands. absent when the name has no latin letters in
  // it, and the id is used then.
  slug: {
    type: String,
  },
  // every name and url this account has worn. held rather than freed: whoever took the old
  // name back would inherit the chat lines still signed with it.
  pastNames: [String],
  pastSlugs: [String],
  usernameChangedAt: {
    type: Date,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  // bumped to invalidate every token issued so far (logout everywhere, password change)
  tokenVersion: {
    type: Number,
    default: 0,
  },
  walletBalance: {
    type: Number,
    default: 200,
  },
  inventory: [
    {
      uniqueId: {
        type: String,
        default: () => uuid.v4(),
      },
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      image: String,
      rarity: String,
      case: mongoose.Schema.Types.ObjectId,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  fixedItem: {
    name: String,
    variant: String,
    image: String,
    rarity: String,
    description: String,
  },
  fixedAt: Date,
  collectionRank: {
    distinct: Number,
    total: Number,
    rank: Number,
  },
  // earned or granted badges. top fan is not here: it is derived from fanRank, because
  // it can be taken off a player the moment someone outcollects them.
  badges: [
    {
      _id: false,
      key: { type: String, required: true },
      awardedAt: { type: Date, default: Date.now },
      note: String,
      // the human name behind a keyed badge, so a collection one can be shown without
      // looking its category up again
      label: String,
    },
  ],
  // the one badge the player wears around the site. nothing shows until they pick one.
  selectedBadge: String,
  // which look the shared fan card uses. validated on read, because the poster styles
  // are only open while the player still leads a board.
  cardStyle: String,
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  friendRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  xp: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 0,
  },
  profilePicture: {
    type: String,
    default: "", // default "" to a default image URL
  },
  // whatever the account started with, a google picture or the placeholder, kept so an
  // item avatar can always be undone without guessing which one they came from
  basePicture: {
    type: String,
    default: "",
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  // a disabled account keeps its rows so the ledger and every board stay consistent, but
  // nothing it holds can be used again. banning by deletion would tear holes in both.
  disabled: {
    type: Boolean,
    default: false,
  },
  disabledAt: Date,
  disabledReason: String,
  nextBonus: {
    type: Date,
    default: () => Date.now() - 86400000 // now - 24 hours
  },
  bonusAmount: {
    type: Number,
    default: 20, // sets the initial bonus amount to 20 (matching level 0 formula)
  },
  weeklyWinnings: {
    type: Number,
    default: 0,
  },
  lastWinningsUpdate: {
    type: Date,
    default: Date.now,
  },
  // affiliate identity: the vanity code others register with, set once
  referralCode: {
    type: String,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // commission already paid out, so available = earned - claimed stays ledger-derived
  referralClaimed: {
    type: Number,
    default: 0,
  },
  // the level-10 reward went to this user's referrer; set once, never unset
  referralMilestonePaid: {
    type: Boolean,
    default: false,
  },

  // marketing consent is opt-in and defaults to off: nobody who signed up before it
  // existed is treated as having agreed. service mail does not consult it.
  marketingOptIn: {
    type: Boolean,
    default: false,
  },
  marketingOptInAt: Date,
  // secret in the one-click unsubscribe link, so it works without a login
  unsubscribeToken: {
    type: String,
    default: () => uuid.v4(),
  },
  // set by the SES bounce/complaint feed; nothing is ever sent to a suppressed address
  emailSuppressed: {
    type: Boolean,
    default: false,
  },
  emailSuppressedReason: String,
  emailSuppressedAt: Date,

  // the daily gift. one spin per site-day; the streak tilts the odds toward the rarer
  // slots and resets the moment a day is missed.
  giftNextAt: Date,
  giftLastAt: Date,
  giftStreak: {
    type: Number,
  },
});

UserSchema.index({ slug: 1 }, { unique: true, sparse: true }); // profile url lookup
UserSchema.index({ pastNames: 1 }, { sparse: true }); // a freed name stays refused
UserSchema.index({ pastSlugs: 1 }, { sparse: true }); // links shared before a rename
UserSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
UserSchema.index({ referredBy: 1 }, { sparse: true });
UserSchema.index({ weeklyWinnings: -1 }); // leaderboard, ranking window, weekly cron
UserSchema.index({ level: -1 }); // the idle seats the daily board fills its empty rows with
UserSchema.index({ "fixedItem.name": 1 }, { sparse: true }); // fan board recount on pin
UserSchema.index({ discordId: 1 }, { unique: true, sparse: true }); // bot lookups, one account per discord user
UserSchema.index({ discordGuilds: 1 }, { sparse: true }); // per-server boards

module.exports = User = mongoose.model("User", UserSchema);
