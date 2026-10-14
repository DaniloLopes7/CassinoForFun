/**
 * DBET Discord Bot (read-only)
 * Comandos: /dbet-ranking, /dbet-profile <username>, /dbet-link <codigo>
 * O bot NUNCA movimenta saldo — so leitura da API publica.
 */
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, API_URL = 'http://localhost:5000' } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('Configure DISCORD_TOKEN e DISCORD_CLIENT_ID no .env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const fmt = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('dbet-ranking').setDescription('Top jogadores do DBET'),
    new SlashCommandBuilder()
      .setName('dbet-profile')
      .setDescription('Perfil publico de um jogador')
      .addStringOption((o) => o.setName('username').setDescription('Nome de usuario').setRequired(true)),
  ].map((c) => c.toJSON());
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  if (DISCORD_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: commands });
  } else {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
  }
  console.log('[dbet-bot] comandos registrados');
}

client.once('ready', () => {
  console.log(`[dbet-bot] online como ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    if (interaction.commandName === 'dbet-ranking') {
      const { data } = await axios.get(`${API_URL}/users/leaderboard?by=won`);
      const lines = data.top.slice(0, 10).map((u, i) => `**${i + 1}.** ${u.username} — ${fmt(u.stats.won)} (Lv ${u.level})`);
      const embed = new EmbedBuilder().setTitle('🏆 DBET — Ranking').setColor(0xf5c542).setDescription(lines.join('\n') || 'Sem dados');
      await interaction.reply({ embeds: [embed] });
    }
    if (interaction.commandName === 'dbet-profile') {
      const username = interaction.options.getString('username', true);
      try {
        const { data } = await axios.get(`${API_URL}/users/by-username/${encodeURIComponent(username)}`);
        const u = data.user;
        const embed = new EmbedBuilder()
          .setTitle(`🎰 ${u.username} — DBET`)
          .setColor(0xf5c542)
          .setThumbnail(u.avatar || null)
          .addFields(
            { name: 'Nível', value: String(u.level), inline: true },
            { name: 'Apostas', value: String(u.stats.bets), inline: true },
            { name: 'Apostado', value: fmt(u.stats.wagered), inline: true },
            { name: 'Ganho', value: fmt(u.stats.won), inline: true },
            { name: 'Maior vitória', value: fmt(u.stats.biggestWin), inline: true }
          );
        await interaction.reply({ embeds: [embed] });
      } catch {
        await interaction.reply({ content: 'Usuário não encontrado.', ephemeral: true });
      }
    }
  } catch (e) {
    await interaction.reply({ content: 'Erro ao consultar a API.', ephemeral: true }).catch(() => {});
  }
});

registerCommands().then(() => client.login(DISCORD_TOKEN));
