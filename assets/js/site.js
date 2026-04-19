/* ═══════════════════════════════════════════════════════════
   YED Site — Global Search + Scroll Animations
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── SCROLL ANIMATIONS (IntersectionObserver) ────────────
    function initScrollAnimations() {
        var posts = document.querySelectorAll('article.post');
        if (!posts.length) return;

        // If reduced motion is preferred, show everything immediately
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            posts.forEach(function (p) {
                p.style.opacity = '1';
                p.style.transform = 'none';
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

        posts.forEach(function (post) {
            observer.observe(post);
        });
    }

    // ─── SEARCH SYSTEM ───────────────────────────────────────
    var searchIndex = null;
    var searchOverlay = null;
    var searchModal = null;
    var searchInput = null;
    var searchResults = null;

    function createSearchUI() {
        // Search button in header
        var header = document.getElementById('header');
        if (!header) return;

        var navMain = header.querySelector('nav.main ul');
        if (navMain) {
            var searchLi = document.createElement('li');
            searchLi.className = 'search-trigger';
            searchLi.innerHTML = '<a href="#" id="openSearch" style="border-bottom:none;" title="Ara (Ctrl+K)"><i class="fas fa-search" style="font-size:16px;"></i></a>';
            navMain.insertBefore(searchLi, navMain.firstChild);
        }

        // Also add to nav.links area for desktop
        var navLinks = header.querySelector('nav.links ul');
        if (navLinks) {
            var searchDesktopLi = document.createElement('li');
            searchDesktopLi.innerHTML = '<a href="#" id="openSearchDesktop" style="border-bottom:none;opacity:0.6;font-size:0.85em;" title="Ara (Ctrl+K)"><i class="fas fa-search"></i> Ara</a>';
            navLinks.appendChild(searchDesktopLi);
        }

        // Overlay
        searchOverlay = document.createElement('div');
        searchOverlay.className = 'search-overlay';
        document.body.appendChild(searchOverlay);

        // Modal
        searchModal = document.createElement('div');
        searchModal.className = 'search-modal';
        searchModal.innerHTML =
            '<div class="search-modal-input-wrap">' +
            '  <span class="search-icon"><i class="fas fa-search"></i></span>' +
            '  <input type="text" id="searchInput" placeholder="Proje veya ders ara..." autocomplete="off" />' +
            '  <span class="search-kbd">ESC</span>' +
            '</div>' +
            '<div id="searchResults" class="search-results">' +
            '  <div class="search-hint">Aramaya başlamak için yazın...</div>' +
            '</div>';
        document.body.appendChild(searchModal);

        searchInput = document.getElementById('searchInput');
        searchResults = document.getElementById('searchResults');

        // Event listeners
        var openBtns = document.querySelectorAll('#openSearch, #openSearchDesktop');
        openBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                openSearch();
            });
        });

        searchOverlay.addEventListener('click', closeSearch);

        searchInput.addEventListener('input', function () {
            var q = searchInput.value.trim();
            if (q.length < 2) {
                searchResults.innerHTML = '<div class="search-hint">Aramaya başlamak için en az 2 karakter girin...</div>';
                return;
            }
            performSearch(q);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function (e) {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                openSearch();
            }
            // Escape
            if (e.key === 'Escape') {
                closeSearch();
            }
        });
    }

    function openSearch() {
        searchOverlay.classList.add('active');
        searchModal.classList.add('active');
        searchInput.value = '';
        searchResults.innerHTML = '<div class="search-hint">Aramaya başlamak için yazın...</div>';
        setTimeout(function () { searchInput.focus(); }, 100);
        document.body.style.overflow = 'hidden';
        loadSearchIndex();
    }

    function closeSearch() {
        searchOverlay.classList.remove('active');
        searchModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function loadSearchIndex() {
        if (searchIndex) return;
        fetch('search-index.json')
            .then(function (r) { return r.json(); })
            .then(function (data) { searchIndex = data; })
            .catch(function () {
                // Try relative path variations
                fetch('./search-index.json')
                    .then(function (r) { return r.json(); })
                    .then(function (data) { searchIndex = data; })
                    .catch(function () { console.warn('Search index not found'); });
            });
    }

    function performSearch(query) {
        if (!searchIndex) {
            searchResults.innerHTML = '<div class="search-no-results">Arama indeksi yükleniyor...</div>';
            return;
        }

        var q = query.toLowerCase();
        var results = searchIndex.filter(function (item) {
            return item.title.toLowerCase().indexOf(q) !== -1 ||
                item.subtitle.toLowerCase().indexOf(q) !== -1 ||
                item.category.toLowerCase().indexOf(q) !== -1;
        });

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">Sonuç bulunamadı: "' + escapeHtml(query) + '"</div>';
            return;
        }

        var html = '';
        results.forEach(function (item) {
            html += '<a class="search-result-item" href="' + item.url + '">' +
                '<img src="' + item.image + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' +
                '<div class="search-result-info">' +
                '  <div class="search-result-title">' + highlightMatch(item.title, query) + '</div>' +
                '  <div class="search-result-subtitle">' + highlightMatch(item.subtitle, query) + '</div>' +
                '</div>' +
                '<span class="search-result-badge">' + item.category + '</span>' +
                '</a>';
        });

        searchResults.innerHTML = html;
    }

    function highlightMatch(text, query) {
        var idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return escapeHtml(text);
        return escapeHtml(text.substring(0, idx)) +
            '<strong style="color:var(--accent)">' + escapeHtml(text.substring(idx, idx + query.length)) + '</strong>' +
            escapeHtml(text.substring(idx + query.length));
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── HEADER SCROLL SHADOW ────────────────────────────────
    function initHeaderShadow() {
        var header = document.getElementById('header');
        if (!header) return;
        window.addEventListener('scroll', function () {
            if (window.scrollY > 10) {
                header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
            } else {
                header.style.boxShadow = '0 1px 8px rgba(0,0,0,0.04)';
            }
        }, { passive: true });
    }

    // ─── SMOOTH SCROLL ───────────────────────────────────────
    function initSmoothScroll() {
        document.documentElement.style.scrollBehavior = 'smooth';
    }

    // ─── INIT ────────────────────────────────────────────────
    function init() {
        initScrollAnimations();
        createSearchUI();
        initHeaderShadow();
        initSmoothScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
