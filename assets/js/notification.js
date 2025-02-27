// Push Notifications functionality

// Storage key for notification preferences
const NOTIFICATION_PREF_KEY = 'notification_preferences';

// Default notification preferences
const DEFAULT_PREFERENCES = {
  enabled: false,
  newContent: true,
  syncComplete: true,
  updates: true
};

// Initialize notification functionality
document.addEventListener('DOMContentLoaded', () => {
  initNotifications();
});

// Initialize notification permissions and UI
function initNotifications() {
  const permissionSection = document.getElementById('notification-permission');
  const enableButton = document.getElementById('enable-notifications');
  
  // Hide notification section if Push API is not supported
  if (!('PushManager' in window)) {
    if (permissionSection) {
      permissionSection.style.display = 'none';
    }
    console.log('Push notifications not supported');
    return;
  }
  
  // Check if we already have permission
  if (Notification.permission === 'granted') {
    // User has already granted permission
    if (permissionSection) {
      permissionSection.style.display = 'none';
    }
    
    // Subscribe to push notifications if not already subscribed
    subscribeToPushNotifications();
  } else if (Notification.permission === 'denied') {
    // User has denied permission - update UI
    if (permissionSection) {
      const heading = permissionSection.querySelector('h2');
      const description = permissionSection.querySelector('p');
      
      if (heading) heading.textContent = 'Notifications Blocked';
      if (description) description.textContent = 'You have blocked notifications. Please update your browser settings to enable them.';
      if (enableButton) enableButton.textContent = 'Update Browser Settings';
      
      enableButton.addEventListener('click', () => {
        alert('Please update your notification settings in your browser preferences to allow notifications from this site.');
      });
    }
  } else {
    // Permission not determined yet - show request button
    if (enableButton) {
      enableButton.addEventListener('click', requestNotificationPermission);
    }
  }
}

// Request notification permission
function requestNotificationPermission() {
  Notification.requestPermission()
    .then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
        
        // Hide the permission section
        const permissionSection = document.getElementById('notification-permission');
        if (permissionSection) {
          permissionSection.style.display = 'none';
        }
        
        // Subscribe to push notifications
        subscribeToPushNotifications();
        
        // Show toast notification
        showToast('Notifications enabled!');
        
        // Save preference
        const prefs = getNotificationPreferences();
        prefs.enabled = true;
        saveNotificationPreferences(prefs);
        
        // Send a test notification after a short delay
        setTimeout(() => {
          const testNotification = new Notification('Notifications Enabled', {
            body: 'You will now receive notifications from Simple PWA.',
            icon: '/assets/images/icons/icon-192x192.png'
          });
          
          testNotification.onclick = () => {
            window.focus();
            testNotification.close();
          };
        }, 2000);
      } else {
        console.log('Notification permission denied');
        
        // Update UI for denied state
        const permissionSection = document.getElementById('notification-permission');
        const enableButton = document.getElementById('enable-notifications');
        
        if (permissionSection) {
          const heading = permissionSection.querySelector('h2');
          const description = permissionSection.querySelector('p');
          
          if (heading) heading.textContent = 'Notifications Blocked';
          if (description) description.textContent = 'You have blocked notifications. Please update your browser settings to enable them.';
          if (enableButton) enableButton.textContent = 'Update Browser Settings';
          
          enableButton.addEventListener('click', () => {
            alert('Please update your notification settings in your browser preferences to allow notifications from this site.');
          });
        }
      }
    });
}

// Subscribe to push notifications
function subscribeToPushNotifications() {
  // Check if service worker is ready
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return;
  }
  
  navigator.serviceWorker.ready
    .then(registration => {
      // Check if already subscribed
      return registration.pushManager.getSubscription()
        .then(subscription => {
          if (subscription) {
            return subscription; // Already subscribed
          }
          
          // Get the server's public key
          // In a real app, you would fetch this from your server
          const publicKey = urlBase64ToUint8Array(
            'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
          );
          
          // Subscribe
          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey
          });
        });
    })
    .then(subscription => {
      // Send subscription to server
      // In a real app, you would send this to your backend
      console.log('Push notification subscription:', subscription);
      
      // Save locally for simulation purposes
      localStorage.setItem('push_subscription', JSON.stringify(subscription));
      
      // Save preference
      const prefs = getNotificationPreferences();
      prefs.enabled = true;
      saveNotificationPreferences(prefs);
      
      return subscription;
    })
    .catch(error => {
      console.error('Failed to subscribe to push notifications:', error);
    });
}

// Unsubscribe from push notifications
function unsubscribeFromPushNotifications() {
  navigator.serviceWorker.ready
    .then(registration => {
      return registration.pushManager.getSubscription();
    })
    .then(subscription => {
      if (!subscription) {
        return;
      }
      
      // Unsubscribe
      return subscription.unsubscribe();
    })
    .then(() => {
      console.log('Unsubscribed from push notifications');
      
      // Remove from localStorage
      localStorage.removeItem('push_subscription');
      
      // Save preference
      const prefs = getNotificationPreferences();
      prefs.enabled = false;
      saveNotificationPreferences(prefs);
    })
    .catch(error => {
      console.error('Error unsubscribing from push notifications:', error);
    });
}

// Get notification preferences
function getNotificationPreferences() {
  const storedPrefs = localStorage.getItem(NOTIFICATION_PREF_KEY);
  if (storedPrefs) {
    try {
      return JSON.parse(storedPrefs);
    } catch (e) {
      console.error('Error parsing notification preferences:', e);
      return { ...DEFAULT_PREFERENCES };
    }
  }
  return { ...DEFAULT_PREFERENCES };
}

// Save notification preferences
function saveNotificationPreferences(preferences) {
  localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(preferences));
}

// Helper function to convert base64 to Uint8Array for VAPID keys
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Send a notification (simulation function)
function simulateNotification(title, options = {}) {
  const prefs = getNotificationPreferences();
  
  if (!prefs.enabled) {
    console.log('Notifications disabled by user preferences');
    return;
  }
  
  // Check permission
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: options.body || 'New notification from Simple PWA',
      icon: options.icon || '/assets/images/icons/icon-192x192.png',
      tag: options.tag || 'simple-pwa-notification',
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      if (options.url) {
        window.location.href = options.url;
      }
    };
  } else {
    console.log('Notification permission not granted');
  }
}

// Simulate server-side push (for testing)
function simulatePushFromServer() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.active.postMessage({
          action: 'SIMULATE_PUSH',
          title: 'New Update',
          body: 'This is a simulated push notification from the "server".',
          url: '/'
        });
      });
  }
}