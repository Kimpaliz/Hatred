import {
  GAME_API_COMPATIBILITY,
  GAMES_V1_API_PATH,
  GAME_SERVICE_ENDPOINTS
} from "./contract.mjs";

const GAME_ID = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const OPAQUE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const SESSION_OR_PLAYER_ID = /^[A-Za-z0-9._:-]{20,128}$/;
const ISO_DATETIME_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const JSON_CONTENT_TYPE = /^application\/(?:[A-Za-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i;

export class GamesServiceError extends Error {
  constructor(message, { status = 0, code = "service_request_failed", payload = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "GamesServiceError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function createGamesServiceClient(options) {
  return new GamesServiceClient(options);
}

export class GamesServiceClient {
  constructor({ baseUrl, apiKey, gameId, gameVersion, fetchImpl = globalThis.fetch, timeoutMs = 8_000 }) {
    this.baseUrl = normalizeGamesV1BaseUrl(baseUrl);
    if (typeof apiKey !== "string" || apiKey.length < 40 || apiKey.length > 1024 || /[\r\n]/.test(apiKey)) {
      throw new TypeError("apiKey fehlt oder ist ungültig.");
    }
    if (typeof gameId !== "string" || !GAME_ID.test(gameId)) throw new TypeError("gameId ist ungültig.");
    if (typeof gameVersion !== "string" || gameVersion.length < 1 || gameVersion.length > 80) {
      throw new TypeError("gameVersion ist ungültig.");
    }
    if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl ist keine Funktion.");
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError("timeoutMs muss zwischen 100 und 60000 liegen.");
    }
    this.apiKey = apiKey;
    this.gameId = gameId;
    this.gameVersion = gameVersion;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  exchangeLaunchCode(launchCode) {
    if (typeof launchCode !== "string" || launchCode.length < 40 || launchCode.length > 256) {
      throw new TypeError("launchCode ist ungültig.");
    }
    return this.request(GAME_SERVICE_ENDPOINTS.exchange, {
      method: "POST",
      body: { launchCode, gameId: this.gameId, gameVersion: this.gameVersion }
    });
  }

  heartbeat(sessionId) {
    assertSessionOrPlayerId(sessionId, "sessionId");
    return this.request(GAME_SERVICE_ENDPOINTS.heartbeat(sessionId), {
      method: "POST",
      body: {}
    });
  }

  getProgress(playerId) {
    assertSessionOrPlayerId(playerId, "playerId");
    return this.request(GAME_SERVICE_ENDPOINTS.progress(playerId));
  }

  putProgress(playerId, input) {
    assertSessionOrPlayerId(playerId, "playerId");
    assertPlainObject(input, "progress");
    assertPositiveInteger(input.schemaVersion, "schemaVersion");
    assertNonNegativeInteger(input.expectedVersion, "expectedVersion");
    assertPlainObject(input.data, "data");
    assertOpaqueId(input.idempotencyKey, "idempotencyKey");
    return this.request(GAME_SERVICE_ENDPOINTS.progress(playerId), {
      method: "PUT",
      body: {
        schemaVersion: input.schemaVersion,
        expectedVersion: input.expectedVersion,
        data: input.data,
        idempotencyKey: input.idempotencyKey
      }
    });
  }

  checkpoint(sessionId, input) {
    assertSessionOrPlayerId(sessionId, "sessionId");
    assertPlainObject(input, "checkpoint");
    for (const key of ["eventId", "runId"]) assertOpaqueId(input[key], key);
    assertSessionOrPlayerId(input.playerId, "playerId");
    if (typeof input.checkpoint !== "string" || !input.checkpoint.trim() || input.checkpoint.length > 100) {
      throw new TypeError("checkpoint ist ungültig.");
    }
    assertPlainObject(input.stats, "stats");
    return this.request(GAME_SERVICE_ENDPOINTS.checkpoint(sessionId), {
      method: "POST",
      body: { ...input, gameVersion: input.gameVersion ?? this.gameVersion }
    });
  }

  finish(sessionId, input) {
    assertSessionOrPlayerId(sessionId, "sessionId");
    assertPlainObject(input, "finish");
    assertOpaqueId(input.eventId, "eventId");
    assertOpaqueId(input.runId, "runId");
    if (!Array.isArray(input.participants) || input.participants.length < 1 || input.participants.length > 32) {
      throw new TypeError("participants muss 1 bis 32 Einträge enthalten.");
    }
    const playerIds = new Set();
    const participants = input.participants.map((participant, index) => {
      assertPlainObject(participant, `participants[${index}]`);
      assertSessionOrPlayerId(participant.playerId, `participants[${index}].playerId`);
      if (playerIds.has(participant.playerId)) throw new TypeError("participants enthält doppelte playerId.");
      playerIds.add(participant.playerId);
      if (typeof participant.result !== "string" || !participant.result.trim() || participant.result.length > 64) {
        throw new TypeError(`participants[${index}].result ist ungültig.`);
      }
      assertPlainObject(participant.stats, `participants[${index}].stats`);
      assertPlainObject(participant.rewards, `participants[${index}].rewards`);
      return {
        playerId: participant.playerId,
        result: participant.result,
        stats: participant.stats,
        rewards: participant.rewards
      };
    });
    const finishedAt = input.finishedAt ?? new Date().toISOString();
    if (typeof finishedAt !== "string"
      || !ISO_DATETIME_WITH_OFFSET.test(finishedAt)
      || !Number.isFinite(Date.parse(finishedAt))) {
      throw new TypeError("finishedAt ist ungültig.");
    }
    return this.request(GAME_SERVICE_ENDPOINTS.finish(sessionId), {
      method: "POST",
      body: {
        eventId: input.eventId,
        runId: input.runId,
        participants,
        gameVersion: input.gameVersion ?? this.gameVersion,
        finishedAt
      }
    });
  }

  batchEvents(events) {
    if (!Array.isArray(events) || events.length < 1 || events.length > 50) {
      throw new TypeError("events muss 1 bis 50 Einträge enthalten.");
    }
    for (const [index, event] of events.entries()) {
      assertPlainObject(event, `events[${index}]`);
      assertOpaqueId(event.eventId, `events[${index}].eventId`);
      if (typeof event.type !== "string" || !/^[a-z][a-z0-9._-]{0,49}$/.test(event.type)) {
        throw new TypeError(`events[${index}].type ist ungültig.`);
      }
      if (event.playerId !== undefined) assertSessionOrPlayerId(event.playerId, `events[${index}].playerId`);
      assertPlainObject(event.data, `events[${index}].data`);
    }
    return this.request(GAME_SERVICE_ENDPOINTS.events, {
      method: "POST",
      body: { events }
    });
  }

  async request(path, { method = "GET", body } = {}) {
    if (typeof path !== "string" || path.startsWith("/") || path.includes("..")) {
      throw new TypeError("Servicepfad muss relativ zur vollständigen Games-v1-Basis sein.");
    }
    const url = new URL(path, `${this.baseUrl}/`).toString();
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    };
    let response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (cause) {
      throw new GamesServiceError("Dashboard Games API ist nicht erreichbar.", {
        code: cause?.name === "TimeoutError" ? "service_timeout" : "service_network_error",
        cause
      });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!JSON_CONTENT_TYPE.test(contentType)) {
      throw new GamesServiceError("Dashboard Games API lieferte keinen JSON-Content-Type.", {
        status: response.status,
        code: "invalid_json_content_type"
      });
    }
    let payload;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new GamesServiceError("Dashboard Games API lieferte ungültiges JSON.", {
        status: response.status,
        code: "invalid_json_body",
        cause
      });
    }
    if (!isPlainObject(payload)) {
      throw new GamesServiceError("Dashboard Games API lieferte kein JSON-Objekt.", {
        status: response.status,
        code: "invalid_json_shape",
        payload
      });
    }
    if (!response.ok) {
      const normalized = errorFromPayload(payload, response.status);
      throw new GamesServiceError(normalized.message, {
        status: response.status,
        code: normalized.code,
        payload
      });
    }
    return payload;
  }
}

export function normalizeGamesV1BaseUrl(value) {
  if (typeof value !== "string" || value.length > 2048) throw new TypeError("baseUrl ist ungültig.");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("baseUrl ist keine URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new TypeError("baseUrl muss eine HTTPS-URL ohne Credentials, Query oder Fragment sein.");
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (path !== GAMES_V1_API_PATH) {
    throw new TypeError(`baseUrl muss bereits vollständig auf ${GAMES_V1_API_PATH} enden.`);
  }
  url.pathname = path;
  return url.toString().replace(/\/$/, "");
}

function errorFromPayload(payload, status) {
  if (isPlainObject(payload.error)) {
    return {
      code: typeof payload.error.code === "string" ? payload.error.code : `http_${status}`,
      message: typeof payload.error.message === "string" ? payload.error.message : `Dashboard Games API antwortete mit ${status}.`
    };
  }
  return {
    code: typeof payload.code === "string" ? payload.code : `http_${status}`,
    message: typeof payload.error === "string"
      ? payload.error
      : typeof payload.message === "string"
        ? payload.message
        : `Dashboard Games API antwortete mit ${status}.`
  };
}

function assertOpaqueId(value, label) {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) throw new TypeError(`${label} ist ungültig.`);
}

function assertSessionOrPlayerId(value, label) {
  if (typeof value !== "string" || !SESSION_OR_PLAYER_ID.test(value)) throw new TypeError(`${label} ist ungültig.`);
}

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${label} ist ungültig.`);
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} ist ungültig.`);
}

function assertPlainObject(value, label) {
  if (!isPlainObject(value)) throw new TypeError(`${label} muss ein JSON-Objekt sein.`);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export { GAME_API_COMPATIBILITY };
