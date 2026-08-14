// Toolbar controls (selects, color pickers, the "More" dropdown) steal focus from the
// contenteditable region before their onchange fires, which collapses the selection and
// silently no-ops execCommand. Track the last selection made inside an editable field and
// restore it immediately before every command so formatting always applies to the right text.
let savedRange = null;

function saveSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (el && el.closest('[contenteditable="true"]')) savedRange = range.cloneRange();
}

function restoreSelection() {
  if (!savedRange) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);
}

document.addEventListener('selectionchange', saveSelection);

function format(command) {
  restoreSelection();
  document.execCommand(command, false, null);
  saveSelection();
}

function formatBlock(tag) {
  restoreSelection();
  document.execCommand('formatBlock', false, tag);
  saveSelection();
}

function applyCommand(command, value) {
  if (!value) return;
  restoreSelection();
  document.execCommand(command, false, value);
  saveSelection();
}

function insertLink() {
  const url = prompt('Enter URL:');
  if (url) {
    restoreSelection();
    document.execCommand('createLink', false, url);
    saveSelection();
  }
}

function toggleMoreMenu(event) {
  event.stopPropagation();
  const panel = document.getElementById('toolbar-more-panel');
  if (panel) panel.classList.toggle('open');
}

document.addEventListener('click', (event) => {
  const panel = document.getElementById('toolbar-more-panel');
  const toggle = document.getElementById('toolbar-more-toggle');
  if (!panel || !panel.classList.contains('open')) return;
  if (!panel.contains(event.target) && event.target !== toggle && !toggle.contains(event.target)) {
    panel.classList.remove('open');
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const _supabase = supabase.createClient(
    'https://brreqfxtesvavfdaidwi.supabase.co',
    'sb_publishable_3x4bvAl-vr2bBgNZkzh04w_suiCtcf5'
  );

  // Every article page shares this template; ?id= picks which row to load/save.
  const articleId = Number(new URLSearchParams(window.location.search).get('id')) || 1;

  // Byline info isn't in the articles table (no author/date columns), so it's
  // kept here until the schema grows one. Missing an entry just keeps the
  // "Draft • Not yet published" placeholder, which is correct for new drafts.
  const BYLINES = {
    2: { author: 'Aazad Abbas', date: 'Mar 18, 2025 • 1 min read' },
    3: { author: 'Aazad Abbas', date: 'Mar 18, 2025 • 2 min read' },
    4: { author: 'Aazad Abbas', date: 'Mar 18, 2025 • 1 min read' },
    5: { author: 'Aazad Abbas', date: 'Mar 18, 2025 • 1 min read' },
    6: { author: 'Aazad Abbas', date: 'Mar 18, 2025 • 1 min read' },
    7: { author: 'Aazad Abbas', date: 'Mar 18, 2025 • 1 min read' },
    8: { author: 'Aazad Abbas', date: 'Mar 18, 2025 • 2 min read' },
    9: { author: 'Slate Surgery', date: 'Nov 20, 2023 • 2 min read' },
    10: { author: 'Slate Surgery', date: 'Nov 20, 2023 • 2 min read' },
    11: { author: 'Slate Surgery', date: 'Jul 20, 2023 • 2 min read' },
    12: { author: 'Slate Surgery', date: 'Jun 15, 2023 • 2 min read' },
    13: { author: 'Slate Surgery', date: 'May 15, 2023 • 2 min read' },
    14: { author: 'Slate Surgery', date: 'Mar 9, 2023 • 2 min read' },
    15: { author: 'Slate Surgery', date: 'Mar 1, 2023 • 2 min read' },
    16: { author: 'Slate Surgery', date: 'Feb 25, 2023 • 2 min read' },
    17: { author: 'Slate Surgery', date: 'Jan 26, 2023 • 2 min read' },
    18: { author: 'Slate Surgery', date: 'Jul 19, 2022 • 2 min read' },
    19: { author: 'Slate Surgery', date: 'Jul 15, 2022 • 1 min read' },
    20: { author: 'Slate Surgery', date: 'Jun 29, 2022 • 2 min read' },
    21: { author: 'Slate Surgery', date: 'Jun 27, 2022 • 2 min read' },
    22: { author: 'Slate Surgery', date: 'Apr 12, 2022 • 2 min read' },
    23: { author: 'Slate Surgery', date: 'Mar 16, 2022 • 2 min read' },
    24: { author: 'Slate Surgery', date: 'Feb 1, 2022 • 2 min read' },
    25: { author: 'Slate Surgery', date: 'Dec 5, 2021 • 1 min read' },
    26: { author: 'Slate Surgery', date: 'Nov 5, 2021 • 1 min read' },
    27: { author: 'Slate Surgery', date: 'Sep 25, 2021 • 1 min read' },
  };

  // 1. Load article content for EVERYONE
  const { data: articleData, error: fetchError } = await _supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  console.log('Fetched article:', articleData, 'Error:', fetchError);

  // Hide the loading overlay and pop the content in now that the fetch has
  // settled (success or failure) — runs unconditionally so a fetch error
  // never leaves visitors stuck staring at the loading screen.
  const articleLoader = document.getElementById('article-loader');
  const postContainer = document.querySelector('.post-container');
  if (articleLoader) articleLoader.classList.add('is-hidden');
  if (postContainer) postContainer.classList.add('is-ready');

  if (articleData) {
    if (document.getElementById('edit-tag')) document.getElementById('edit-tag').innerHTML = articleData.tag;
    if (document.getElementById('edit-title')) document.getElementById('edit-title').innerHTML = articleData.title;
    if (document.getElementById('edit-abstract')) document.getElementById('edit-abstract').innerHTML = articleData.abstract;
    if (document.getElementById('edit-body')) document.getElementById('edit-body').innerHTML = articleData.body;

    const byline = BYLINES[articleId];
    if (byline) {
      if (document.getElementById('edit-author')) document.getElementById('edit-author').innerHTML = byline.author;
      if (document.getElementById('edit-date')) document.getElementById('edit-date').innerHTML = byline.date;
    }

    // Populate per-article SEO metadata (falls back to the static tags in the HTML if fields are missing).
    if (articleData.title) {
      const pageTitle = `${articleData.title} — Slate Surgery`;
      document.title = pageTitle;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', pageTitle);
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', pageTitle);
    }
    const plainAbstract = articleData.abstract
      ? articleData.abstract.replace(/<[^>]+>/g, '').trim().slice(0, 160)
      : undefined;
    if (plainAbstract) {
      const descTag = document.querySelector('meta[name="description"]');
      if (descTag) descTag.setAttribute('content', plainAbstract);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', plainAbstract);
      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute('content', plainAbstract);
    }
    const canonicalUrl = `${window.location.origin}${window.location.pathname}?id=${articleId}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    // Article structured data (JSON-LD) so Google can show rich results/bylines.
    const parsedDate = byline ? new Date(byline.date.split('•')[0].trim()) : null;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: articleData.title,
      description: plainAbstract,
      url: canonicalUrl,
      image: 'https://kisaan27.github.io/images/logo-full.png',
      publisher: {
        '@type': 'Organization',
        name: 'Slate Surgery',
        logo: {
          '@type': 'ImageObject',
          url: 'https://kisaan27.github.io/images/logo-full.png'
        }
      },
      author: {
        '@type': byline && byline.author !== 'Slate Surgery' ? 'Person' : 'Organization',
        name: (byline && byline.author) || 'Slate Surgery'
      }
    };
    if (parsedDate && !isNaN(parsedDate)) {
      jsonLd.datePublished = parsedDate.toISOString().slice(0, 10);
    }
    let jsonLdScript = document.getElementById('article-jsonld');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.id = 'article-jsonld';
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.textContent = JSON.stringify(jsonLd);
  }

  // 2. Check if an admin session exists
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return;

  // 3. Show the editor toolbar & add class to body
  const editorControls = document.getElementById('editor-controls');
  if (editorControls) {
      editorControls.style.display = 'flex';
      document.body.classList.add('editing-active');
  }

  // 4. Setup Elements & Toggle Functionality
  const editableIds = ['edit-tag', 'edit-title', 'edit-abstract', 'edit-body'];
  const toggleBtn = document.getElementById('toggle-edit-mode');
  const toolbar = document.getElementById('editor-toolbar');
  const saveBtn = document.getElementById('save-btn');
  const statusText = document.getElementById('status-text');
  const signOutBtn = document.getElementById('signout-btn');

  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await _supabase.auth.signOut();
      window.location.reload();
    });
  }

  // Helper to toggle edit mode styling and status
  function setEditingState(active) {
      editableIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
              if (active) {
                  el.contentEditable = 'true';
                  el.style.outline = '2px dashed #ff6b6b';
                  el.style.borderRadius = '4px';
                  el.style.minHeight = '1em';
              } else {
                  el.contentEditable = 'false';
                  el.style.outline = 'none';
                  el.style.borderRadius = '0px';
              }
          }
      });
  }

  // Set initial state to editing mode (since user is authenticated)
  setEditingState(true);

  // Setup the click listener on the status text element
  if (toggleBtn) {
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.style.userSelect = 'none';

      toggleBtn.addEventListener('click', () => {
          const isCurrentlyActive = document.body.classList.contains('editing-active');

          if (isCurrentlyActive) {
              // --- VIEW MODE ---
              document.body.classList.remove('editing-active');
              
              if (toolbar) toolbar.style.setProperty('display', 'none', 'important');
              if (saveBtn) saveBtn.style.setProperty('display', 'none', 'important');
              
              if (statusText) statusText.innerText = "Preview Mode (Click to Edit)";
              const icon = toggleBtn.querySelector('i');
              if (icon) icon.className = "fa-solid fa-toggle-off";
              toggleBtn.style.color = "var(--text-muted)";
              
              setEditingState(false);
          } else {
              // --- EDIT MODE ---
              document.body.classList.add('editing-active');
              
              if (toolbar) toolbar.style.setProperty('display', 'flex', 'important');
              if (saveBtn) saveBtn.style.setProperty('display', 'inline-flex', 'important');
              
              if (statusText) statusText.innerText = "Editing Mode Active";
              const icon = toggleBtn.querySelector('i');
              if (icon) icon.className = "fa-solid fa-toggle-on";
              toggleBtn.style.color = "var(--accent-mint)";
              
              setEditingState(true);
          }
      });
  }

  // 5. Save button logic
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const payload = {
        tag:        document.getElementById('edit-tag')?.innerHTML,
        title:      document.getElementById('edit-title')?.innerHTML,
        abstract:   document.getElementById('edit-abstract')?.innerHTML,
        body:       document.getElementById('edit-body')?.innerHTML,
        updated_at: new Date().toISOString(),
      };

      const { error } = await _supabase
        .from('articles')
        .upsert({ id: articleId, ...payload });

      console.log('Save error:', error);

      if (error) {
        alert('Save failed: ' + error.message);
      } else {
        saveBtn.innerHTML = '✓ Saved!';
        setTimeout(() => saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes', 2000);
      }
    });
  }
});