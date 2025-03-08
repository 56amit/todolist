          RUNNING CMD
first step --->  npm update -g http-server
second ------>   http-server -p 8080


📝✅ To-Do List PWA (React.js + Service Workers)
This is a Progressive Web App (PWA) built using React.js, designed to work both online and offline.
It features service workers for caching, push notifications, background sync,
and a web app manifest, making it installable on mobile devices.

🔗 Live Demo:
  https://todolist-git-main-56amits-projects.vercel.app

🛠 Features
🌐 Service Worker Implementation
✅ Caches static assets (HTML, CSS, JavaScript, images) for offline access
✅ Serves cached content when the user is offline
✅ Updates cache automatically when assets change

📶 Offline Functionality
✅ Custom offline page displayed when no internet connection
✅ Tasks added offline are stored locally and synced with the server when back online

🔔 Push Notifications
✅ Push notifications alert users of new tasks or updates
✅ Users can customize notification preferences

🎨 Additional Features
✅ Responsive Design: Works on all screen sizes (mobile, tablet, desktop)
✅ Background Sync: Syncs tasks automatically when reconnected to the internet
✅ Lazy Loading: Improves performance by loading images only when needed
✅ Web App Manifest: Enables the app to be installed on mobile devices
✅ Custom Icons & Splash Screen: Enhances the app’s look when added to the home screen

🚀 Tech Stack
Frontend: React.js 
Service Workers: Workbox
Database: - IndexedDB, or  API
