# Broadcast Server

A real-time chat application built with Node.js and WebSocket, showcasing expertise in real-time communication, robust error handling, and user-friendly console interfaces. Features a scalable server and a terminal-based client with automatic reconnection and graceful shutdowns.

## Features

- **Real-Time Messaging**: Enables instant message exchange between multiple clients.
- **Dynamic User Lists**: Updates and broadcasts connected users on join/disconnect.
- **Error Handling**: Gracefully handles invalid inputs and connection failures.
- **Reconnection Logic**: Clients automatically reconnect after unexpected disconnections.
- **Color-Coded UI**: Uses colored terminal output for improved readability.

## Setup

1. **Clone the Repository**:
   
   ```bash
   git clone https://github.com/ivane98/realtime-chat.git
   cd realtime-chat

2. **Install Dependencies**:
   
   ```bash
   npm install ws

##Usage

1. **Start the Server**:
   
   ```bash
   node server.js
   
Output: WebSocket server running on ws://localhost:3000

2. **Start the Client**:
   
   ```bash
   node client.js

- Enter a username (e.g., Alice).
- Send messages to chat with others.
- Type exit or press Ctrl+C to quit.

3. **Example**:
   ```bash
   Enter Username: Bob
   [SYSTEM] Welcome, Bob
   [USERS] Bob
   > Hello!
   [Bob] Hello!
