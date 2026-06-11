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
    /** Order work ids first (in this order); unlisted keep registry order
     *  after. Lets a host reorder without editing the registry — e.g. wire to
     *  an admin-editable array. */
    order?: string[];
    /** URL to fetch the live registry from at runtime (bundled copy is the
     *  fallback). Pass null to disable and use only the bundled registry. */
    registryUrl?: string | null;
    /** 'list' (default) stacks full-width rows; 'gallery' renders a
     *  horizontal snap-scroll row of compact upright cards. */
    layout?: 'list' | 'gallery';
}

export declare function MoreByKv(props: MoreByKvProps): React.JSX.Element | null;
export default MoreByKv;
