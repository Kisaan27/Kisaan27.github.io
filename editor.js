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

  // Set canonical/og:url synchronously, before the Supabase fetch below.
  // These only need the URL (already known), not the fetched article data, and
  // Google's crawler may snapshot the page before an async fetch resolves —
  // if it does, every article would otherwise share the same canonical-less
  // markup and get flagged as duplicate content with no clear canonical.
  const canonicalUrl = `${window.location.origin}${window.location.pathname}?id=${articleId}`;
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);
  const ogUrlEarly = document.querySelector('meta[property="og:url"]');
  if (ogUrlEarly) ogUrlEarly.setAttribute('content', canonicalUrl);

  // Mobile-only hero banner image. There's no image column on the articles
  // table (see the save payload below), so this mirrors the thumbnails already
  // used for each article's card on research.html rather than touching Supabase.
  const ARTICLE_IMAGES = {
    2: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&q=80&w=1400',
    3: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1400',
    4: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1400',
    5: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1400',
    6: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=1400',
    7: 'images/Operating-Room-Terminal-Cleaning.jpg',
    8: 'images/Onsite-Laboratory-Investigations-and-Screening-Services.jpg',
    9: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=1400',
    10: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&q=80&w=1400',
    11: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=1400',
    12: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=1400',
    13: 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?auto=format&fit=crop&q=80&w=1400',
    14: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=1400',
    15: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1400',
    16: 'https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&q=80&w=1400',
    17: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&q=80&w=1400',
    18: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1400',
    19: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&q=80&w=1400',
    20: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&q=80&w=1400',
    21: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=1400',
    22: 'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&q=80&w=1400',
    23: 'https://images.unsplash.com/photo-1580281657702-257584239a55?auto=format&fit=crop&q=80&w=1400',
    24: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&q=80&w=1400',
    25: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=1400',
    26: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&q=80&w=1400',
    27: 'https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?auto=format&fit=crop&q=80&w=1400',
  };
  const heroImg = document.getElementById('edit-hero-image');
  if (heroImg) heroImg.src = ARTICLE_IMAGES[articleId] || 'images/logo-full.png';

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
    // Article structured data (JSON-LD) so Google can show rich results/bylines.
    const parsedDate = byline ? new Date(byline.date.split('•')[0].trim()) : null;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: articleData.title,
      description: plainAbstract,
      url: canonicalUrl,
      image: 'https://slatesurgery.com/images/logo-full.png',
      publisher: {
        '@type': 'Organization',
        name: 'Slate Surgery',
        logo: {
          '@type': 'ImageObject',
          url: 'https://slatesurgery.com/images/logo-full.png'
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

  // Sidebar "Subscribe to Research" form, shared by article.html and ehss.html.
  // Must run for every visitor, so this sits before the admin-session check below.
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    const newsletterEmail = document.getElementById('newsletter-email');
    const newsletterSubmitBtn = document.getElementById('newsletter-submit-btn');
    const newsletterSuccess = document.getElementById('newsletter-success');
    const newsletterError = document.getElementById('newsletter-error');

    newsletterForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      newsletterSuccess.classList.remove('visible');
      newsletterError.classList.remove('visible');

      const email = newsletterEmail.value.trim();
      const originalText = newsletterSubmitBtn.innerText;
      newsletterSubmitBtn.disabled = true;
      newsletterSubmitBtn.innerText = 'Subscribing...';

      const { error: subscribeError } = await _supabase
        .from('subscribers')
        .insert({ email });

      newsletterSubmitBtn.disabled = false;
      newsletterSubmitBtn.innerText = originalText;

      if (subscribeError) {
        newsletterError.textContent = 'Something went wrong: ' + subscribeError.message;
        newsletterError.classList.add('visible');
        return;
      }

      newsletterSuccess.classList.add('visible');
      newsletterForm.reset();
    });
  }

  // "Copy link" share button, shared by article.html and ehss.html.
  const copyLinkBtn = document.getElementById('copy-link-btn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      const icon = copyLinkBtn.querySelector('i');
      const originalIconClass = icon.className;
      try {
        await navigator.clipboard.writeText(window.location.href);
        icon.className = 'fa-solid fa-check';
      } catch (err) {
        console.error('Copy link failed', err);
        icon.className = 'fa-solid fa-xmark';
      }
      setTimeout(() => { icon.className = originalIconClass; }, 2000);
    });
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