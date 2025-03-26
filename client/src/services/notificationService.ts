// client/src/services/notificationService.ts
import { NotificationPreference } from "@shared/schema";
// Fix the import path to point to where websocket.ts actually is
import websocketService from "@/lib/websocket"; // Adjusted to the correct path

// Module state
let preferences = null;

/**
 * Store notification preferences for use in notifications
 */
export function setNotificationPreferences(prefs) {
  console.log('Setting notification preferences:', prefs);
  preferences = prefs;
}

/**
 * Get current notification preferences
 */
export function getNotificationPreferences() {
  return preferences;
}

/**
 * Initialize notification listeners on the websocket
 */
export function initializeNotifications() {
  console.log('Initializing notifications service');

  // Add a message handler to the websocket service
  websocketService.addMessageHandler((data) => {
    handleWebsocketMessage(data);
  });

  // Ensure WebSocket connection
  websocketService.ensureConnection()
    .then(() => console.log('WebSocket connection ready for notifications'))
    .catch(err => {
      // Just log the error with less dramatic messaging
      console.log('Waiting for WebSocket connection to establish...', err.message);
      // The websocket service will automatically try to reconnect
    });
    
  // Periodically try to ensure connection
  setInterval(() => {
    websocketService.ensureConnection().catch(() => {
      // Silent catch, just to prevent unhandled promise rejection
    });
  }, 30000); // Try every 30 seconds
}

/**
 * Handle incoming websocket messages and show notifications based on preferences
 */
function handleWebsocketMessage(data) {
  try {
    console.log('Processing websocket message for notifications:', data);

    // Process different notification types based on preferences
    switch (data.type) {
      case 'NEW_REQUEST':
        if (preferences?.browserNotificationsEnabled && preferences?.newRequestBrowserEnabled) {
          showBrowserNotification('Cerere nouă', `Aveți o cerere nouă: ${data.payload.title}`);
        }
        break;
      case 'NEW_OFFER':
        if (preferences?.browserNotificationsEnabled && preferences?.acceptedOfferBrowserEnabled) {
          const actionType = data.payload.status === 'Accepted' ? 'acceptată' : 'primită';
          showBrowserNotification('Ofertă nouă', `Oferta dvs. a fost ${actionType}`);
        }
        break;
      case 'NEW_MESSAGE':
        if (preferences?.browserNotificationsEnabled && preferences?.newMessageBrowserEnabled) {
          showBrowserNotification('Mesaj nou', `Aveți un mesaj nou de la ${data.payload.senderName || 'un utilizator'}`);
        }
        break;
      case 'NEW_REVIEW':
        if (preferences?.browserNotificationsEnabled && preferences?.newReviewBrowserEnabled) {
          showBrowserNotification('Recenzie nouă', 'Ați primit o recenzie nouă');
        }
        break;
    }
  } catch (error) {
    console.error('Error processing notification from WebSocket message', error);
  }
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(title, body) {
  // Check if notifications are available and permitted
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      console.log('Showing browser notification:', { title, body });
      // Create and display the notification
      const notification = new Notification(title, {
        body,
        icon: '/logo.png',
      });

      // Optional: add a click event listener
      notification.onclick = function() {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  } else {
    console.log('Browser notifications not available or permission not granted');
  }
}

/**
 * Request notification permission from the browser
 */
export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') {
    console.log('Notification API not available in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('Notification permission already granted');
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      console.log('Requesting notification permission');
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  console.log('Notification permission was previously denied');
  return false;
}