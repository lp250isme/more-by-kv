import React, { useState, useEffect } from 'react';
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
 * Pass `layout="gallery"` for a horizontal snap-scroll row of compact
 * upright cards (icon on top, clamped title/desc) instead of the default
 * stacked list — half a card peeks past the edge to hint at more. Hosts
 * that want edge-bleed can override `.lg-works__row` margins.
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
    if (list.length === 0) return null;
    // 容錯各種中文代碼：'zh-TW' / 'zh-Hant' / 'zh_CN' → 'zh'，其餘 fallback 'en'。
    // 先試 exact key（未來 registry 若加其他語言仍可直配），再試正規化值。
    const norm = String(lang).toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const pick = obj => obj[lang] ?? obj[norm] ?? obj.en;

    const gallery = layout === 'gallery';
    const cards = list.map(w => (
        <a
            key={w.id}
            className={`${cardClassName} lg-works__card${gallery ? ' lg-works__card--gallery' : ''}`}
            href={hrefTransform ? hrefTransform(w) : w.url}
            target="_blank"
            rel="noopener noreferrer"
        >
            <img
                className="lg-works__icon"
                src={theme === 'dark' && w.iconDark ? w.iconDark : w.icon}
                alt={pick(w.title)}
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
    ));

    return (
        <div
            className={`lg-works${gallery ? ' lg-works--gallery' : ''} ${className}`}
            {...props}
        >
            <p className="lg-works__heading">
                {heading ?? HEADINGS[lang] ?? HEADINGS[norm]}
            </p>
            {gallery ? <div className="lg-works__row">{cards}</div> : cards}
        </div>
    );
}

export { MoreByKv, works };
