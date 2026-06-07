import { describe, it, expect } from 'vitest';
import * as appNs from '../assets/app.js';

const app = appNs.default || appNs;
const { readURLState } = app;

// jsdom gives us a real window.location we can drive via history.replaceState.
function setUrl(path) {
    window.history.replaceState({}, '', path);
}

describe('readURLState', () => {
    it('returns home defaults for a bare path', () => {
        setUrl('/');
        const st = readURLState();
        expect(st.tab).toBe('home');
        expect(st.q).toBe('');
        expect(st.sort).toBe('tall');
        expect(st.ins).toBe(0);
        expect(st.ft).toEqual([]);
        expect(st.modal).toBeNull();
    });

    it('reads tab, query, and modal params', () => {
        setUrl('/?tab=men&q=jeans&modal=submit');
        const st = readURLState();
        expect(st.tab).toBe('men');
        expect(st.q).toBe('jeans');
        expect(st.modal).toBe('submit');
    });

    it('falls back to a valid sort when given an unknown one', () => {
        setUrl('/?tab=men&sort=az');
        expect(readURLState().sort).toBe('az');
        setUrl('/?tab=men&sort=bogus');
        expect(readURLState().sort).toBe('tall');
    });

    it('snaps inseam to an allowed value', () => {
        setUrl('/?tab=men&ins=38');
        expect(readURLState().ins).toBe(38);
        setUrl('/?tab=men&ins=37');
        expect(readURLState().ins).toBe(0);
        setUrl('/?tab=men&ins=999');
        expect(readURLState().ins).toBe(0);
    });

    it('keeps only known filter keys', () => {
        setUrl('/?tab=men&ft=hasTops,bogus,favorites');
        expect(readURLState().ft).toEqual(['hasTops', 'favorites']);
    });

    it('normalizes an unknown tab to home', () => {
        setUrl('/?tab=bogus');
        expect(readURLState().tab).toBe('home');
    });

    it('derives the tab from the hash when no tab param is present', () => {
        setUrl('/#men');
        expect(readURLState().tab).toBe('men');
    });
});
