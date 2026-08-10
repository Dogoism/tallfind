/*
 * Bootstrap: framebusting, GA init, consent defaults, shared trackEvent.
 *
 * Loaded as a blocking <script> in <head> on every page, before GTM.
 * This is the single source of truth for the GA consent-default and
 * the trackEvent helper used by app.js and shared.js.
 */
(function () {
    'use strict';

    if (self !== top) {
        try { top.location.href = self.location.href; }
        catch (e) { document.documentElement.style.display = 'none'; }
    }

    var fontEl = document.getElementById('fontStylesheet');
    if (fontEl) {
        if (fontEl.sheet) fontEl.media = 'all';
        else fontEl.addEventListener('load', function () { this.media = 'all'; });
    }

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('consent', 'default', {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
    });

    var CONSENT_KEY = 'tallfind_analytics_consent';
    window.trackEvent = function (name, params, opts) {
        try {
            if (localStorage.getItem(CONSENT_KEY) !== 'accepted') return;
            if (typeof gtag !== 'function') return;
            var p = Object.assign({}, params || {});
            if (opts && opts.beacon) p.transport_type = 'beacon';
            gtag('event', name, p);
        } catch (e) { /* ignore */ }
    };
})();
