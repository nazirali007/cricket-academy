import { Download, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const inputClass =
  "mt-1 h-11 w-full border border-navy/25 bg-white px-3 text-sm outline-none focus:border-ball focus:ring-1 focus:ring-ball";

const href = (path: string, params: Record<string, string>) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value && value !== "all"),
  ).toString();
  return query ? `${path}?${query}` : path;
};

// Quick date buttons plus a search form. A plain GET form, so the filters
// live in the URL: they survive a refresh and can be bookmarked or shared.
export function FilterBar({
  path,
  presets,
  when,
  keep,
  query,
  from,
  to,
  dateLabel,
  searchPlaceholder,
  exportPath,
  children,
}: {
  path: string;
  presets: Record<string, string>;
  when: string;
  // The other active filters, kept when a date button is pressed.
  keep: Record<string, string>;
  query: string;
  from: string;
  to: string;
  dateLabel: string;
  searchPlaceholder: string;
  exportPath: string;
  children?: ReactNode;
}) {
  const current = { ...keep, q: query, ...(when === "custom" ? { from, to } : { when }) };

  return (
    <div className="mt-6 space-y-4 bg-white p-4 md:p-5">
      <div className="flex flex-wrap gap-2" aria-label="Date">
        {Object.entries(presets).map(([key, label]) => {
          const active = key === when;
          return (
            <Link
              key={key}
              href={href(path, { ...keep, q: query, when: key })}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                active
                  ? "border-navy bg-navy text-white"
                  : "border-navy/20 hover:border-navy"
              }`}
            >
              {label}
            </Link>
          );
        })}
        {when === "custom" && (
          <span className="rounded-full border border-navy bg-navy px-4 py-2 text-sm font-bold text-white">
            Custom dates
          </span>
        )}
      </div>

      <form action={path} className="flex flex-wrap items-end gap-3">
        {when !== "custom" && <input type="hidden" name="when" value={when} />}
        <label className="min-w-0 grow-[2] basis-64 text-sm font-semibold">
          Search
          <span className="relative block">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={searchPlaceholder}
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>
        {children}
        <label className={fieldWrap}>
          {dateLabel} from
          <input type="date" name="from" defaultValue={when === "custom" ? from : ""} className={inputClass} />
        </label>
        <label className={fieldWrap}>
          to
          <input type="date" name="to" defaultValue={when === "custom" ? to : ""} className={inputClass} />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="h-11 bg-ball px-5 text-sm font-bold text-white">
            Apply
          </button>
          <Link href={path} className="grid h-11 place-items-center border border-navy/25 px-4 text-sm font-bold">
            Clear
          </Link>
        </div>
      </form>

      <a
        href={href(exportPath, current)}
        className="inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
      >
        <Download aria-hidden className="size-4" />
        Download this list (CSV for Excel or Google Sheets)
      </a>
    </div>
  );
}

export const selectClass = inputClass;
// Width rules for one filter field in the wrapping row.
export const fieldWrap = "min-w-0 grow basis-40 text-sm font-semibold";
