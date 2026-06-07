import { describe, it, expect, beforeAll } from 'vitest';

// affiliate.js fetches data/affiliates.json at load and attaches its API to
// window.Tallfind.affiliates. We stub fetch with a known config, then import.
const CONFIG = {
    'amazon-store': { network: 'amazon', id: 'tag-20' },
    'param-store': { network: 'impact', params: { irclickid: 'abc', extra: 'x' } },
};

let affiliates;

beforeAll(async () => {
    global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(CONFIG) });
    await import('../assets/affiliate.js');
    affiliates = window.Tallfind.affiliates;
    await affiliates.ready;
});

describe('slugFor', () => {
    it('slugifies names, turning & into "and"', () => {
        expect(affiliates.slugFor({ name: 'Foo & Bar' })).toBe('foo-and-bar');
    });

    it('strips special characters and trims dashes', () => {
        expect(affiliates.slugFor({ name: '  Wild!! Chars  ' })).toBe('wild-chars');
    });

    it('honors an explicit slug', () => {
        expect(affiliates.slugFor({ name: 'Foo', slug: 'custom' })).toBe('custom');
    });

    it('returns null without a name or store', () => {
        expect(affiliates.slugFor({ name: '' })).toBeNull();
        expect(affiliates.slugFor(null)).toBeNull();
    });
});

describe('affiliateUrl', () => {
    it('injects the Amazon tag', () => {
        const url = affiliates.affiliateUrl({ name: 'Amazon Store', slug: 'amazon-store', url: 'https://example.com/p' });
        expect(url).toContain('tag=tag-20');
    });

    it('appends custom params', () => {
        const url = affiliates.affiliateUrl({ name: 'Param Store', slug: 'param-store', url: 'https://example.com/' });
        expect(url).toContain('irclickid=abc');
        expect(url).toContain('extra=x');
    });

    it('passes the URL through unchanged when there is no config (revenue safety)', () => {
        const raw = 'https://nostore.com/path?a=1';
        expect(affiliates.affiliateUrl({ name: 'Unknown', slug: 'unknown', url: raw })).toBe(raw);
    });

    it('passes through an invalid URL unchanged even with config', () => {
        const raw = 'not a url';
        expect(affiliates.affiliateUrl({ name: 'Amazon Store', slug: 'amazon-store', url: raw })).toBe(raw);
    });

    it('returns null for a store without a url', () => {
        expect(affiliates.affiliateUrl({ name: 'X', slug: 'amazon-store' })).toBeNull();
        expect(affiliates.affiliateUrl(null)).toBeNull();
    });
});

describe('networkFor', () => {
    it('returns the configured network', () => {
        expect(affiliates.networkFor({ slug: 'amazon-store', name: 'Amazon Store' })).toBe('amazon');
    });

    it('defaults to "none" when unconfigured', () => {
        expect(affiliates.networkFor({ slug: 'unknown', name: 'Unknown' })).toBe('none');
    });
});
