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
});
