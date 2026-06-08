/*
 * Shared chrome for static pages (trust pages, SEO landing pages).
 *
 * Populates #siteHeader and #siteFooter with the same layout as the SPA home,
 * and rewrites outbound store links using the affiliate config.
 *
 * Analytics, consent, and outbound-click tracking live in analytics.js, which
 * every page loads. Expected body attribute: data-page="<slug>".
 */
(function () {
    'use strict';

    // ── Header / Footer markup ───────────────────────────────────────────────
    var headerHTML =
        '<header>'
        + '<a class="logo" href="/" aria-label="Tallfind home">Tall<em>find</em></a>'
        + '<nav class="header-nav" aria-label="Directory sections">'
        +   '<a class="pill pill-sm" href="/">Home</a>'
        +   '<a class="pill pill-sm" href="/?tab=men">Men’s</a>'
        +   '<a class="pill pill-sm" href="/?tab=women">Women’s</a>'
        +   '<a class="pill pill-sm" href="/resources/">Resources</a>'
        + '</nav>'
        + '<div class="search-wrap">'
        +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
        +   '<label for="searchShortcut" class="sr-only">Search stores</label>'
        +   '<input type="text" id="searchShortcut" placeholder="Search by store, size, inseam..." readonly onclick="location.href=\'/?tab=men\'">'
        + '</div>'
        + '<div class="header-actions">'
        +   '<a class="pill pill-ghost pill-sm" href="/?modal=submit">+<span class="btn-label"> Submit</span></a>'
        +   '<a class="pill pill-ghost pill-sm" href="/?modal=feedback">✉<span class="btn-label"> Feedback</span></a>'
        + '</div>'
        + '</header>';

    function footerHTML() {
        return '<footer class="hp-footer">'
            + '<div class="hp-footer-inner">'
            +   '<div class="hp-footer-grid">'
            +     '<div class="hp-footer-brand">'
            +       '<div class="hp-footer-logo">Tall<em>find</em></div>'
            +       '<p>Curated tall fashion<br>for men and women.</p>'
            +     '</div>'
            +     '<div class="hp-footer-col">'
            +       '<h5>Directory</h5>'
            +       '<ul>'
            +         '<li><a href="/?tab=men">Men’s Tall</a></li>'
            +         '<li><a href="/?tab=women">Women’s Tall</a></li>'
            +         '<li><a href="/?tab=men&ft=tallSpecific">Tall-Only Brands</a></li>'
            +       '</ul>'
            +     '</div>'
            +     '<div class="hp-footer-col">'
            +       '<h5>Trust</h5>'
            +       '<ul>'
            +         '<li><a href="/about/">About</a></li>'
            +         '<li><a href="/how-we-review/">How We Review</a></li>'
            +         '<li><a href="/resources/">Tall Resources</a></li>'
            +         '<li><a href="/privacy/">Privacy</a></li>'
            +         '<li><a href="/terms/">Terms</a></li>'
            +       '</ul>'
            +     '</div>'
            +   '</div>'
            +   '<div class="hp-footer-bottom">'
            +     '<span>© ' + new Date().getFullYear() + ' Tallfind · Some outbound links may be affiliate links. <a href="/how-we-review/#disclosure" style="color:rgba(255,253,246,0.6);text-decoration:underline">How this works</a>.</span>'
            +   '</div>'
            + '</div>'
            + '</footer>';
    }

    // ── Rewrite outbound <a> tags using affiliate config ────────────────────
    function applyAffiliates() {
        if (!window.Tallfind || !window.Tallfind.affiliates) return;
        window.Tallfind.affiliates.ready.then(function () {
            var cfg = window.Tallfind.affiliates.getConfig() || {};
            var links = document.querySelectorAll('a[data-store-slug][data-store-url]');
            for (var i = 0; i < links.length; i++) {
                var a = links[i];
                var slug = a.dataset.storeSlug;
                var rawUrl = a.dataset.storeUrl;
                if (!slug || !rawUrl || !cfg[slug]) continue;
                var transformed = window.Tallfind.affiliates.affiliateUrl({
                    name: a.dataset.storeName || slug,
                    url: rawUrl,
                    slug: slug
                });
                if (transformed) {
                    a.href = transformed;
                    a.dataset.affiliateNetwork = cfg[slug].network || 'none';
                }
            }
        });
    }

    // ── Bootstrap ────────────────────────────────────────────────────────────
    function mount() {
        var header = document.getElementById('siteHeader');
        if (header) header.outerHTML = headerHTML;
        var footer = document.getElementById('siteFooter');
        if (footer) footer.outerHTML = footerHTML();
        applyAffiliates();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
