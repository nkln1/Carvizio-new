# Sound Files

This directory contains sound files used for the application notifications.

## List of sounds

- `notification.mp3` - Standard notification sound
- `message.mp3` - Sound for new messages
- `request.mp3` - Sound for new requests
- `offer.mp3` - Sound for new offers

## About these sound files

These sound files are public domain notification sounds that are readily recognizable as system notifications but not disruptive or annoying.

## Usage

Import these sounds in your application as needed, for example:

```javascript
const notificationSound = new Audio('/sounds/notification.mp3');
notificationSound.play();
```

When using with Service Worker notifications, specify the sound URL:

```javascript
showNotificationViaSW('Title', {
  body: 'Message body',
  playSound: true,
  soundUrl: '/sounds/message.mp3'
});
```