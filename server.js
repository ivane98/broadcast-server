import WebSocket, { WebSocketServer } from "ws";

const PORT = 3000;
const HEARTBEAT_INTERVAL = 30_000; // 30s

const wss = new WebSocketServer({ port: PORT });

const clients = new Set();

/**
 * Broadcasts the list of connected usernames to all clients.
 */

function broadcastUserList() {
  const usernames = [...clients]
    .filter((client) => client.username)
    .map((client) => client.username);
  const message = JSON.stringify({ type: "userList", users: usernames });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Handles incoming messages from a client.
 */

function handleMessage(ws, rawMessage) {
  try {
    const msgString = rawMessage.toString();
    console.log("📩 Received:", msgString);

    const data = JSON.parse(msgString);
    console.log("🔎 Parsed:", data);

    // Username setup
    if (data.type === "username") {
      if (typeof data.username === "string" && data.username.trim()) {
        ws.username = data.username.trim();
        console.log(`✅ Username set: ${ws.username}`);

        ws.send(
          JSON.stringify({ system: true, message: `Welcome, ${ws.username}` })
        );
        broadcastUserList();
      } else {
        ws.send(JSON.stringify({ system: true, message: "Invalid username" }));
      }
      return;
    }

    // Chat messages
    if (data.type === "message") {
      if (!ws.username) {
        ws.send(
          JSON.stringify({
            system: true,
            message: "Please set a username before sending messages",
          })
        );
        return;
      }

      const broadcastMessage = JSON.stringify({
        type: "message",
        username: ws.username,
        message: data.message,
      });

      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(broadcastMessage);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error parsing message:", err);
    ws.send(
      JSON.stringify({
        system: true,
        message: `Error parsing message: ${err.message}`,
      })
    );
  }
}

/**
 * Sets up a new WebSocket connection.
 */

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.username = null;
  clients.add(ws);

  console.log("👤 New client connected");

  ws.on("pong", () => (ws.isAlive = true));

  ws.on("message", (msg) => handleMessage(ws, msg));

  ws.on("close", () => {
    clients.delete(ws);
    broadcastUserList();
    console.log("👋 Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    clients.delete(ws);
    broadcastUserList();
  });
});

/**
 * Heartbeat check to terminate dead connections.
 */

setInterval(() => {
  for (const client of clients) {
    if (!client.isAlive) {
      clients.delete(client);
      broadcastUserList();
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, HEARTBEAT_INTERVAL);

console.log(`WebSocket server running on ws://localhost:${PORT}`);
