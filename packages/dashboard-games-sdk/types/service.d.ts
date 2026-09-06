export type JsonObject = { [key: string]: unknown };
export type ServiceParticipant = {
  playerId: string;
  result: string;
  stats: JsonObject;
  rewards: JsonObject;
};
export type ServiceEvent = {
  eventId: string;
  type: string;
  playerId?: string;
  data: JsonObject;
  occurredAt?: string;
};
export type ServiceClientOptions = {
  baseUrl: string;
  apiKey: string;
  gameId: string;
  gameVersion: string;
  fetchImpl?: ServiceFetch;
  timeoutMs?: number;
};
export type ServiceResponse = {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
};
export type ServiceFetch = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: unknown;
}) => Promise<ServiceResponse>;

export declare class GamesServiceError extends Error {
  readonly status: number;
  readonly code: string;
  readonly payload: unknown;
}
export declare class GamesServiceClient {
  constructor(options: ServiceClientOptions);
  readonly baseUrl: string;
  readonly gameId: string;
  readonly gameVersion: string;
  exchangeLaunchCode(launchCode: string): Promise<JsonObject>;
  heartbeat(sessionId: string): Promise<JsonObject>;
  getProgress(playerId: string): Promise<JsonObject>;
  putProgress(playerId: string, input: {
    schemaVersion: number;
    expectedVersion: number;
    data: JsonObject;
    idempotencyKey: string;
  }): Promise<JsonObject>;
  checkpoint(sessionId: string, input: {
    eventId: string;
    runId: string;
    playerId: string;
    checkpoint: string;
    stats: JsonObject;
    gameVersion?: string;
  }): Promise<JsonObject>;
  finish(sessionId: string, input: {
    eventId: string;
    runId: string;
    participants: ServiceParticipant[];
    gameVersion?: string;
    finishedAt?: string;
  }): Promise<JsonObject>;
  batchEvents(events: ServiceEvent[]): Promise<JsonObject>;
  request(path: string, options?: { method?: string; body?: JsonObject }): Promise<JsonObject>;
}
export declare function createGamesServiceClient(options: ServiceClientOptions): GamesServiceClient;
export declare function normalizeGamesV1BaseUrl(value: string): string;
export { GAME_API_COMPATIBILITY } from "./contract.js";
