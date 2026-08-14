// ── PREVENT BROWSER FROM RESTORING PRIOR SCROLL POSITION ON REFRESH ──
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
if (!window.location.hash) {
  window.scrollTo(0, 0);
}

// ── INTERCEPT SMOOTH SCROLLING MARKS ──
document.querySelectorAll('a[href^="#"]').forEach(anchorLink => {
  anchorLink.addEventListener('click', function (event) {
    event.preventDefault();
    const targetElementId = this.getAttribute('href');
    const destinationNode = document.querySelector(targetElementId);
    
    if (destinationNode) {
      const headerOffset = 80; 
      const elementPosition = destinationNode.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// Navbar search functionality now lives in site-search.js (shared across pages).