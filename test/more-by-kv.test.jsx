/**
 * MoreByKv 的行為測試。
 * registryUrl={null} 停用線上註冊表，只斷言套件內的 works.json，測試不會打到網路。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import MoreByKvDefault, { MoreByKv, works as exportedWorks } from '../src/index.jsx';
import works from '../src/works.json';

function render(props = {}) {
    return renderToStaticMarkup(<MoreByKv registryUrl={null} {...props} />);
}

function decode(text) {
    if (text == null) return null;
    return text
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#x27;', "'")
        .replaceAll('&#39;', "'");
}

function attr(source, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = source.match(new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`));
    return match ? decode(match[1]) : null;
}

function cardsOf(html) {
    const cards = [];
    for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
        const attrs = match[1];
        const body = match[2];
        const img = body.match(/<img\b([^>]*)\/?>/);
        const imgAttrs = img ? img[1] : '';
        cards.push({
            href: attr(attrs, 'href'),
            className: attr(attrs, 'class'),
            ariaHidden: attr(attrs, 'aria-hidden'),
            tabIndex: attr(attrs, 'tabindex'),
            target: attr(attrs, 'target'),
            rel: attr(attrs, 'rel'),
            icon: attr(imgAttrs, 'src'),
            alt: attr(imgAttrs, 'alt'),
            title: decode(body.match(/lg-works__title">([^<]*)</)?.[1] ?? null),
            desc: decode(body.match(/lg-works__desc">([^<]*)</)?.[1] ?? null),
        });
    }
    return cards;
}

function headingOf(html) {
    return decode(html.match(/lg-works__heading">([^<]*)</)?.[1] ?? null);
}

function rootClass(html) {
    const match = html.match(/<div\b([^>]*)>/);
    assert.ok(match, 'expected a root element');
    return attr(match[1], 'class').split(/\s+/).filter(Boolean);
}

function idForHref(href) {
    return works.find(work => work.url === href)?.id ?? null;
}

function idsOf(html) {
    return cardsOf(html).map(card => {
        const id = idForHref(card.href);
        assert.ok(id, `expected href to match a registry url, got ${card.href}`);
        return id;
    });
}

/** 指定 id 排前面（略過不存在的），其餘維持原序。 */
function expectedIds(list, order) {
    const listed = [];
    for (const id of order) {
        const work = list.find(item => item.id === id);
        if (work && !listed.includes(work)) listed.push(work);
    }
    const listedIds = new Set(listed.map(work => work.id));
    const rest = list.filter(work => !listedIds.has(work.id));
    return [...listed, ...rest].map(work => work.id);
}

describe('MoreByKv', () => {
    it('exports the component and the bundled registry', () => {
        assert.equal(MoreByKvDefault, MoreByKv);
        assert.deepEqual(exportedWorks, works);
        assert.ok(Array.isArray(works));
        assert.ok(works.length > 0);
    });

    it('requires each registry entry to have the fields a card renders', () => {
        const ids = new Set();
        const urls = new Set();
        for (const work of works) {
            assert.equal(typeof work.id, 'string');
            assert.ok(work.id.length > 0);
            assert.equal(ids.has(work.id), false, `duplicate id ${work.id}`);
            ids.add(work.id);

            assert.equal(typeof work.url, 'string');
            assert.ok(work.url.startsWith('https://'), work.id);
            assert.equal(urls.has(work.url), false, `duplicate url ${work.url}`);
            urls.add(work.url);

            assert.equal(typeof work.icon, 'string');
            assert.ok(work.icon.length > 0, work.id);
            if (work.iconDark !== undefined) {
                assert.equal(typeof work.iconDark, 'string');
                assert.ok(work.iconDark.length > 0, work.id);
            }

            for (const field of ['title', 'desc']) {
                assert.equal(typeof work[field].en, 'string', `${work.id}.${field}.en`);
                assert.equal(typeof work[field].zh, 'string', `${work.id}.${field}.zh`);
                assert.ok(work[field].en.length > 0, `${work.id}.${field}.en`);
                assert.ok(work[field].zh.length > 0, `${work.id}.${field}.zh`);
            }
        }
    });

    it('renders bundled works in registry order with English copy', () => {
        const html = render();
        const cards = cardsOf(html);

        assert.deepEqual(rootClass(html), ['lg-works']);
        assert.equal(headingOf(html), 'More by kv');
        assert.equal(html.includes('lg-works__row'), false);
        assert.equal(html.includes('lg-works--gallery'), false);
        assert.equal(cards.length, works.length);

        cards.forEach((card, index) => {
            const work = works[index];
            assert.equal(card.href, work.url);
            assert.equal(card.title, work.title.en);
            assert.equal(card.desc, work.desc.en);
            assert.equal(card.alt, work.title.en);
            assert.equal(card.icon, work.icon);
            assert.equal(card.target, '_blank');
            assert.equal(card.rel, 'noopener noreferrer');
            assert.equal(card.ariaHidden, null);
            assert.equal(card.tabIndex, null);
            assert.deepEqual(card.className.split(/\s+/), ['glass-chip', 'lg-works__card']);
        });
    });

    it('hides excluded ids and renders nothing when every work is excluded', () => {
        const hidden = works.slice(0, 2).map(work => work.id);
        assert.deepEqual(
            idsOf(render({ exclude: hidden })),
            works.map(work => work.id).filter(id => !hidden.includes(id))
        );

        // 只比對完整 id，前綴不能誤傷其他作品。
        assert.deepEqual(
            idsOf(render({ exclude: ['gt'] })),
            works.map(work => work.id)
        );

        assert.equal(
            render({ exclude: works.map(work => work.id) }),
            ''
        );
    });

    it('resolves zh language codes and falls back to English', () => {
        for (const lang of ['zh', 'zh-TW', 'zh-Hant', 'zh_CN']) {
            const html = render({ lang });
            assert.equal(headingOf(html), 'kv 的其他作品', lang);
            cardsOf(html).forEach((card, index) => {
                assert.equal(card.title, works[index].title.zh, lang);
                assert.equal(card.desc, works[index].desc.zh, lang);
                assert.equal(card.alt, works[index].title.zh, lang);
            });
        }

        for (const lang of ['en', 'en-US', 'ja']) {
            const html = render({ lang });
            assert.equal(headingOf(html), 'More by kv', lang);
            const card = cardsOf(html)[0];
            assert.equal(card.title, works[0].title.en, lang);
            assert.equal(card.desc, works[0].desc.en, lang);
        }
    });

    it('uses a custom heading without changing card copy', () => {
        const html = render({ lang: 'zh', heading: '其他作品' });
        assert.equal(headingOf(html), '其他作品');
        assert.equal(cardsOf(html)[0].title, works[0].title.zh);
        assert.equal(cardsOf(html)[0].desc, works[0].desc.zh);
    });

    it('picks iconDark only for dark theme when the work has one', () => {
        assert.ok(works.some(work => work.iconDark));
        assert.ok(works.some(work => !work.iconDark));

        cardsOf(render({ theme: 'dark' })).forEach((card, index) => {
            const work = works[index];
            assert.equal(card.icon, work.iconDark || work.icon, work.id);
        });

        cardsOf(render({ theme: 'light' })).forEach((card, index) => {
            assert.equal(card.icon, works[index].icon, works[index].id);
        });
    });

    it('applies exclude before order, then sorts known ids first', () => {
        const exclude = ['zky'];
        const order = ['ip', 'missing', 'gtc'];
        const remaining = works.filter(work => !exclude.includes(work.id));

        const ids = idsOf(render({ exclude, order }));
        assert.deepEqual(ids, expectedIds(remaining, order));
        // 點名的 id 在前，且排除掉的作品不會因為出現在 order 裡而回來。
        assert.deepEqual(ids.slice(0, 2), ['ip', 'gtc']);
        assert.equal(ids.includes('zky'), false);
        assert.equal(ids.includes('missing'), false);
    });

    it('leaves registry order alone when order is empty or not a list', () => {
        const ids = works.map(work => work.id);
        assert.deepEqual(idsOf(render({ order: [] })), ids);
        assert.deepEqual(idsOf(render({ order: 'ip' })), ids);
    });

    it('rewrites hrefs with hrefTransform and otherwise uses the registry url', () => {
        const transformed = cardsOf(render({
            hrefTransform: work => `https://go.example/${work.id}?from=more`,
        }));
        assert.deepEqual(
            transformed.map(card => card.href),
            works.map(work => `https://go.example/${work.id}?from=more`)
        );
        assert.deepEqual(
            transformed.map(card => card.title),
            works.map(work => work.title.en)
        );

        assert.deepEqual(
            cardsOf(render()).map(card => card.href),
            works.map(work => work.url)
        );
    });

    it('loops gallery clones only when at least three works remain', () => {
        assert.ok(works.length >= 3, 'gallery loop needs a registry of at least 3 works');
        const ids = works.map(work => work.id);
        const three = ids.slice(0, 3);
        const two = ids.slice(0, 2);

        const gallery3 = render({
            layout: 'gallery',
            exclude: ids.filter(id => !three.includes(id)),
        });
        assert.deepEqual(rootClass(gallery3), ['lg-works', 'lg-works--gallery']);
        assert.equal(gallery3.includes('lg-works__row'), true);

        const looped = cardsOf(gallery3);
        assert.equal(looped.length, three.length * 3);
        assert.deepEqual(
            looped.map(card => idForHref(card.href)),
            [...three, ...three, ...three]
        );
        looped.forEach((card, index) => {
            const copy = Math.floor(index / three.length);
            const clone = copy !== 1;
            const work = works.find(item => item.id === three[index % three.length]);
            assert.equal(card.ariaHidden, clone ? 'true' : null);
            assert.equal(card.tabIndex, clone ? '-1' : null);
            assert.equal(card.alt, clone ? '' : work.title.en);
            assert.ok(card.className.split(/\s+/).includes('lg-works__card--gallery'));
        });

        const gallery2 = render({
            layout: 'gallery',
            exclude: ids.filter(id => !two.includes(id)),
        });
        const short = cardsOf(gallery2);
        assert.equal(gallery2.includes('lg-works__row'), true);
        assert.equal(short.length, two.length);
        assert.deepEqual(short.map(card => idForHref(card.href)), two);
        short.forEach(card => {
            assert.equal(card.ariaHidden, null);
            assert.equal(card.tabIndex, null);
            assert.equal(card.alt.length > 0, true);
        });

        const list = render({ layout: 'list' });
        assert.equal(list.includes('lg-works__row'), false);
        assert.equal(list.includes('lg-works--gallery'), false);
        assert.equal(
            cardsOf(list).some(card => card.className.includes('lg-works__card--gallery')),
            false
        );
    });

    it('passes class names and extra DOM attributes through', () => {
        const html = render({
            className: 'host',
            cardClassName: 'glass-panel',
            id: 'promo',
            'data-region': 'footer',
        });
        const root = html.match(/<div\b([^>]*)>/);
        assert.deepEqual(rootClass(html), ['lg-works', 'host']);
        assert.equal(attr(root[1], 'id'), 'promo');
        assert.equal(attr(root[1], 'data-region'), 'footer');
        for (const card of cardsOf(html)) {
            const classes = card.className.split(/\s+/);
            assert.ok(classes.includes('glass-panel'));
            assert.ok(classes.includes('lg-works__card'));
            assert.equal(classes.includes('glass-chip'), false);
        }
    });
});
