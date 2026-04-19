/* ═══════════════════════════════════════════════════════════
   YED Site — v3: Auto-hide header, Search, Animations
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── SCROLL ANIMATIONS ───────────────────────────────────
    function initScrollAnimations() {
        var posts = document.querySelectorAll('article.post');
        var sidebar = document.getElementById('sidebar');
        var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReduced) {
            posts.forEach(function (p) { p.style.opacity = '1'; p.style.transform = 'none'; });
            if (sidebar) { sidebar.style.opacity = '1'; sidebar.style.transform = 'none'; }
            return;
        }

        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

        posts.forEach(function (p) { obs.observe(p); });

        if (sidebar) {
            var fObs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) { sidebar.classList.add('is-visible'); fObs.unobserve(sidebar); }
            }, { threshold: 0.05 });
            fObs.observe(sidebar);
        }
    }

    // ─── HEADER: Transparent → Solid → Auto-hide ─────────────
    function initHeader() {
        var header = document.getElementById('header');
        if (!header) return;

        var lastScroll = 0;
        var ticking = false;
        var SOLID_THRESHOLD = 50;
        var HIDE_THRESHOLD = 300;

        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var y = window.scrollY;

                    // Solid background after scrolling a bit
                    if (y > SOLID_THRESHOLD) {
                        header.classList.add('header-solid');
                    } else {
                        header.classList.remove('header-solid');
                    }

                    // Hide on scroll down, show on scroll up
                    if (y > HIDE_THRESHOLD && y > lastScroll + 5) {
                        header.classList.add('header-hidden');
                    } else if (y < lastScroll - 5) {
                        header.classList.remove('header-hidden');
                    }

                    lastScroll = y;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ─── SEARCH ──────────────────────────────────────────────
    var searchIndex = null;
    var searchOverlay, searchModal, searchInput, searchResults;

    function createSearchUI() {
        var header = document.getElementById('header');
        if (!header) return;

        var navMain = header.querySelector('nav.main ul');
        if (navMain) {
            var li = document.createElement('li');
            li.className = 'search-trigger';
            li.innerHTML = '<a href="#" id="openSearch" style="border-bottom:none;" title="Ara (Ctrl+K)"><i class="fas fa-search" style="font-size:15px;"></i></a>';
            navMain.insertBefore(li, navMain.firstChild);
        }

        var navLinks = header.querySelector('nav.links ul');
        if (navLinks) {
            var s = document.createElement('li');
            s.innerHTML = '<a href="#" id="openSearchDesktop" style="border-bottom:none;opacity:0.5;" title="Ctrl+K"><i class="fas fa-search"></i> Ara</a>';
            navLinks.appendChild(s);
        }

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

        document.querySelectorAll('#openSearch, #openSearchDesktop').forEach(function (b) {
            b.addEventListener('click', function (e) { e.preventDefault(); openSearch(); });
        });
        searchOverlay.addEventListener('click', closeSearch);
        searchInput.addEventListener('input', function () {
            var q = searchInput.value.trim();
            if (q.length < 2) { searchResults.innerHTML = '<div class="search-hint">En az 2 karakter girin...</div>'; return; }
            doSearch(q);
        });
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
        loadIndex();
    }

    function closeSearch() {
        searchOverlay.classList.remove('active');
        searchModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function loadIndex() {
        if (searchIndex) return;
        fetch('search-index.json')
            .then(function (r) { if (!r.ok) throw 0; return r.json(); })
            .then(function (d) { searchIndex = d; })
            .catch(function () {
                fetch('./search-index.json').then(function (r) { return r.json(); }).then(function (d) { searchIndex = d; }).catch(function () { });
            });
    }

    function doSearch(q) {
        if (!searchIndex) { searchResults.innerHTML = '<div class="search-no-results">Yükleniyor...</div>'; return; }
        var lq = q.toLowerCase();
        var res = searchIndex.filter(function (i) {
            return i.title.toLowerCase().indexOf(lq) !== -1 || i.subtitle.toLowerCase().indexOf(lq) !== -1 || i.category.toLowerCase().indexOf(lq) !== -1;
        });
        if (!res.length) { searchResults.innerHTML = '<div class="search-no-results">"' + esc(q) + '" için sonuç bulunamadı</div>'; return; }
        var h = '';
        res.forEach(function (i) {
            h += '<a class="search-result-item" href="' + i.url + '">' +
                '<img src="' + i.image + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' +
                '<div class="search-result-info"><div class="search-result-title">' + hi(i.title, q) + '</div>' +
                '<div class="search-result-subtitle">' + hi(i.subtitle, q) + '</div></div>' +
                '<span class="search-result-badge">' + i.category + '</span></a>';
        });
        searchResults.innerHTML = h;
    }

    function hi(t, q) { var i = t.toLowerCase().indexOf(q.toLowerCase()); if (i === -1) return esc(t); return esc(t.substring(0, i)) + '<strong style="color:var(--accent)">' + esc(t.substring(i, i + q.length)) + '</strong>' + esc(t.substring(i + q.length)); }
    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    // ─── SMOOTH SCROLL ───────────────────────────────────────
    function initSmooth() { document.documentElement.style.scrollBehavior = 'smooth'; }

    // ─── INIT ────────────────────────────────────────────────
    function init() {
        initScrollAnimations();
        createSearchUI();
        initHeader();
        initSmooth();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
