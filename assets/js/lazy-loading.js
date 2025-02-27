// Lazy Loading for images

document.addEventListener('DOMContentLoaded', () => {
    // Check if Intersection Observer API is supported
    if ('IntersectionObserver' in window) {
      initLazyLoading();
    } else {
      // Fallback for browsers that don't support Intersection Observer
      loadAllImages();
    }
  });
  
  // Initialize lazy loading with Intersection Observer
  function initLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-image');
    
    // Create a new observer
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        // If the image is in the viewport
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          
          // Load the image
          if (src) {
            // Add a placeholder animation
            img.classList.add('loading');
            
            // Set the actual image source
            img.src = src;
            
            // Listen for load event to remove animation
            img.onload = () => {
              img.classList.remove('loading');
              img.classList.add('loaded');
            };
            
            // Stop observing the image
            observer.unobserve(img);
          }
        }
      });
    }, {
      // Options for the observer (adjust as needed)
      rootMargin: '0px 0px 50px 0px', // Load images a bit before they come into view
      threshold: 0.1 // Trigger when at least 10% of the image is visible
    });
    
    // Observe all the lazy images
    lazyImages.forEach(img => {
      // Add placeholder styling
      img.classList.add('lazy-placeholder');
      
      // Start observing
      imageObserver.observe(img);
    });
  }
  
  // Fallback function to load all images immediately
  function loadAllImages() {
    const lazyImages = document.querySelectorAll('.lazy-image');
    
    lazyImages.forEach(img => {
      const src = img.dataset.src;
      if (src) {
        img.src = src;
      }
    });
  }
  
  // Native lazy loading helper (modern browsers only)
  function enableNativeLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-image');
    
    lazyImages.forEach(img => {
      // Add native loading attribute
      img.loading = 'lazy';
      
      // Set src from data-src
      img.src = img.dataset.src;
      
      // Remove placeholder styling on load
      img.onload = () => {
        img.classList.remove('lazy-placeholder');
        img.classList.add('loaded');
      };
    });
  }
  
  // Check if native lazy loading is available and use it if possible
  if ('loading' in HTMLImageElement.prototype) {
    // Browser supports native lazy loading
    window.addEventListener('load', enableNativeLazyLoading);
  }