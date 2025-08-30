// client.js
// A robust WebSocket client for a real-time chat application, handling user input,
// WebSocket communication, and reconnection logic with graceful error handling
// and a console-based interface.

// Import WebSocket library for establishing and managing WebSocket connections.
import WebSocket from "ws";
// Import readline for handling console input/output in an interactive chat interface.
import readline from "readline";

// Define the port constant for the WebSocket server connection to ensure consistency.
const PORT = 3000;

// Initialize the WebSocket client to connect to the server at the specified port.
let ws = new WebSocket(`ws://localhost:${PORT}`);

// Create a readline interface for interactive console input/output with a custom prompt.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ", // Custom prompt for user input clarity
});

// Global variables to track username and exit state
let username = ""; // Store the user's username after validation
let isExiting = false; // Flag to differentiate intentional exits from unexpected disconnections

/**
 * Sets up WebSocket event handlers for connection, messages, closure, and errors.
 * Ensures reliable communication with the server and updates the console interface.
 */
function setupWebSocket() {
  // Handle successful connection to the server
  ws.on("open", () => {
    if (username) {
      // Send username to server upon connection
      const usernameMessage = JSON.stringify({ type: "username", username });
      console.log("Sending:", usernameMessage); // Log for debugging
      ws.send(usernameMessage);
      console.log(`Connected as ${username}`); // Confirm connection to user
      rl.prompt(); // Show prompt for user input
    }
  });

  // Handle incoming messages from the server
  ws.on("message", (message) => {
    try {
      // Parse incoming message as JSON
      const data = JSON.parse(message.toString());
      // Display system messages (e.g., welcome, errors) in yellow
      if (data.system) {
        console.log(`\x1b[33m[SYSTEM] ${data.message}\x1b[0m`);
      }
      // Display chat messages with username in green
      else if (data.type === "message") {
        console.log(`\x1b[32m[${data.username}] ${data.message}\x1b[0m`);
      }
      // Display user list updates in cyan
      else if (data.type === "userList") {
        console.log(`\x1b[36m[USERS] ${data.users.join(", ")}\x1b[0m`);
      }
      rl.prompt(); // Maintain prompt after displaying messages
    } catch (err) {
      // Handle invalid messages gracefully
      console.log("Received invalid message:", message.toString());
      rl.prompt();
    }
  });

  // Handle WebSocket connection closure
  ws.on("close", () => {
    console.log("Disconnected from server.");
    if (!isExiting) {
      // Attempt reconnection for unexpected disconnections
      console.log("Attempting to reconnect in 5 seconds...");
      setTimeout(setupNewConnection, 5000); // Delay to avoid rapid reconnection loops
    } else {
      // Graceful exit for intentional closures
      console.log("Exiting...");
      process.stdout.write("", () => {
        rl.close(); // Close readline interface cleanly
      });
    }
  });

  // Handle WebSocket errors (e.g., connection failures)
  ws.on("error", (err) => {
    console.error("Connection error:", err.message);
    if (!isExiting) {
      // Attempt reconnection for recoverable errors
      console.log("Attempting to reconnect in 5 seconds...");
      setTimeout(setupNewConnection, 5000);
    }
  });
}

/**
 * Creates a new WebSocket connection and sets up event handlers.
 * Only called when not intentionally exiting to maintain connectivity.
 */
function setupNewConnection() {
  if (!isExiting) {
    ws = new WebSocket(`ws://localhost:${PORT}`);
    setupWebSocket(); // Reattach event handlers to the new connection
  }
}

/**
 * Prompts the user for a username and validates it before sending to the server.
 * Recursively prompts if the username is invalid to ensure a valid username.
 */
function promptUsername() {
  rl.question("Enter Username: ", (name) => {
    username = name.trim();
    // Validate username to prevent empty or invalid input
    if (username.length === 0) {
      console.log("Username cannot be empty. Please try again.");
      promptUsername();
      return;
    }
    // Send username if connected, otherwise wait for connection
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

// Handle Ctrl+C (SIGINT) to gracefully close the connection and exit
rl.on("SIGINT", () => {
  if (isExiting) return; // Prevent multiple SIGINT triggers
  isExiting = true;
  // Ensure console output is flushed before proceeding
  process.stdout.write(
    "\nReceived Ctrl+C. Closing WebSocket connection...\n",
    () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close(); // Trigger WebSocket close event
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

// Handle readline interface closure to ensure clean process exit
rl.on("close", () => {
  process.stdout.write("", () => {
    process.exit(0); // Exit process cleanly
  });
});

// Disable default process SIGINT to let readline handle it
process.on("SIGINT", () => {
  // Empty handler to prevent default termination; rl.on("SIGINT") takes precedence
});

// Initialize WebSocket handlers and prompt for username
setupWebSocket();
promptUsername();

// Handle user input from the console
rl.on("line", (line) => {
  // Support custom exit command for graceful shutdown
  if (line.trim().toLowerCase() === "exit") {
    isExiting = true;
    console.log("Exiting...");
    ws.close();
    return;
  }
  // Ignore empty input to maintain clean UI
  if (line.trim() === "") {
    rl.prompt();
    return;
  }
  // Send messages only if connected to the server
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "message", message: line.trim() }));
  } else {
    console.log("Not connected to server. Please wait or try reconnecting.");
  }
  rl.prompt();
});
