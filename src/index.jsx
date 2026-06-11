import React, { useState, useEffect, useRef } from 'react';
import works from './works.json';

const HEADINGS = { en: 'More by kv', zh: 'kv 的其他作品' };

// 註冊表的線上單一真實來源。runtime 抓這個 → 編輯 works.json push 後,
// 各 app 下次載入自動跟上,免 bump SHA / 免重裝。bundled works 當即時 fallback。
const REGISTRY_URL =
    'https://cdn.jsdelivr.net/gh/lp250isme/more-by-kv@main/src/works.json';

/** 依 order(id 陣列)排序:列到的照給定順序在前,沒列到的維持註冊表原序接在後面。 */
function applyOrder(list, order) {
    if (!Array.isArray(order) || order.length === 0) return list;
    const rank = new Map(order.map((id, i) => [id, i]));
    return [...list].sort(
        (a, b) =>
            (rank.has(a.id) ? rank.get(a.id) : order.length + 1) -
            (rank.has(b.id) ? rank.get(b.id) : order.length + 1)
    );
}

/**
 * Cross-promo "More by kv" card list.
 *
 * The registry lives in works.json — update it once and every consuming app
 * follows on its next install/deploy. Static (no-build) apps can fetch the
 * same file at runtime:
 *   https://cdn.jsdelivr.net/gh/lp250isme/more-by-kv@main/src/works.json
 *
 * Pass `exclude` (array of work ids) to hide entries — typically the app
 * rendering the list excludes itself: <MoreByKv exclude={['gtc']} />.
 *
 * Pass `hrefTransform` (work => string) to rewrite each card's destination —
 * e.g. route clicks through a personal URL shortener for analytics:
 *   <MoreByKv hrefTransform={w => `https://go.kvcc.me/${w.id}`} />
 * Defaults to the registry url, so apps that omit it are unaffected.
 *
 * Pass `layout="gallery"` for a horizontal center-snap carousel of compact
 * upright cards (icon on top, clamped title/desc) instead of the default
 * stacked list — opens with the first card centered, neighbours peeking at
 * both edges. With 3+ works it wraps seamlessly (three rendered copies,
 * scroll re-centred while idle; clones are aria-hidden). Hosts that want
 * edge-bleed can override `.lg-works__row` margins; card width via
 * `--mbk-card-w`.
 *
 * Pass `autoAdvance={seconds}` (gallery only) to rotate one card at a
 * time on a timer, wrapping back to the start. It yields to the user:
 * paused while hovering, for 8s after any touch/wheel/press, while the
 * tab is hidden, and entirely under prefers-reduced-motion.
 *
 * Styling: import 'more-by-kv/styles.css' once. The structural classes use
 * the host app's `--lg-*` design tokens (liquid-glass-kit convention), and
 * the default card material is the host's `glass-chip` class — override via
 * `cardClassName` if your app uses different materials.
 */
export default function MoreByKv({
    exclude = [],
    lang = 'en',
    theme = 'light',
    heading,
    cardClassName = 'glass-chip',
    hrefTransform,
    order,
    layout = 'list',
    autoAdvance = 0,
    registryUrl = REGISTRY_URL,
    className = '',
    ...props
}) {
    // bundled works = 首屏/SSR 即時內容;掛載後抓線上註冊表覆蓋(失敗就維持 bundled)
    const [registry, setRegistry] = useState(works);
    useEffect(() => {
        if (!registryUrl) return;
        let alive = true;
        fetch(registryUrl)
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
                if (alive && Array.isArray(d) && d.length) setRegistry(d);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [registryUrl]);

    const list = applyOrder(
        registry.filter(w => !exclude.includes(w.id)),
        order
    );
    const gallery = layout === 'gallery';
    // Seamless wrap-around: render three copies, live in the middle one.
    // Opens with card #1 centered AND the last card peeking on the left —
    // no empty gutter. Clone copies are aria-hidden / untabbable.
    const loop = gallery && list.length >= 3;
    const n = list.length;

    const rowRef = useRef(null);

    /** Width of one full copy (card n's offset from card 0). */
    const copyWidth = el =>
        el.children[n] ? el.children[n].offsetLeft - el.children[0].offsetLeft : 0;

    // Start in the middle copy, and whenever scrolling settles outside it,
    // jump back by exactly one copy — identical pixels, so it's invisible.
    useEffect(() => {
        if (!loop) return;
        const el = rowRef.current;
        if (!el) return;
        const w = copyWidth(el);
        if (w > 0) el.scrollLeft = w;
        let t;
        const normalize = () => {
            const cw = copyWidth(el);
            if (cw <= 0) return;
            if (el.scrollLeft < cw * 0.5) el.scrollLeft += cw;
            else if (el.scrollLeft > cw * 1.5) el.scrollLeft -= cw;
        };
        const onScroll = () => {
            clearTimeout(t);
            t = setTimeout(normalize, 120); // after smooth/momentum settles
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            clearTimeout(t);
            el.removeEventListener('scroll', onScroll);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loop, n]);

    // Timed rotation (gallery only). Lives on the scroller so manual
    // swipes/momentum just work — we only nudge scrollLeft between them.
    // (Hooks stay above the empty-list early return.)
    useEffect(() => {
        if (!gallery || !autoAdvance) return;
        const el = rowRef.current;
        if (!el) return;
        if (
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        )
            return;
        let pausedUntil = 0;
        let hovering = false;
        const rest = () => {
            pausedUntil = Date.now() + 8000;
        };
        const enter = () => {
            hovering = true;
        };
        const leave = () => {
            hovering = false;
        };
        el.addEventListener('pointerdown', rest);
        el.addEventListener('wheel', rest, { passive: true });
        el.addEventListener('touchstart', rest, { passive: true });
        el.addEventListener('pointerenter', enter);
        el.addEventListener('pointerleave', leave);
        const id = setInterval(() => {
            if (hovering || Date.now() < pausedUntil || document.hidden) return;
            const max = el.scrollWidth - el.clientWidth;
            if (max <= 0) return; // everything fits — nothing to rotate
            const step =
                el.children.length > 1
                    ? el.children[1].offsetLeft - el.children[0].offsetLeft
                    : el.clientWidth;
            // Looping rows just keep going right (normalize re-centres);
            // finite rows wrap back to the start at the end.
            const next = loop
                ? el.scrollLeft + step
                : el.scrollLeft >= max - 4
                  ? 0
                  : Math.min(el.scrollLeft + step, max);
            el.scrollTo({ left: next, behavior: 'smooth' });
        }, autoAdvance * 1000);
        return () => {
            clearInterval(id);
            el.removeEventListener('pointerdown', rest);
            el.removeEventListener('wheel', rest);
            el.removeEventListener('touchstart', rest);
            el.removeEventListener('pointerenter', enter);
            el.removeEventListener('pointerleave', leave);
        };
    }, [gallery, autoAdvance, loop, list.length]);

    if (list.length === 0) return null;
    // 容錯各種中文代碼：'zh-TW' / 'zh-Hant' / 'zh_CN' → 'zh'，其餘 fallback 'en'。
    // 先試 exact key（未來 registry 若加其他語言仍可直配），再試正規化值。
    const norm = String(lang).toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const pick = obj => obj[lang] ?? obj[norm] ?? obj.en;

    const renderCard = (w, copy) => {
        const clone = copy !== 1; // only the middle copy is "real"
        return (
            <a
                key={`${copy}:${w.id}`}
                className={`${cardClassName} lg-works__card${gallery ? ' lg-works__card--gallery' : ''}`}
                href={hrefTransform ? hrefTransform(w) : w.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-hidden={clone || undefined}
                tabIndex={clone ? -1 : undefined}
            >
                <img
                    className="lg-works__icon"
                    src={theme === 'dark' && w.iconDark ? w.iconDark : w.icon}
                    alt={clone ? '' : pick(w.title)}
                    loading="lazy"
                    decoding="async"
                />
                <span className="lg-works__text">
                    <span className="lg-works__title">{pick(w.title)}</span>
                    <span className="lg-works__desc">{pick(w.desc)}</span>
                </span>
                <svg
                    className="lg-works__arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                </svg>
            </a>
        );
    };

    const cards = loop
        ? [0, 1, 2].flatMap(copy => list.map(w => renderCard(w, copy)))
        : list.map(w => renderCard(w, 1));

    return (
        <div
            className={`lg-works${gallery ? ' lg-works--gallery' : ''} ${className}`}
            {...props}
        >
            <p className="lg-works__heading">
                {heading ?? HEADINGS[lang] ?? HEADINGS[norm]}
            </p>
            {gallery ? (
                <div className="lg-works__row" ref={rowRef}>
                    {cards}
                </div>
            ) : (
                cards
            )}
        </div>
    );
}

export { MoreByKv, works };
