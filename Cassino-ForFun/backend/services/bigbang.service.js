const axios = require('axios');

const BASE_URL = 'https://api.bigbangcasino.bet/api/v1';

class BigBangService {
  constructor() {
    this.apiKey = process.env.BIGBANG_API_KEY;
    if (!this.apiKey) {
      console.error('CRITICAL: BIGBANG_API_KEY is not defined in .env');
    } else {
      console.log(`[BigBang Service] Initialized with API Key: ${this.apiKey.substring(0, 10)}...`);
    }
  }

  getHeaders() {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async getGames(params = {}) {
    try {
      const response = await axios.get(`${BASE_URL}/games`, {
        headers: this.getHeaders(),
        params,
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async launchGame(payload) {
    try {
      const response = await axios.post(`${BASE_URL}/games/launch`, payload, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createPlayer(userToken, username, country) {
    try {
      const response = await axios.post(`${BASE_URL}/users/create`, {
        user_token: userToken,
        username: username,
        country: country,
      }, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getDemoUrl(gameId) {
    try {
      const lobbyResponse = await axios.post('https://demo.amusnet.com/api/lobby', {}, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://demo.amusnet.com/',
          'Origin': 'https://demo.amusnet.com',
          'Accept': 'application/json, text/plain, */*'
        }
      });
      const token = lobbyResponse.data.gameLaunchToken;

      if (!token) {
        throw new Error('Failed to obtain gameLaunchToken from Amusnet');
      }

      const demoUrl = `https://free.games.amusnet.io/gl/amusnet?gameLaunchToken=${token}&gameId=${gameId}&amount=500000&language=en&client=desktop&closeurl=https://demo.amusnet.com`;

      return { success: true, game_url: demoUrl };
    } catch (error) {
      console.error('[BigBang Demo] Error fetching demo URL:', error.message);
      if (error.response) {
        console.error('[BigBang Demo] Response status:', error.response.status, 'Data:', error.response.data);
      }
      return this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data.error || {
          code: error.response.status,
          message: 'BigBang API error',
        },
      };
    }
    return {
      success: false,
      error: { code: 500, message: error.message || 'Internal Server Error' },
    };
  }
}

module.exports = new BigBangService();
