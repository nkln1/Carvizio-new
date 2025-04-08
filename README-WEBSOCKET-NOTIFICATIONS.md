# WebSocket Notification System Documentation

This document describes the WebSocket notification system implementation, which enables real-time notifications in the Auto Service App.

## System Overview

The WebSocket notification system consists of:

1. A WebSocket server running alongside the Express server
2. A client-side WebSocket service that connects and handles messages
3. API endpoints for sending notifications
4. Browser notification handlers

## WebSocket Server Setup

The WebSocket server is initialized in `server/index.ts` using the `ws` library. It's configured to share the same HTTP server instance as the Express app.

## Client-Side WebSocket Integration

The client uses a WebSocket service defined in `client/src/lib/websocket.ts` to:

1. Connect to the WebSocket server
2. Automatically reconnect when disconnected
3. Handle message events
4. Include a polling fallback mechanism when WebSockets are unavailable

## API Endpoints for Notifications

The system provides two main endpoints for sending notifications:

### 1. `/api/notifications/broadcast` (Authenticated)

Sends a notification to all connected WebSocket clients. Authentication required.

**Request:**
```json
{
  "type": "NEW_MESSAGE",
  "title": "New Message",
  "content": "You have received a new message from John Doe",
  "metadata": {
    "messageId": "123456",
    "senderId": "789",
    "requestId": "456"
  }
}
```

### 2. `/api/test/broadcast` (Open for Testing)

A test endpoint to verify WebSocket notification functionality without authentication.

## Notification Types

The system supports various notification types:

1. `NEW_REQUEST` - A new service request was created
2. `NEW_OFFER` - A new offer was submitted
3. `OFFER_ACCEPTED` - An offer was accepted by a client
4. `NEW_MESSAGE` - A new message was received
5. `NEW_REVIEW` - A new review was posted
6. `SYSTEM_NOTIFICATION` - General system notifications

## Testing WebSocket Functionality

The system includes a test script (`test-websocket.js`) that can verify WebSocket functionality.

```bash
node test-websocket.js
```

## Fallback Mechanism

When WebSocket connections fail, the client falls back to polling the server at regular intervals for updates. This ensures notifications can still be delivered even when WebSockets are unavailable or blocked.

## Integration with Other Notification Channels

The WebSocket system is designed to work alongside other notification channels:

1. **Email Notifications** - For important events when users are offline
2. **Browser Notifications** - For immediate visibility when the app is in the background
3. **In-App Notifications** - For a notification center within the app
