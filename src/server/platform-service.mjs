import { createGamesServiceClient } from "@dashboard/games-sdk/service";

export function createDashboardService(config, fetchImpl = globalThis.fetch) {
  return createGamesServiceClient({
    baseUrl: config.dashboardApiUrl,
    apiKey: config.apiKey,
    gameId: config.gameId,
    gameVersion: config.gameVersion,
    fetchImpl,
    timeoutMs: 5_000
  });
}
