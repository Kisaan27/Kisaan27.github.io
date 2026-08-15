// Wires up every navbar search bar (#siteSearchBar) across the site.
// While typing, shows suggestions to search the query in Articles (which
// also includes published papers). If the current page already has its own
// filterable list (research.html's #search-input), Enter drives that filter
// directly instead of navigating away.
document.addEventListener('DOMContentLoaded', () => {
  const siteSearchBar = document.getElementById('siteSearchBar');
  if (!siteSearchBar) return;

  const wrapper = siteSearchBar.closest('.search-wrapper, .navbar__search') || siteSearchBar.parentElement;
  const localInput = document.querySelector('#search-input, #search');
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';

  const destinations = [
    { label: 'Research', file: 'research.html' },
  ].filter((d) => d.file !== currentFile);

  const dropdown = document.createElement('div');
  dropdown.className = 'search-suggest';
  wrapper.appendChild(dropdown);

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function renderSuggestions(query) {
    if (!query || destinations.length === 0) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      return;
    }
    const safeQuery = escapeHtml(query);
    dropdown.innerHTML = destinations.map((d) => `
      <button type="button" class="search-suggest-item" data-file="${d.file}">
        <i class="fas fa-search"></i>
        <span>Search &ldquo;<strong>${safeQuery}</strong>&rdquo; in ${d.label}</span>
      </button>
    `).join('');
    dropdown.classList.add('open');
  }

  function goToDestination(file, query) {
    dropdown.classList.remove('open');
    window.location.href = `${file}?q=${encodeURIComponent(query)}`;
  }

  siteSearchBar.addEventListener('input', () => {
    renderSuggestions(siteSearchBar.value.trim());
  });

  siteSearchBar.addEventListener('focus', () => {
    if (siteSearchBar.value.trim()) renderSuggestions(siteSearchBar.value.trim());
  });

  dropdown.addEventListener('click', (event) => {
    const item = event.target.closest('.search-suggest-item');
    if (!item) return;
    const query = siteSearchBar.value.trim();
    if (query) goToDestination(item.dataset.file, query);
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) dropdown.classList.remove('open');
  });

  siteSearchBar.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const query = siteSearchBar.value.trim();
    if (!query) return;
    dropdown.classList.remove('open');

    if (localInput) {
      localInput.value = query;
      localInput.dispatchEvent(new Event('input', { bubbles: true }));
      localInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      goToDestination('research.html', query);
    }
  });

  // Deep link support: ?q= drives the local filter (research.html / scholar.html)
  // when arriving from a search suggestion on another page.
  const incomingQuery = new URLSearchParams(window.location.search).get('q');
  if (incomingQuery) {
    siteSearchBar.value = incomingQuery;
    if (localInput) {
      localInput.value = incomingQuery;
      localInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Mobile search: icon-only trigger that opens a full-screen overlay
  // with the search bar and a "Quick Links" list built from the page's own nav links.
  const mobileToggle = document.getElementById('mobileSearchToggle');
  if (mobileToggle) {
    const toggleIcon = mobileToggle.querySelector('i');
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'));

    if (navLinks.length) {
      const quickLinks = document.createElement('div');
      quickLinks.className = 'mobile-search-quicklinks';
      const label = document.createElement('div');
      label.className = 'mobile-search-quicklinks-label';
      label.textContent = 'Quick Links';
      quickLinks.appendChild(label);
      navLinks.forEach((a) => {
        const link = document.createElement('a');
        link.href = a.getAttribute('href');
        link.className = 'mobile-search-quicklink';
        link.innerHTML = `<i class="fas fa-arrow-right"></i><span>${escapeHtml(a.textContent.trim())}</span>`;
        quickLinks.appendChild(link);
      });
      wrapper.appendChild(quickLinks);
    }

    function closeHamburgerMenu() {
      const navLinksEl = document.querySelector('.nav-links');
      const hamburgerBtn = document.getElementById('navHamburger');
      if (navLinksEl) navLinksEl.classList.remove('open');
      if (hamburgerBtn) {
        hamburgerBtn.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      }
    }

    function openMobileSearch() {
      closeHamburgerMenu();
      document.body.classList.add('mobile-search-open');
      mobileToggle.setAttribute('aria-expanded', 'true');
      if (toggleIcon) toggleIcon.classList.replace('fa-search', 'fa-times');
      setTimeout(() => siteSearchBar.focus(), 200);
    }

    function closeMobileSearch() {
      document.body.classList.remove('mobile-search-open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      if (toggleIcon) toggleIcon.classList.replace('fa-times', 'fa-search');
      dropdown.classList.remove('open');
    }

    mobileToggle.addEventListener('click', () => {
      if (document.body.classList.contains('mobile-search-open')) closeMobileSearch();
      else openMobileSearch();
    });

    // Tapping the empty overlay background (not the input, suggestions, or
    // quick links themselves) dismisses it, same as tapping the toggle again.
    wrapper.addEventListener('click', (event) => {
      if (event.target === wrapper && document.body.classList.contains('mobile-search-open')) {
        closeMobileSearch();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMobileSearch();
    });
  }
});
