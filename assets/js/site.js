/* ═══════════════════════════════════════════════════════════
   YED Site — Global Search + Scroll Animations v2
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── SCROLL ANIMATIONS (IntersectionObserver) ────────────
    function initScrollAnimations() {
        var posts = document.querySelectorAll('article.post');
        var sidebar = document.getElementById('sidebar');

        // If reduced motion, show everything
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            posts.forEach(function (p) { p.style.opacity = '1'; p.style.transform = 'none'; });
            if (sidebar) { sidebar.style.opacity = '1'; sidebar.style.transform = 'none'; }
            return;
        }

        var postObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    postObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

        posts.forEach(function (post) { postObserver.observe(post); });

        // Sidebar/footer entrance
        if (sidebar) {
            var footerObs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    sidebar.classList.add('is-visible');
                    footerObs.unobserve(sidebar);
                }
            }, { threshold: 0.1 });
            footerObs.observe(sidebar);
        }
    }

    // ─── SEARCH SYSTEM ───────────────────────────────────────
    var searchIndex = null;
    var searchOverlay, searchModal, searchInput, searchResults;

    function createSearchUI() {
        var header = document.getElementById('header');
        if (!header) return;

        // Add search to nav.main (mobile hamburger area)
        var navMain = header.querySelector('nav.main ul');
        if (navMain) {
            var searchLi = document.createElement('li');
            searchLi.className = 'search-trigger';
            searchLi.innerHTML = '<a href="#" id="openSearch" style="border-bottom:none;" title="Ara (Ctrl+K)"><i class="fas fa-search" style="font-size:15px;"></i></a>';
            navMain.insertBefore(searchLi, navMain.firstChild);
        }

        // Add search to desktop nav
        var navLinks = header.querySelector('nav.links ul');
        if (navLinks) {
            var s = document.createElement('li');
            s.innerHTML = '<a href="#" id="openSearchDesktop" style="border-bottom:none;opacity:0.55;font-size:0.85em;" title="Ara (Ctrl+K)"><i class="fas fa-search"></i> Ara</a>';
            navLinks.appendChild(s);
        }

        // Overlay + Modal
        searchOverlay = document.createElement('div');
        searchOverlay.className = 'search-overlay';
        document.body.appendChild(searchOverlay);

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

        // Listeners
        document.querySelectorAll('#openSearch, #openSearchDesktop').forEach(function (btn) {
            btn.addEventListener('click', function (e) { e.preventDefault(); openSearch(); });
        });

        searchOverlay.addEventListener('click', closeSearch);

        searchInput.addEventListener('input', function () {
            var q = searchInput.value.trim();
            if (q.length < 2) {
                searchResults.innerHTML = '<div class="search-hint">En az 2 karakter girin...</div>';
                return;
            }
            performSearch(q);
        });

        // Keyboard
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
            if (e.key === 'Escape') closeSearch();
        });
    }

    function openSearch() {
        searchOverlay.classList.add('active');
        searchModal.classList.add('active');
        searchInput.value = '';
        searchResults.innerHTML = '<div class="search-hint">Aramaya başlamak için yazın...</div>';
        setTimeout(function () { searchInput.focus(); }, 120);
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
        // Try root path first, then relative
        fetch('search-index.json')
            .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
            .then(function (d) { searchIndex = d; })
            .catch(function () {
                fetch('./search-index.json')
                    .then(function (r) { return r.json(); })
                    .then(function (d) { searchIndex = d; })
                    .catch(function () { });
            });
    }

    function performSearch(query) {
        if (!searchIndex) {
            searchResults.innerHTML = '<div class="search-no-results">Yükleniyor...</div>';
            return;
        }
        var q = query.toLowerCase();
        var results = searchIndex.filter(function (item) {
            return item.title.toLowerCase().indexOf(q) !== -1 ||
                item.subtitle.toLowerCase().indexOf(q) !== -1 ||
                item.category.toLowerCase().indexOf(q) !== -1;
        });

        if (!results.length) {
            searchResults.innerHTML = '<div class="search-no-results">"' + esc(query) + '" için sonuç bulunamadı</div>';
            return;
        }

        var html = '';
        results.forEach(function (item) {
            html += '<a class="search-result-item" href="' + item.url + '">' +
                '<img src="' + item.image + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' +
                '<div class="search-result-info">' +
                '  <div class="search-result-title">' + hi(item.title, query) + '</div>' +
                '  <div class="search-result-subtitle">' + hi(item.subtitle, query) + '</div>' +
                '</div>' +
                '<span class="search-result-badge">' + item.category + '</span>' +
                '</a>';
        });
        searchResults.innerHTML = html;
    }

    function hi(text, q) {
        var i = text.toLowerCase().indexOf(q.toLowerCase());
        if (i === -1) return esc(text);
        return esc(text.substring(0, i)) + '<strong style="color:var(--accent)">' + esc(text.substring(i, i + q.length)) + '</strong>' + esc(text.substring(i + q.length));
    }

    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    // ─── HEADER SCROLL EFFECT ────────────────────────────────
    function initHeaderScroll() {
        var h = document.getElementById('header');
        if (!h) return;
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    if (window.scrollY > 20) {
                        h.classList.add('scrolled');
                    } else {
                        h.classList.remove('scrolled');
                    }
                    ticking = false;
                });
                ticking = true;
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
        initHeaderScroll();
        initSmoothScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
