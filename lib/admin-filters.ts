import {
  admissionStatuses,
  isAdmissionStatus,
  type AdmissionSearch,
} from "./admissions";
import { addDays, isValidDate } from "./booking";
import { programs } from "./content";
import { bookingViews, type BookingSearch, type BookingView, type DateRange } from "./db";

// Turns the admin pages' URL query (?when=today&q=…) into database searches.
// The CSV exports read the same query, so a download matches the screen.

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: Params, key: string) {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function monthOf(today: string): DateRange {
  const [year, month] = today.split("-").map(Number);
  const first = `${today.slice(0, 7)}-01`;
  const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { from: first, to: addDays(next, -1) };
}

// A typed from/to pair. Either end may be left empty; reversed ends swap.
function customRange(params: Params): DateRange | null {
  let from = get(params, "from");
  let to = get(params, "to");
  if (!isValidDate(from)) from = "";
  if (!isValidDate(to)) to = "";
  if (!from && !to) return null;
  from ||= "2000-01-01";
  to ||= "2999-12-31";
  return from <= to ? { from, to } : { from: to, to: from };
}

// ── Bookings ──────────────────────────────────────────────────────────────

export const bookingPresets = {
  all: "All dates",
  today: "Today's matches",
  tomorrow: "Tomorrow",
  week: "Next 7 days",
  month: "This month",
  upcoming: "All upcoming",
  "booked-today": "Booked today",
} as const;
export type BookingPreset = keyof typeof bookingPresets | "custom";

export function parseBookingFilters(params: Params, today: string) {
  const viewParam = get(params, "view");
  const view: BookingView = Object.hasOwn(bookingViews, viewParam)
    ? (viewParam as BookingView)
    : "active";
  const query = get(params, "q").slice(0, 80);
  const custom = customRange(params);
  const whenParam = get(params, "when");
  const when: BookingPreset = custom
    ? "custom"
    : Object.hasOwn(bookingPresets, whenParam)
      ? (whenParam as BookingPreset)
      : "all";

  const match = (from: string, to: string) => ({ from, to, on: "match" as const });
  const range: BookingSearch["range"] =
    when === "custom" ? { ...custom!, on: "match" }
    : when === "today" ? match(today, today)
    : when === "tomorrow" ? match(addDays(today, 1), addDays(today, 1))
    : when === "week" ? match(today, addDays(today, 6))
    : when === "month" ? { ...monthOf(today), on: "match" }
    : when === "upcoming" ? match(today, "2999-12-31")
    : when === "booked-today" ? { from: today, to: today, on: "booked" }
    : null;

  return {
    search: { view, range, query } satisfies BookingSearch,
    when,
    view,
    query,
    from: get(params, "from"),
    to: get(params, "to"),
  };
}

// ── Admissions ────────────────────────────────────────────────────────────

export const admissionPresets = {
  all: "All time",
  today: "Today",
  week: "Last 7 days",
  month: "This month",
} as const;
export type AdmissionPreset = keyof typeof admissionPresets | "custom";

export function parseAdmissionFilters(params: Params, today: string) {
  const statusParam = get(params, "status");
  const status: AdmissionSearch["status"] = isAdmissionStatus(statusParam)
    ? statusParam
    : "all";
  const programParam = get(params, "program");
  const program = programs.some((p) => p.title === programParam) ? programParam : "";
  const query = get(params, "q").slice(0, 80);
  const custom = customRange(params);
  const whenParam = get(params, "when");
  const when: AdmissionPreset = custom
    ? "custom"
    : Object.hasOwn(admissionPresets, whenParam)
      ? (whenParam as AdmissionPreset)
      : "all";

  const range: DateRange | null =
    when === "custom" ? custom
    : when === "today" ? { from: today, to: today }
    : when === "week" ? { from: addDays(today, -6), to: today }
    : when === "month" ? monthOf(today)
    : null;

  return {
    search: { status, program, range, query } satisfies AdmissionSearch,
    when,
    status,
    program,
    query,
    from: get(params, "from"),
    to: get(params, "to"),
  };
}

export const admissionStatusOptions = Object.entries(admissionStatuses) as [
  keyof typeof admissionStatuses,
  string,
][];
