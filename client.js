import WebSocket from "ws";
import readline from "readline";

const PORT = 3000;

let ws = new WebSocket(`ws://localhost:${PORT}`);
let username = "";
let isExiting = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

/**
 * Sets up the WebSocket event handlers for a connection.
 */

function setupWebSocket() {
  ws.on("open", () => {
    if (username) {
      const usernameMessage = JSON.stringify({ type: "username", username });
      console.log("Sending:", usernameMessage);
      ws.send(usernameMessage);
      console.log(`Connected as ${username}`);
      rl.prompt();
    }
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.system) {
        console.log(`\x1b[33m[SYSTEM] ${data.message}\x1b[0m`);
      } else if (data.type === "message") {
        console.log(`\x1b[32m[${data.username}] ${data.message}\x1b[0m`);
      } else if (data.type === "userList") {
        console.log(`\x1b[36m[USERS] ${data.users.join(", ")}\x1b[0m`);
      }

      rl.prompt();
    } catch {
      console.log("Received invalid message:", message.toString());
      rl.prompt();
    }
  });

  ws.on("close", () => {
    console.log("Disconnected from server.");
    if (!isExiting) {
      console.log("Attempting to reconnect in 5 seconds...");
      setTimeout(setupNewConnection, 5000);
    } else {
      rl.close();
    }
  });

  ws.on("error", (err) => {
    console.error("Connection error:", err.message);
    if (!isExiting) {
      console.log("Attempting to reconnect in 5 seconds...");
      setTimeout(setupNewConnection, 5000);
    }
  });
}

/**
 * Reconnect logic for WebSocket.
 */

function setupNewConnection() {
  if (!isExiting) {
    ws = new WebSocket(`ws://localhost:${PORT}`);
    setupWebSocket();
  }
}

/**
 * Prompt user for a username.
 */

function promptUsername() {
  rl.question("Enter Username: ", (name) => {
    username = name.trim();
    if (username.length === 0) {
      console.log("Username cannot be empty. Please try again.");
      promptUsername();
      return;
    }

    if (ws.readyState === WebSocket.OPEN) {
      const usernameMessage = JSON.stringify({ type: "username", username });
      console.log("Sending:", usernameMessage);
      ws.send(usernameMessage);
      console.log(`Connected as ${username}`);
      rl.prompt();
    } else {
      console.log("Waiting for connection...");
    }
  });
}

/**
 * Graceful exit handling.
 */

rl.on("SIGINT", () => {
  if (isExiting) return;
  isExiting = true;

  process.stdout.write("\nClosing WebSocket connection...\n", () => {
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close();
      setTimeout(() => rl.close(), 1000);
    } else {
      rl.close();
    }
  });
});

rl.on("close", () => process.exit(0));

process.on("SIGINT", () => {}); //prevent default termination

setupWebSocket();
promptUsername();

/**
 * Handle user input from CLI.
 */

rl.on("line", (line) => {
  const message = line.trim();

  if (!message) {
    rl.prompt();
    return;
  }

  if (message.toLowerCase() === "exit") {
    isExiting = true;
    console.log("Exiting...");
    ws.close();
    return;
  }

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "message", message }));
  } else {
    console.log("Not connected to server. Please wait or try reconnecting.");
  }
  rl.prompt();
});
