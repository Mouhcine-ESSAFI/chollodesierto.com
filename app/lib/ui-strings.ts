import {useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';

/**
 * Every visible string in the UI that is not part of a content list.
 *
 * Values live in Shopify as `ui_string` metaobjects, keyed by the strings
 * below. The English text passed at each call site is the fallback, so the site
 * still reads correctly if an entry is missing or the query fails.
 *
 * For a second-language store: run the migration scripts against it, then edit
 * the `ui_string` entries in that store's Admin. No code changes needed.
 */
export const UI_STRINGS_QUERY = `#graphql
  query SfUiStrings {
    metaobjects(type: "ui_string", first: 250) {
      nodes { fields { key value } }
    }
  }
`;

export type UiStrings = Record<string, string>;

export function mapUiStrings(data: unknown): UiStrings {
  const nodes: any[] = (data as any)?.metaobjects?.nodes ?? [];
  const out: UiStrings = {};
  for (const n of nodes) {
    const fields: Array<{key: string; value: string | null}> = n.fields ?? [];
    const key = fields.find((f) => f.key === 'key')?.value;
    const value = fields.find((f) => f.key === 'value')?.value;
    // A blank value means "not translated yet" — fall back rather than render nothing.
    if (key && value) out[key] = value;
  }
  return out;
}

/**
 * Fills `{name}` placeholders so a sentence with a number in it stays one
 * translatable string — "Rated {rating} out of 5" rather than three fragments
 * a translator can't reorder.
 */
function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    name in vars ? String(vars[name]) : whole,
  );
}

type Vars = Record<string, string | number>;

/** Looks a string up from the root loader, falling back to the English default. */
export function useT() {
  const root = useRouteLoaderData<RootLoader>('root');
  const strings = root?.uiStrings ?? {};
  return (key: string, fallback: string, vars?: Vars): string =>
    interpolate(strings[key] || fallback, vars);
}

/**
 * Non-hook variant, for code that already holds the dictionary (loaders, or
 * components that received it as a prop).
 */
export function translator(strings: UiStrings | undefined) {
  return (key: string, fallback: string, vars?: Vars): string =>
    interpolate(strings?.[key] || fallback, vars);
}

/** Long month names, shared by the journal and anything else printing a date. */
const MONTH_KEYS = [
  ['cal.january', 'January'],
  ['cal.february', 'February'],
  ['cal.march', 'March'],
  ['cal.april', 'April'],
  ['cal.may', 'May'],
  ['cal.june', 'June'],
  ['cal.july', 'July'],
  ['cal.august', 'August'],
  ['cal.september', 'September'],
  ['cal.october', 'October'],
  ['cal.november', 'November'],
  ['cal.december', 'December'],
] as const;

/**
 * Formats an article's date from ui_strings, so the month name and the order of
 * the parts both follow the store's language. Returns '' when there's no date.
 */
export function useArticleDate() {
  const t = useT();
  return (parts: {day: number; monthIndex: number; year: number} | null): string => {
    if (!parts) return '';
    const [key, en] = MONTH_KEYS[parts.monthIndex] ?? MONTH_KEYS[0];
    return t('blog.date_format', '{day} {month} {year}', {
      day: parts.day,
      month: t(key, en),
      year: parts.year,
    });
  };
}

/** Abbreviated month names, for the compact card dates on the journal. */
const SHORT_MONTH_KEYS = [
  ['cal.short_jan', 'Jan'],
  ['cal.short_feb', 'Feb'],
  ['cal.short_mar', 'Mar'],
  ['cal.short_apr', 'Apr'],
  ['cal.short_may', 'May'],
  ['cal.short_jun', 'Jun'],
  ['cal.short_jul', 'Jul'],
  ['cal.short_aug', 'Aug'],
  ['cal.short_sep', 'Sep'],
  ['cal.short_oct', 'Oct'],
  ['cal.short_nov', 'Nov'],
  ['cal.short_dec', 'Dec'],
] as const;

/** "Jan 12, 2026" — the compact form used on journal cards. */
export function useArticleDateShort() {
  const t = useT();
  return (parts: {day: number; monthIndex: number; year: number} | null): string => {
    if (!parts) return '';
    const [key, en] = SHORT_MONTH_KEYS[parts.monthIndex] ?? SHORT_MONTH_KEYS[0];
    return t('blog.date_short', '{month} {day}, {year}', {
      day: parts.day,
      month: t(key, en),
      year: parts.year,
    });
  };
}

/**
 * Translator for a route's `meta()` export.
 *
 * `meta` is a plain function, not a component, so it can't call useT(). It does
 * receive `matches`, which carries every ancestor route's loader data — and the
 * root loader already fetched the dictionary, so page titles translate without
 * a second query per route.
 */
export function metaT(matches: unknown) {
  const list = (matches as Array<{id?: string; data?: unknown}>) ?? [];
  const root = list.find((m) => m?.id === 'root')?.data as
    | {uiStrings?: UiStrings}
    | undefined;
  return translator(root?.uiStrings);
}
