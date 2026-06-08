import { describe, it, expect, beforeEach, vi } from 'vitest';

// analytics.js is an IIFE that runs on import: it sets window.trackEvent,
// renders the consent banner, and installs the outbound tracker. We reset the
// module registry and the window-level guards before each load so every test
// gets a fresh instance.
async function loadAnalytics() {
    vi.resetModules();
    delete window.__tallfindOutboundInstalled;
    window.trackEvent = undefined;
    await import('../assets/analytics.js');
}

beforeEach(() => {
    document.body.innerHTML = '';
    document.body.removeAttribute('data-page');
    localStorage.clear();
    globalThis.gtag = vi.fn();
});

describe('trackEvent (consent gating)', () => {
    it('does nothing without accepted consent', async () => {
        await loadAnalytics();
        window.trackEvent('demo', { a: 1 });
        expect(globalThis.gtag).not.toHaveBeenCalledWith('event', 'demo', expect.anything());
    });

    it('emits a GA4 event once consent is accepted', async () => {
        localStorage.setItem('tallfind_analytics_consent', 'accepted');
        await loadAnalytics();
        globalThis.gtag.mockClear();
        window.trackEvent('demo', { a: 1 });
        expect(globalThis.gtag).toHaveBeenCalledWith('event', 'demo', { a: 1 });
    });

    it('adds beacon transport when requested', async () => {
        localStorage.setItem('tallfind_analytics_consent', 'accepted');
        await loadAnalytics();
        globalThis.gtag.mockClear();
        window.trackEvent('demo', { a: 1 }, { beacon: true });
        expect(globalThis.gtag).toHaveBeenCalledWith('event', 'demo', { a: 1, transport_type: 'beacon' });
    });
});

describe('consent banner', () => {
    it('renders an open banner when no choice is stored', async () => {
        await loadAnalytics();
        const banner = document.getElementById('consentBanner');
        expect(banner).not.toBeNull();
        expect(banner.classList.contains('open')).toBe(true);
    });

    it('grants and configures GA on accept', async () => {
        await loadAnalytics();
        document.getElementById('consentAccept').click();
        expect(localStorage.getItem('tallfind_analytics_consent')).toBe('accepted');
        expect(globalThis.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'granted' });
        expect(globalThis.gtag).toHaveBeenCalledWith('config', 'G-98C0R7CN01');
        expect(document.getElementById('consentBanner').classList.contains('open')).toBe(false);
    });

    it('denies storage on reject', async () => {
        await loadAnalytics();
        document.getElementById('consentReject').click();
        expect(localStorage.getItem('tallfind_analytics_consent')).toBe('rejected');
        expect(globalThis.gtag).toHaveBeenCalledWith(
            'consent',
            'update',
            expect.objectContaining({ analytics_storage: 'denied' }),
        );
    });

    it('reuses an existing banner element from the page (SPA markup)', async () => {
        document.body.innerHTML =
            '<div id="consentBanner" class="consent-banner">'
            + '<button id="consentAccept"></button><button id="consentReject"></button>'
            + '</div>';
        await loadAnalytics();
        expect(document.querySelectorAll('#consentBanner').length).toBe(1);
    });

    it('honors a previously accepted choice without showing the banner', async () => {
        localStorage.setItem('tallfind_analytics_consent', 'accepted');
        await loadAnalytics();
        expect(document.getElementById('consentBanner').classList.contains('open')).toBe(false);
        expect(globalThis.gtag).toHaveBeenCalledWith('config', 'G-98C0R7CN01');
    });
});

describe('outbound tracker', () => {
    function clickLink(html) {
        document.body.insertAdjacentHTML('beforeend', html);
        const a = document.body.querySelector('a');
        // Stop jsdom from attempting real navigation (the tracker doesn't).
        a.addEventListener('click', e => e.preventDefault());
        a.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
        return a;
    }

    it('emits outbound_click and visit_store for a cross-host link', async () => {
        localStorage.setItem('tallfind_analytics_consent', 'accepted');
        await loadAnalytics();
        globalThis.gtag.mockClear();
        clickLink('<a href="https://external-store.com/p" data-store-name="Foo">Foo</a>');
        const events = globalThis.gtag.mock.calls.filter(c => c[0] === 'event').map(c => c[1]);
        expect(events).toContain('outbound_click');
        expect(events).toContain('visit_store');
    });

    it('ignores same-host links', async () => {
        localStorage.setItem('tallfind_analytics_consent', 'accepted');
        await loadAnalytics();
        globalThis.gtag.mockClear();
        clickLink(`<a href="${location.origin}/about/">About</a>`);
        const events = globalThis.gtag.mock.calls.filter(c => c[0] === 'event');
        expect(events).toHaveLength(0);
    });

    it('installs the document listener only once', async () => {
        const spy = vi.spyOn(document, 'addEventListener');
        await loadAnalytics();
        await import('../assets/analytics.js'); // second import, guard should bail
        const clickListeners = spy.mock.calls.filter(c => c[0] === 'click');
        expect(clickListeners).toHaveLength(1);
        spy.mockRestore();
    });
});
