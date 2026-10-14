require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT || 5000),
  env: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dbet-dev-secret-change-me',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/dbet',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  oddsApiKey: process.env.ODDS_API_KEY || '',
  oddsApiSports: (process.env.ODDS_API_SPORTS || 'soccer_epl,soccer_brazil_campeonato,basketball_nba,tennis_atp')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  oddsSyncCron: process.env.ODDS_SYNC_CRON || '*/20 * * * *',
  discordBotSecret: process.env.DISCORD_BOT_SECRET || '',
  registerLimit: Number(process.env.REGISTER_LIMIT || 20),
};
