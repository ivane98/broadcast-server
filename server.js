// server.js
// A robust WebSocket server for a real-time chat application, handling client connections,
// username assignments, message broadcasting, and user list updates with error handling
// and connection management for reliability.

// Import the WebSocket library to create and manage WebSocket connections.
import WebSocket, { WebSocketServer } from "ws";

// Define the port constant for the WebSocket server to ensure consistency and easy configuration.
const PORT = 3000;

// Initialize the WebSocket server to listen on the specified port.
const wss = new WebSocketServer({ port: PORT });

// Use a Set to store client connections for efficient addition, removal, and iteration.
// A Set ensures no duplicate clients and simplifies connection management.
const clients = new Set();

/**
 * Broadcasts the current list of connected users to all clients.
 * Filters clients with valid usernames to maintain an accurate user list.
 * Sends the list as a JSON message to all open connections, ensuring reliable communication.
 */
function broadcastUserList() {
  const usernames = [...clients]
    .filter((client) => client.username) // Only include clients with assigned usernames
    .map((client) => client.username); // Extract usernames for broadcasting

  const message = JSON.stringify({ type: "userList", users: usernames });

  clients.forEach((client) => {
    // Check readyState to avoid sending to closed or closing connections
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Handle new client connections to the WebSocket server.
wss.on("connection", (ws) => {
  // Initialize client state for heartbeat tracking and username assignment
  ws.isAlive = true; // Mark client as alive for connection health checks
  ws.username = null; // Initialize username as null until set by client
  clients.add(ws); // Add client to the set of active connections

  // Handle pong responses to confirm client connectivity during heartbeat checks
  ws.on("pong", () => (ws.isAlive = true));

  // Handle incoming messages from clients
  ws.on("message", (message) => {
    try {
      // Convert incoming Buffer to string for JSON parsing
      const msgString = message.toString();
      console.log("Received Message:", msgString); // Log for debugging and monitoring
      const data = JSON.parse(msgString); // Parse message into JSON object
      console.log("Parsed JSON:", data); // Log parsed data for debugging

      // Handle username assignment
      if (data.type === "username") {
        // Validate username to ensure it’s a non-empty string
        if (
          typeof data.username === "string" &&
          data.username.trim().length > 0
        ) {
          ws.username = data.username.trim(); // Assign sanitized username
          console.log(`Set username: ${ws.username}`); // Log for auditing
          // Send welcome message to the client
          ws.send(
            JSON.stringify({ system: true, message: `Welcome, ${ws.username}` })
          );
          broadcastUserList(); // Update all clients with the new user list
        } else {
          // Inform client of invalid username
          ws.send(
            JSON.stringify({ system: true, message: "Invalid Username" })
          );
        }
        return; // Exit early to avoid processing invalid messages
      }

      // Handle chat messages from clients with assigned usernames
      if (data.type === "message" && ws.username) {
        const broadcastMessage = JSON.stringify({
          type: "message",
          username: ws.username,
          message: data.message,
        });

        // Broadcast the message to all connected clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
      } else if (data.type === "message") {
        // Inform client if they attempt to send a message without a username
        ws.send(
          JSON.stringify({
            system: true,
            message: "Please set a username before sending messages",
          })
        );
      }
    } catch (err) {
      // Handle JSON parsing errors or other message-related issues
      console.error("Error parsing message:", err);
      ws.send(
        JSON.stringify({
          system: true,
          message: `Error parsing message: ${err.message}`,
        })
      );
    }
  });

  // Handle client disconnection
  ws.on("close", () => {
    clients.delete(ws); // Remove client from active connections
    broadcastUserList(); // Update user list for remaining clients
  });

  // Handle WebSocket errors (e.g., network issues)
  ws.on("error", (err) => {
    console.error("WebSocket error:", err); // Log for debugging
    clients.delete(ws); // Remove faulty client
    broadcastUserList(); // Update user list
  });
});

// Implement a heartbeat mechanism to detect and terminate stale connections
setInterval(() => {
  clients.forEach((client) => {
    if (!client.isAlive) {
      // Terminate unresponsive clients
      clients.delete(client);
      broadcastUserList();
      return client.terminate();
    }
    client.isAlive = false; // Reset alive status for next check
    client.ping(); // Send ping to check client responsiveness
  });
}, 30000); // Check every 30 seconds for optimal balance between responsiveness and overhead

// Confirm server startup
console.log(`WebSocket server running on ws://localhost:${PORT}`);
