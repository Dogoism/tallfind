import { describe, it, expect } from 'vitest';
import * as appNs from '../assets/app.js';

const app = appNs.default || appNs;
const {
    escapeHtml,
    safeUrl,
    _skip,
    normalizeTab,
    nameSort,
    sortFlatInseamMen,
    matchesSearch,
    generateDesc,
} = app;

describe('escapeHtml', () => {
    it('escapes all five HTML-sensitive characters', () => {
        expect(escapeHtml('<a href="x">&\'')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
    });

    it('coerces null/undefined to an empty string', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('coerces non-string values', () => {
        expect(escapeHtml(42)).toBe('42');
    });
});

describe('safeUrl', () => {
    it('passes through http(s) URLs', () => {
        expect(safeUrl('https://example.com/path')).toContain('https://example.com/path');
        expect(safeUrl('http://example.com/p')).toContain('http://example.com/p');
    });

    it('rejects javascript: and data: URLs (XSS surface)', () => {
        expect(safeUrl('javascript:alert(1)')).toBe('');
        expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('returns empty string for malformed or empty input', () => {
        expect(safeUrl('not a url')).toBe('');
        expect(safeUrl('')).toBe('');
        expect(safeUrl(null)).toBe('');
    });
});

describe('_skip', () => {
    it('treats sentinel and falsy values as skippable', () => {
        for (const v of ['', null, undefined, 'N/A', 'None', 'Varies', 'Shorts only', 'Not listed', 'Not specified']) {
            expect(_skip(v)).toBeTruthy();
        }
    });

    it('treats real values as non-skippable', () => {
        expect(_skip('40"')).toBeFalsy();
        expect(_skip('Tall - M-3XL')).toBeFalsy();
    });
});

describe('normalizeTab', () => {
    it('passes through known tabs', () => {
        expect(normalizeTab('men')).toBe('men');
        expect(normalizeTab('women')).toBe('women');
        expect(normalizeTab('home')).toBe('home');
    });

    it('falls back to home for anything else', () => {
        expect(normalizeTab('bogus')).toBe('home');
        expect(normalizeTab('')).toBe('home');
        expect(normalizeTab(undefined)).toBe('home');
    });
});

describe('nameSort', () => {
    it('sorts by name without mutating the input', () => {
        const input = [{ name: 'Cherry' }, { name: 'Apple' }, { name: 'Banana' }];
        const sorted = nameSort(input);
        expect(sorted.map(s => s.name)).toEqual(['Apple', 'Banana', 'Cherry']);
        expect(input.map(s => s.name)).toEqual(['Cherry', 'Apple', 'Banana']);
    });
});

describe('sortFlatInseamMen', () => {
    it('sorts by inseam descending with null last', () => {
        const input = [
            { name: 'A', inseam: 34 },
            { name: 'B', inseam: 40 },
            { name: 'C', inseam: null },
        ];
        expect(sortFlatInseamMen(input).map(s => s.name)).toEqual(['B', 'A', 'C']);
    });

    it('breaks inseam ties by name', () => {
        const input = [
            { name: 'Zed', inseam: 40 },
            { name: 'Abe', inseam: 40 },
        ];
        expect(sortFlatInseamMen(input).map(s => s.name)).toEqual(['Abe', 'Zed']);
    });
});

describe('matchesSearch', () => {
    const man = {
        name: 'Amalli Talli',
        domain: 'amalli.com',
        notes: '',
        topSizes: 'Tall',
        tallSpecific: true,
        hasTops: true,
        hasBottoms: true,
        inseamD: '40"',
        waist: '30"',
    };

    it('matches everything for an empty query', () => {
        expect(matchesSearch(man, '', true)).toBe(true);
    });

    it('matches across name and men-specific fields', () => {
        expect(matchesSearch(man, 'amalli', true)).toBe(true);
        expect(matchesSearch(man, '40', true)).toBe(true);
        expect(matchesSearch(man, 'zzz', true)).toBe(false);
    });

    it('requires every term to match (AND semantics)', () => {
        expect(matchesSearch(man, 'amalli tall', true)).toBe(true);
        expect(matchesSearch(man, 'amalli mainstream', true)).toBe(false);
    });

    it('searches women bottomSizes when not in men mode', () => {
        const woman = { name: 'X', domain: 'x.com', topSizes: '', bottomSizes: 'Long 16', tallSpecific: false, hasTops: false, hasBottoms: true };
        expect(matchesSearch(woman, 'long', false)).toBe(true);
    });
});

describe('generateDesc', () => {
    it('uses notes verbatim when present', () => {
        expect(generateDesc({ notes: 'Custom blurb' }, true)).toBe('Custom blurb');
    });

    it('describes tall-specific men by inseam tier', () => {
        const base = { tallSpecific: true, hasTops: true, hasBottoms: true, inseamD: '40"' };
        expect(generateDesc({ ...base, inseam: 40 }, true)).toContain('Purpose-built for tall men');
        expect(generateDesc({ ...base, inseam: 38, inseamD: '38"' }, true)).toContain('Inseams reach 38"');
        expect(generateDesc({ ...base, inseam: 34, inseamD: '34"' }, true)).toContain('both tops and bottoms designed around taller frames');
    });

    it('describes mainstream men with a tall section', () => {
        const s = { tallSpecific: false, hasTops: true, hasBottoms: true, inseam: 38, inseamD: '38"' };
        expect(generateDesc(s, true)).toContain('Solid mainstream option');
    });

    it('describes tall-specific women', () => {
        const s = { tallSpecific: true, hasTops: true, hasBottoms: true };
        expect(generateDesc(s, false)).toContain('cut for taller proportions');
    });
});
