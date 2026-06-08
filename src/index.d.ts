import * as React from 'react';

export interface Work {
    id: string;
    url: string;
    icon: string;
    iconDark?: string;
    title: Record<string, string>;
    desc: Record<string, string>;
}

export declare const works: Work[];

export interface MoreByKvProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Work ids to hide — typically the current app's own id. */
    exclude?: string[];
    /** Language key into title/desc maps; falls back to 'en'. */
    lang?: string;
    /** 'dark' picks iconDark when available. */
    theme?: 'light' | 'dark';
    /** Override the section heading (defaults per lang). */
    heading?: string;
    /** Glass material class for each card (default 'glass-chip'). */
    cardClassName?: string;
    /** Rewrite each card's destination url (e.g. route via a URL shortener).
     *  Defaults to the registry url. */
    hrefTransform?: (work: Work) => string;
}

export declare function MoreByKv(props: MoreByKvProps): React.JSX.Element | null;
export default MoreByKv;
