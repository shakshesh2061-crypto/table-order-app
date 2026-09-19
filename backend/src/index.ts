import http from "node:http";
import { createApp } from "./app.js";
import { attachWsServer } from "./realtime/wsServer.js";
import { env } from "./config/env.js";

const app = createApp();
const server = http.createServer(app);
attachWsServer(server);

server.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
  console.log(`WebSocket endpoint at ws://localhost:${env.port}/ws`);
});
