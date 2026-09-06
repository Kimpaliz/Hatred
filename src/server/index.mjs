import { loadConfig } from "./config.mjs";
import { createGameServer } from "./http.mjs";
import { createDashboardService } from "./platform-service.mjs";

try {
  const config = loadConfig();
  const server = createGameServer({ config, platformService: createDashboardService(config) });
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`Golden Path Game ${config.gameVersion} lauscht auf Port ${config.port}.`);
  });
  const close = () => server.close(() => process.exit(0));
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Konfiguration ungültig.");
  process.exit(1);
}
