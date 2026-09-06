import crypto from "node:crypto";

const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function reject(socket, status = "401 Unauthorized") {
  socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

function textFrame(value) {
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  if (payload.length >= 126) throw new Error("Referenzframe ist zu groß.");
  return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
}

export function handleWebSocketUpgrade(request, socket, head, { config, sessions }) {
  const url = new URL(request.url || "/", config.publicBaseUrl);
  if (url.pathname !== "/ws" || url.search || request.headers.upgrade?.toLowerCase() !== "websocket") {
    reject(socket, "404 Not Found");
    return;
  }
  if (request.headers.origin !== new URL(config.publicBaseUrl).origin) {
    reject(socket, "403 Forbidden");
    return;
  }
  const key = request.headers["sec-websocket-key"];
  const protocols = String(request.headers["sec-websocket-protocol"] || "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  if (request.headers["sec-websocket-version"] !== "13" || typeof key !== "string"
    || protocols[0] !== "dashboard-games" || protocols.length !== 2) {
    reject(socket);
    return;
  }
  const session = sessions.consumeWebSocketToken(protocols[1]);
  if (!session) {
    reject(socket);
    return;
  }
  const accept = crypto.createHash("sha1").update(`${key}${WEBSOCKET_GUID}`).digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "Sec-WebSocket-Protocol: dashboard-games",
    "\r\n"
  ].join("\r\n"));
  if (head.length) socket.unshift(head);
  socket.write(textFrame({
    type: "ready",
    identity: session.kind,
    lobby: session.lobby
  }));

  // TODO(gameplay): Frames hier an die autoritative Spiellogik anbinden.
  socket.on("data", () => socket.end());
  socket.setTimeout(65_000, () => socket.end());
}
