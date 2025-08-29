import WebSocket, { WebSocketServer } from "ws";

const PORT = 3000;

const wss = new WebSocketServer({ port: PORT });

const clients = new Set();

function broadcastUserList() {
  const usernames = [...clients]
    .filter((client) => client.username)
    .map((client) => client.username);

  const message = JSON.stringify({ type: "userList", users: usernames });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
  ws.username = null;
  clients.add(ws);

  ws.on("message", (message) => {
    try {
      const msgString = message.toString();
      console.log("Received Message:", msgString);
      const data = JSON.parse(msgString);
      console.log("Parsed JSON:", data);

      if (data.type === "username") {
        if (
          typeof data.username === "string" &&
          data.username.trim().length > 0
        ) {
          ws.username = data.username;
          console.log(`Set username: ${ws.username}`);
          ws.send(
            JSON.stringify({ system: true, message: `Welcome, ${ws.username}` })
          );
          broadcastUserList();
        } else {
          ws.send(
            JSON.stringify({ system: true, message: "Invalid Username" })
          );
        }

        return;
      }

      if (data.type === "message" && ws.username) {
        const broadcastMessage = JSON.stringify({
          type: "message",
          username: ws.username,
          message: data.message,
        });

        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
      } else if (data.type === "message") {
        ws.send(
          JSON.stringify({
            system: true,
            message: "Please set a username before sending messages",
          })
        );
      }
    } catch (err) {
      console.error("Error parsing message:", err);
      ws.send(
        JSON.stringify({
          system: true,
          message: `Error parsing message: ${err.message}`,
        })
      );
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcastUserList();
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    clients.delete(ws);
    broadcastUserList();
  });
});

setInterval(() => {
  clients.forEach((client) => {
    if (!client.isAlive) {
      clients.delete(client);
      broadcastUserList();
      return client.terminate();
    }
    client.isAlive = false;
    client.ping();
  });
}, 30000);

console.log(`WebSocket server running on ws://localhost:${PORT}`);
