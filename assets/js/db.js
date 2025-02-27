// IndexedDB functionality for offline data storage

const DB_NAME = 'notes-store';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';

// Initialize the database
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = event => {
      console.error('IndexedDB error:', event.target.error);
      reject('Could not open database');
    };
    
    request.onsuccess = event => {
      console.log('Database opened successfully');
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object store for notes
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const notesStore = db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
        
        // Create indexes for querying
        notesStore.createIndex('timestamp', 'timestamp', { unique: false });
        notesStore.createIndex('synced', 'synced', { unique: false });
        
        console.log('Database structure created');
      }
    };
  });
}

// Save a note to IndexedDB
function saveNoteToDb(note) {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([NOTES_STORE], 'readwrite');
      const store = transaction.objectStore(NOTES_STORE);
      
      const request = store.put(note);
      
      request.onsuccess = event => {
        console.log('Note saved to IndexedDB:', note.id);
        resolve(note);
      };
      
      request.onerror = event => {
        console.error('Error saving note to IndexedDB:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    }).catch(error => {
      reject(error);
    });
  });
}

// Get all notes from IndexedDB
function getAllNotes() {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([NOTES_STORE], 'readonly');
      const store = transaction.objectStore(NOTES_STORE);
      const index = store.index('timestamp');
      
      // Get all notes sorted by timestamp (newest first)
      const request = index.openCursor(null, 'prev');
      const notes = [];
      
      request.onsuccess = event => {
        const cursor = event.target.result;
        
        if (cursor) {
          notes.push(cursor.value);
          cursor.continue();
        } else {
          // No more entries
          resolve(notes);
        }
      };
      
      request.onerror = event => {
        console.error('Error getting notes from IndexedDB:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    }).catch(error => {
      reject(error);
    });
  });
}

// Get unsynced notes from IndexedDB
function getUnsyncedNotes() {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([NOTES_STORE], 'readonly');
      const store = transaction.objectStore(NOTES_STORE);
      const index = store.index('synced');
      
      // Get notes where synced = 0 (false)
      const request = index.getAll(0);
      
      request.onsuccess = event => {
        resolve(event.target.result);
      };
      
      request.onerror = event => {
        console.error('Error getting unsynced notes:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    }).catch(error => {
      reject(error);
    });
  });
}

// Update a note in IndexedDB
function updateNote(note) {
  return saveNoteToDb(note); // Same function can be used for updates
}

// Delete a note from IndexedDB
function deleteNote(id) {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([NOTES_STORE], 'readwrite');
      const store = transaction.objectStore(NOTES_STORE);
      
      const request = store.delete(id);
      
      request.onsuccess = event => {
        console.log('Note deleted from IndexedDB:', id);
        resolve(id);
      };
      
      request.onerror = event => {
        console.error('Error deleting note:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    }).catch(error => {
      reject(error);
    });
  });
}

// Clear all notes from IndexedDB
function clearNotesDb() {
    return new Promise((resolve, reject) => {
      initDB().then(db => {
        const transaction = db.transaction([NOTES_STORE], 'readwrite');
        const store = transaction.objectStore(NOTES_STORE);
        
        const request = store.clear();
        
        request.onsuccess = event => {
          console.log('All notes cleared from IndexedDB');
          resolve();
        };
        
        request.onerror = event => {
          console.error('Error clearing notes:', event.target.error);
          reject(event.target.error);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      }).catch(error => {
        reject(error);
      });
    });
  }
  
  // Function to load and display notes in the UI
  function loadNotes() {
    const notesContainer = document.getElementById('notes-container');
    const loader = document.getElementById('notes-loader');
    
    if (!notesContainer) return;
    
    // Show loader
    if (loader) {
      loader.style.display = 'block';
    }
    
    // Clear existing notes except the header and loader
    while (notesContainer.children.length > 2) {
      notesContainer.removeChild(notesContainer.lastChild);
    }
    
    // Get all notes from IndexedDB
    getAllNotes()
      .then(notes => {
        // Hide loader
        if (loader) {
          loader.style.display = 'none';
        }
        
        if (notes.length === 0) {
          // Show empty state
          const emptyState = document.createElement('p');
          emptyState.className = 'empty-state';
          emptyState.textContent = 'No notes yet. Create your first note above!';
          notesContainer.appendChild(emptyState);
          return;
        }
        
        // Create a note card for each note
        notes.forEach(note => {
          const noteCard = createNoteElement(note);
          notesContainer.appendChild(noteCard);
        });
      })
      .catch(error => {
        console.error('Error loading notes:', error);
        
        // Hide loader
        if (loader) {
          loader.style.display = 'none';
        }
        
        // Show error state
        const errorState = document.createElement('p');
        errorState.className = 'error-state';
        errorState.textContent = 'Failed to load notes. Please try again.';
        notesContainer.appendChild(errorState);
      });
  }
  
  // Create a note element for the UI
  function createNoteElement(note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note-card';
    noteElement.dataset.id = note.id;
    
    // Add sync status indicator
    const syncStatus = document.createElement('div');
    syncStatus.className = note.synced ? 'sync-status synced' : 'sync-status unsynced';
    syncStatus.title = note.synced ? 'Synced with server' : 'Waiting to sync';
    
    // Create note content
    const title = document.createElement('h3');
    title.textContent = note.title;
    
    const content = document.createElement('p');
    content.textContent = note.content;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date(note.timestamp).toLocaleString();
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete note';
    deleteBtn.addEventListener('click', event => {
      event.stopPropagation();
      
      if (confirm('Are you sure you want to delete this note?')) {
        deleteNote(note.id)
          .then(() => {
            // Remove from UI
            noteElement.remove();
            showToast('Note deleted');
            
            // Check if there are no more notes
            getAllNotes().then(notes => {
              if (notes.length === 0) {
                loadNotes(); // Reload to show empty state
              }
            });
          })
          .catch(error => {
            console.error('Error deleting note:', error);
            showToast('Failed to delete note');
          });
      }
    });
    
    // Add all elements to the note card
    noteElement.appendChild(syncStatus);
    noteElement.appendChild(title);
    noteElement.appendChild(content);
    noteElement.appendChild(timestamp);
    noteElement.appendChild(deleteBtn);
    
    return noteElement;
  }