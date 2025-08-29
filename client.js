import WebSocket from "ws";
import readline from "readline";

const PORT = 3000;
let ws = new WebSocket(`ws://localhost:${PORT}`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let username = "";
let isExiting = false;

// Set up WebSocket handlers
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
        console.log(`\x1b[33m[SYSTEM] ${data.message}\x1b[0m`); // Yellow
      } else if (data.type === "message") {
        console.log(`\x1b[32m[${data.username}] ${data.message}\x1b[0m`); // Green
      } else if (data.type === "userList") {
        console.log(`\x1b[36m[USERS] ${data.users.join(", ")}\x1b[0m`); // Cyan
      }
      rl.prompt();
    } catch (err) {
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
      console.log("Exiting...");
      process.stdout.write("", () => {
        rl.close();
      });
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

function setupNewConnection() {
  if (!isExiting) {
    ws = new WebSocket(`ws://localhost:${PORT}`);
    setupWebSocket();
  }
}

// Prompt for username and validate
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

// Handle readline SIGINT explicitly
rl.on("SIGINT", () => {
  if (isExiting) return;
  isExiting = true;
  process.stdout.write(
    "\nReceived Ctrl+C. Closing WebSocket connection...\n",
    () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
        // Timeout to ensure exit if close event is delayed
        setTimeout(() => {
          if (isExiting) {
            console.log("Disconnected from server.");
            console.log("Exiting...");
            process.stdout.write("", () => {
              rl.close();
            });
          }
        }, 1000);
      } else {
        console.log("Disconnected from server.");
        console.log("Exiting...");
        process.stdout.write("", () => {
          rl.close();
        });
      }
    }
  );
});

// Handle readline close
rl.on("close", () => {
  process.stdout.write("", () => {
    process.exit(0);
  });
});

// Prevent process SIGINT from terminating immediately
process.on("SIGINT", () => {
  // Do nothing; let rl.on("SIGINT") handle it
});

// Set up WebSocket and prompt for username
setupWebSocket();
promptUsername();

rl.on("line", (line) => {
  if (line.trim().toLowerCase() === "exit") {
    isExiting = true;
    console.log("Exiting...");
    ws.close();
    return;
  }
  if (line.trim() === "") {
    rl.prompt();
    return;
  }
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "message", message: line.trim() }));
  } else {
    console.log("Not connected to server. Please wait or try reconnecting.");
  }
  rl.prompt();
});
