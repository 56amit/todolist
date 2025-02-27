// Main application JavaScript

// Register the service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    });
  
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.message === 'notes-synced') {
        showToast(`${event.data.count} notes synced with server.`);
        loadNotes(); // Refresh the notes display
      }
    });
  }
  
  // Check online/offline status and update UI
  function updateOnlineStatus() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      if (navigator.onLine) {
        statusElement.textContent = 'Online';
        statusElement.classList.remove('offline');
        statusElement.classList.add('online');
        
        // Trigger background sync if we just came back online
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready
            .then(registration => {
              registration.sync.register('sync-notes')
                .then(() => console.log('Background sync registered'))
                .catch(err => console.log('Background sync registration failed:', err));
            });
        }
      } else {
        statusElement.textContent = 'Offline';
        statusElement.classList.remove('online');
        statusElement.classList.add('offline');
      }
    }
  }
  
  // Initialize connection status
  window.addEventListener('load', updateOnlineStatus);
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Handle form submission for notes
  document.addEventListener('DOMContentLoaded', () => {
    const noteForm = document.getElementById('note-form');
    if (noteForm) {
      noteForm.addEventListener('submit', saveNote);
    }
    
    const clearDataBtn = document.getElementById('clear-data');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', clearAllData);
    }
    
    // Initial load of notes
    loadNotes();
  });
  
  // Function to save a new note
  function saveNote(event) {
    event.preventDefault();
    
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    
    const note = {
      id: Date.now(), // Simple unique ID
      title: titleInput.value.trim(),
      content: contentInput.value.trim(),
      timestamp: new Date().toISOString(),
      synced: navigator.onLine ? 1 : 0 // 1 = true, 0 = false for IndexedDB compatibility
    };
    
    // First save to IndexedDB
    saveNoteToDb(note)
      .then(() => {
        // Clear the form
        titleInput.value = '';
        contentInput.value = '';
        
        // Refresh notes display
        loadNotes();
        
        // Show confirmation
        showToast('Note saved successfully!');
        
        // Try to sync if online
        if (navigator.onLine && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then(registration => {
              registration.sync.register('sync-notes')
                .then(() => console.log('Background sync registered'))
                .catch(err => console.log('Failed to register background sync:', err));
            });
        }
      })
      .catch(error => {
        console.error('Error saving note:', error);
        showToast('Failed to save note. Please try again.');
      });
  }
  
  // Toast notification function
  function showToast(message) {
    // Check if a toast container already exists
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
      // Create a new toast container if it doesn't exist
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create a new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Add the toast to the container
    toastContainer.appendChild(toast);
    
    // Remove the toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
        // Remove the container if empty
        if (toastContainer.children.length === 0) {
          toastContainer.remove();
        }
      }, 300);
    }, 3000);
  }
  
  // Function to clear all data (for testing purposes)
  function clearAllData(event) {
    event.preventDefault();
    
    if (confirm('Are you sure you want to clear all notes? This cannot be undone.')) {
      // Clear IndexedDB
      clearNotesDb()
        .then(() => {
          // Clear localStorage if used
          localStorage.removeItem('offlineNotes');
          
          // Clear any UI elements
          const notesContainer = document.getElementById('notes-container');
          if (notesContainer) {
            notesContainer.innerHTML = '<h2>Notes</h2><div class="loader" id="notes-loader"></div>';
          }
          
          showToast('All data cleared successfully.');
        })
        .catch(error => {
          console.error('Failed to clear data:', error);
          showToast('Failed to clear data. Please try again.');
        });
    }
  }
  
  // Function to load offline notes from localStorage if any exist
  function checkForOfflineNotes() {
    const offlineNotes = localStorage.getItem('offlineNotes');
    
    if (offlineNotes) {
      try {
        const notes = JSON.parse(offlineNotes);
        
        if (notes.length > 0) {
          console.log(`Found ${notes.length} notes created while offline`);
          
          // Save them to IndexedDB
          const savePromises = notes.map(note => saveNoteToDb(note));
          
          Promise.all(savePromises)
            .then(() => {
              console.log('Successfully imported offline notes');
              localStorage.removeItem('offlineNotes');
              loadNotes();
              
              // Try to sync if online
              if (navigator.onLine && 'serviceWorker' in navigator) {
                navigator.serviceWorker.ready
                  .then(registration => {
                    registration.sync.register('sync-notes');
                  });
              }
            })
            .catch(error => {
              console.error('Failed to import offline notes:', error);
            });
        }
      } catch (error) {
        console.error('Error parsing offline notes:', error);
      }
    }
  }
  
  // Check for offline notes when app loads
  window.addEventListener('load', checkForOfflineNotes);