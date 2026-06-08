/*
 * Shared analytics + consent for every Tallfind page (the SPA and the static
 * trust/landing pages). Previously this logic was triplicated across app.js,
 * shared.js, and an inline block in index.html.
 *
 * Responsibilities:
 *   - trackEvent: GA4 event helper, gated on stored analytics consent.
 *   - consent banner: renders the banner (if not already in the page), persists
 *     the accept/reject choice, and configures GA on accept.
 *   - outbound tracker: emits outbound_click + visit_store for cross-host links.
 *
 * source_page is read from <body data-page="...">. The SPA keeps that attribute
 * in sync with the active tab (see switchTab in app.js).
 */
(function () {
    'use strict';

    var CONSENT_KEY = 'tallfind_analytics_consent';
    var GA_ID = 'G-98C0R7CN01';

    // ── Event helper ─────────────────────────────────────────────────────────
    function trackEvent(name, params, opts) {
        try {
            if (localStorage.getItem(CONSENT_KEY) !== 'accepted') return;
            if (typeof gtag !== 'function') return;
            var p = Object.assign({}, params || {});
            if (opts && opts.beacon) p.transport_type = 'beacon';
            gtag('event', name, p);
        } catch (e) { /* ignore */ }
    }
    window.trackEvent = window.trackEvent || trackEvent;

    // ── Consent banner ───────────────────────────────────────────────────────
    function renderConsentBanner() {
        var banner = document.getElementById('consentBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'consentBanner';
            banner.className = 'consent-banner';
            banner.setAttribute('role', 'dialog');
            banner.setAttribute('aria-live', 'polite');
            banner.setAttribute('aria-label', 'Analytics consent');
            banner.innerHTML =
                '<div class="consent-title">Privacy settings</div>'
                + '<div class="consent-text">We use analytics to understand site usage and improve Tallfind. You can accept or reject analytics tracking.</div>'
                + '<div class="consent-actions">'
                +   '<button id="consentReject" class="pill pill-sm pill-ghost" type="button">Reject</button>'
                +   '<button id="consentAccept" class="pill pill-sm" type="button">Accept</button>'
                + '</div>';
            document.body.appendChild(banner);
        }

        var configured = false;
        function configureGA() {
            if (configured || typeof gtag !== 'function') return;
            configured = true;
            gtag('config', GA_ID);
        }
        function setConsent(choice) {
            localStorage.setItem(CONSENT_KEY, choice);
            if (typeof gtag === 'function') {
                if (choice === 'accepted') {
                    gtag('consent', 'update', { analytics_storage: 'granted' });
                    configureGA();
                } else {
                    gtag('consent', 'update', {
                        ad_storage: 'denied',
                        analytics_storage: 'denied',
                        ad_user_data: 'denied',
                        ad_personalization: 'denied'
                    });
                }
            }
            banner.classList.remove('open');
        }

        var saved = localStorage.getItem(CONSENT_KEY);
        if (saved === 'accepted') setConsent('accepted');
        else if (saved === 'rejected') setConsent('rejected');
        else banner.classList.add('open');

        var acceptBtn = document.getElementById('consentAccept');
        var rejectBtn = document.getElementById('consentReject');
        if (acceptBtn) acceptBtn.addEventListener('click', function () { setConsent('accepted'); });
        if (rejectBtn) rejectBtn.addEventListener('click', function () { setConsent('rejected'); });
    }

    // ── Outbound click tracking ──────────────────────────────────────────────
    function installOutboundTracker() {
        if (window.__tallfindOutboundInstalled) return;
        window.__tallfindOutboundInstalled = true;
        document.addEventListener('click', function (e) {
            var a = e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            var host;
            try { host = new URL(a.href, location.href).host; } catch (err) { return; }
            if (!host || host === location.host) return;
            var slug = a.dataset.storeSlug || null;
            var name = a.dataset.storeName
                || (a.dataset.store ? decodeURIComponent(a.dataset.store) : null);
            var network = a.dataset.affiliateNetwork || 'none';
            var source = (document.body && document.body.dataset.page) || 'static';
            window.trackEvent('outbound_click', {
                store_slug: slug,
                store_name: name,
                source_page: source,
                destination_domain: host,
                affiliate_network: network
            }, { beacon: true });
            if (name) {
                window.trackEvent('visit_store', { store_name: name, tab: source }, { beacon: true });
            }
        });
    }

    function init() {
        renderConsentBanner();
        installOutboundTracker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
