import React from 'react';
import works from './works.json';

const HEADINGS = { en: 'More by kv', zh: 'kv 的其他作品' };

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
    className = '',
    ...props
}) {
    const list = works.filter(w => !exclude.includes(w.id));
    if (list.length === 0) return null;
    // 容錯各種中文代碼：'zh-TW' / 'zh-Hant' / 'zh_CN' → 'zh'，其餘 fallback 'en'。
    // 先試 exact key（未來 registry 若加其他語言仍可直配），再試正規化值。
    const norm = String(lang).toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const pick = obj => obj[lang] ?? obj[norm] ?? obj.en;

    return (
        <div className={`lg-works ${className}`} {...props}>
            <p className="lg-works__heading">
                {heading ?? HEADINGS[lang] ?? HEADINGS[norm]}
            </p>
            {list.map(w => (
                <a
                    key={w.id}
                    className={`${cardClassName} lg-works__card`}
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
            ))}
        </div>
    );
}

export { MoreByKv, works };
