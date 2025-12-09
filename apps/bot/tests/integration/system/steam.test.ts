/**
 * Integration Test: Steam API (Public - No API Key Required)
 * Test các chức năng tìm kiếm game, xem chi tiết, top games
 */

import { describe, test, expect } from 'bun:test';
import {
  searchGames,
  getGameDetails,
  getFullGameInfo,
  getCurrentPlayers,
  getTopGames,
  getGameStats,
} from '../../../src/modules/system/services/steamClient.js';
import { TEST_CONFIG } from '../setup.js';

// Popular games for testing
const TEST_GAMES = {
  csgo: { appId: 730, name: 'Counter-Strike 2' },
  dota2: { appId: 570, name: 'Dota 2' },
  pubg: { appId: 578080, name: 'PUBG' },
  gta5: { appId: 271590, name: 'Grand Theft Auto V' },
  elden: { appId: 1245620, name: 'ELDEN RING' },
  cyberpunk: { appId: 1091500, name: 'Cyberpunk 2077' },
  witcher3: { appId: 292030, name: 'The Witcher 3' },
  terraria: { appId: 105600, name: 'Terraria' },
  stardew: { appId: 413150, name: 'Stardew Valley' },
  hollow: { appId: 367520, name: 'Hollow Knight' },
};

// Free to play games
const FREE_GAMES = {
  csgo: 730,
  dota2: 570,
  tf2: 440,
  warframe: 230410,
  destiny2: 1085660,
};

describe('Steam API Integration - Search', () => {
  test('searchGames - tìm Counter-Strike', async () => {
    const results = await searchGames('Counter-Strike', 5);

    expect(results).toBeArray();
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);

    const game = results[0];
    expect(game.appId).toBeDefined();
    expect(game.name).toBeDefined();
    expect(game.name.toLowerCase()).toContain('counter');
  }, TEST_CONFIG.timeout);

  test('searchGames - tìm Dota', async () => {
    const results = await searchGames('Dota 2', 3);

    expect(results).toBeArray();
    expect(results.length).toBeGreaterThan(0);

    const hasDota = results.some((g) => g.name.toLowerCase().includes('dota'));
    expect(hasDota).toBe(true);
  }, TEST_CONFIG.timeout);

  test('searchGames - tìm game Việt Nam', async () => {
    const results = await searchGames('Vietnam', 10);
    expect(results).toBeArray();
  }, TEST_CONFIG.timeout);

  test('searchGames - tìm game không tồn tại', async () => {
    const results = await searchGames('xyznotexist12345game', 5);

    expect(results).toBeArray();
    expect(results.length).toBe(0);
  }, TEST_CONFIG.timeout);

  test('searchGames - tìm với limit khác nhau', async () => {
    const results3 = await searchGames('RPG', 3);
    const results10 = await searchGames('RPG', 10);

    expect(results3.length).toBeLessThanOrEqual(3);
    expect(results10.length).toBeLessThanOrEqual(10);
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Game Details', () => {
  test('getGameDetails - Counter-Strike 2', async () => {
    const game = await getGameDetails(TEST_GAMES.csgo.appId);

    expect(game).not.toBeNull();
    expect(game!.appId).toBe(TEST_GAMES.csgo.appId);
    expect(game!.name).toContain('Counter-Strike');
    expect(game!.type).toBe('game');
    expect(game!.isFree).toBe(true);
    expect(game!.platforms.windows).toBe(true);
    expect(game!.genres).toBeArray();
    expect(game!.categories).toBeArray();
  }, TEST_CONFIG.timeout);

  test('getGameDetails - Dota 2 (Free to Play)', async () => {
    const game = await getGameDetails(TEST_GAMES.dota2.appId);

    expect(game).not.toBeNull();
    expect(game!.name).toContain('Dota');
    expect(game!.isFree).toBe(true);
    expect(game!.price).toBeNull();
  }, TEST_CONFIG.timeout);

  test('getGameDetails - ELDEN RING (Paid game)', async () => {
    const game = await getGameDetails(TEST_GAMES.elden.appId);

    expect(game).not.toBeNull();
    expect(game!.name).toContain('ELDEN RING');
    expect(game!.isFree).toBe(false);
    expect(game!.price).not.toBeNull();
    expect(game!.price!.final).toBeGreaterThan(0);
    expect(game!.metacritic).not.toBeNull();
    expect(game!.metacritic!.score).toBeGreaterThan(90);
  }, TEST_CONFIG.timeout);

  test('getGameDetails - game có screenshots và trailers', async () => {
    const game = await getGameDetails(TEST_GAMES.cyberpunk.appId);

    expect(game).not.toBeNull();
    expect(game!.screenshots).toBeArray();
    expect(game!.screenshots.length).toBeGreaterThan(0);
    expect(game!.headerImage).toContain('http');
  }, TEST_CONFIG.timeout);

  test('getGameDetails - game không tồn tại', async () => {
    const game = await getGameDetails(999999999);
    expect(game).toBeNull();
  }, TEST_CONFIG.timeout);

  test('getGameDetails - kiểm tra platforms', async () => {
    const game = await getGameDetails(TEST_GAMES.terraria.appId);

    expect(game).not.toBeNull();
    expect(game!.platforms).toBeDefined();
    expect(typeof game!.platforms.windows).toBe('boolean');
    expect(typeof game!.platforms.mac).toBe('boolean');
    expect(typeof game!.platforms.linux).toBe('boolean');
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Current Players', () => {
  test('getCurrentPlayers - CS2', async () => {
    const players = await getCurrentPlayers(TEST_GAMES.csgo.appId);

    expect(players).not.toBeNull();
    expect(players).toBeGreaterThan(0);
    expect(players).toBeGreaterThan(10000);
  }, TEST_CONFIG.timeout);

  test('getCurrentPlayers - Dota 2', async () => {
    const players = await getCurrentPlayers(TEST_GAMES.dota2.appId);

    expect(players).not.toBeNull();
    expect(players).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('getCurrentPlayers - game ít người chơi', async () => {
    const players = await getCurrentPlayers(TEST_GAMES.hollow.appId);

    expect(players).not.toBeNull();
    expect(players).toBeGreaterThanOrEqual(0);
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Top Games (SteamSpy)', () => {
  test('getTopGames - top 2 weeks', async () => {
    const games = await getTopGames('top100in2weeks', 10);

    expect(games).toBeArray();
    expect(games.length).toBeGreaterThan(0);
    expect(games.length).toBeLessThanOrEqual(10);

    const game = games[0];
    expect(game.appId).toBeDefined();
    expect(game.name).toBeDefined();
    expect(game.currentPlayers).toBeGreaterThanOrEqual(0);
  }, TEST_CONFIG.timeout);

  test('getTopGames - top forever', async () => {
    const games = await getTopGames('top100forever', 20);

    expect(games).toBeArray();
    expect(games.length).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('getTopGames - top owned', async () => {
    const games = await getTopGames('top100owned', 15);

    expect(games).toBeArray();
    expect(games.length).toBeGreaterThan(0);

    const game = games[0];
    expect(game.owners).toBeDefined();
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Game Stats (SteamSpy)', () => {
  test('getGameStats - CS2', async () => {
    const stats = await getGameStats(TEST_GAMES.csgo.appId);

    expect(stats).not.toBeNull();
    expect(stats!.owners).toBeDefined();
    expect(stats!.ccu).toBeGreaterThanOrEqual(0);
    expect(stats!.averageForever).toBeGreaterThanOrEqual(0);
    expect(stats!.tags).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('getGameStats - game có tags', async () => {
    const stats = await getGameStats(TEST_GAMES.witcher3.appId);

    expect(stats).not.toBeNull();
    expect(stats!.tags).toBeDefined();
    expect(Object.keys(stats!.tags).length).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Full Game Info', () => {
  test('getFullGameInfo - kết hợp Store + SteamSpy', async () => {
    const info = await getFullGameInfo(TEST_GAMES.stardew.appId);

    expect(info).not.toBeNull();
    expect(info!.details).toBeDefined();
    expect(info!.details.name).toContain('Stardew');
    expect(info!.stats).toBeDefined();
    expect(info!.currentPlayers).not.toBeNull();
  }, TEST_CONFIG.timeout);

  test('getFullGameInfo - game không tồn tại', async () => {
    const info = await getFullGameInfo(999999999);
    expect(info).toBeNull();
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Popular Vietnamese Games', () => {
  test('searchGames - tìm PUBG', async () => {
    const results = await searchGames('PUBG', 5);

    expect(results).toBeArray();
    const hasPubg = results.some(
      (g) => g.name.toLowerCase().includes('pubg') || g.name.toLowerCase().includes('battlegrounds'),
    );
    expect(hasPubg).toBe(true);
  }, TEST_CONFIG.timeout);

  test('searchGames - tìm FIFA', async () => {
    const results = await searchGames('FIFA', 5);

    expect(results).toBeArray();
    expect(results.length).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('getGameDetails - GTA V', async () => {
    const game = await getGameDetails(271590);

    expect(game).not.toBeNull();
    expect(game!.name).toContain('Grand Theft Auto');
    expect(game!.recommendations).toBeGreaterThan(100000);
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Game Categories', () => {
  test('getGameDetails - game có categories', async () => {
    const game = await getGameDetails(TEST_GAMES.csgo.appId);

    expect(game).not.toBeNull();
    expect(game!.categories).toBeArray();
    expect(game!.categories.length).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('getGameDetails - game có genres', async () => {
    const game = await getGameDetails(TEST_GAMES.witcher3.appId);

    expect(game).not.toBeNull();
    expect(game!.genres).toBeArray();
    expect(game!.genres.length).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('getGameDetails - game có achievements', async () => {
    const game = await getGameDetails(TEST_GAMES.hollow.appId);

    expect(game).not.toBeNull();
    expect(game!.achievements).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Price & Discounts', () => {
  test('getGameDetails - kiểm tra giá VND', async () => {
    const game = await getGameDetails(TEST_GAMES.elden.appId);

    expect(game).not.toBeNull();
    if (game!.price) {
      expect(game!.price.currency).toBeDefined();
      expect(game!.price.final).toBeGreaterThan(0);
      expect(game!.price.formatted).toBeDefined();
    }
  }, TEST_CONFIG.timeout);

  test('getGameDetails - game miễn phí', async () => {
    const game = await getGameDetails(FREE_GAMES.warframe);

    expect(game).not.toBeNull();
    expect(game!.isFree).toBe(true);
  }, TEST_CONFIG.timeout);
});

describe('Steam API Integration - Error Handling', () => {
  test('getGameDetails - invalid appId', async () => {
    const game = await getGameDetails(-1);
    expect(game).toBeNull();
  }, TEST_CONFIG.timeout);

  test('searchGames - empty query', async () => {
    const results = await searchGames('', 5);
    expect(results).toBeArray();
  }, TEST_CONFIG.timeout);

  test('getCurrentPlayers - invalid appId', async () => {
    const players = await getCurrentPlayers(999999999);
    expect(players).toBeNull();
  }, TEST_CONFIG.timeout);
});
