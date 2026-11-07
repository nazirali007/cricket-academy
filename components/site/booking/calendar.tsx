"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/booking";

export type SlotState = "available" | "booked" | "closed" | "selected";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const bar: Record<SlotState, string> = {
  available: "bg-emerald-400",
  booked: "bg-red-500",
  closed: "bg-white/25",
  selected: "bg-gold",
};

function shiftMonth(month: string, by: number) {
  const [year, m] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, m - 1 + by, 1));
  return next.toISOString().slice(0, 7);
}

export function MonthCalendar({
  month,
  onMonthChange,
  today,
  maxDate,
  selectedDate,
  onSelectDate,
  statesFor,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  today: string;
  maxDate: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  statesFor: (date: string) => SlotState[];
}) {
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const leadingBlanks = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const canGoBack = month > today.slice(0, 7);
  const canGoForward = month < maxDate.slice(0, 7);

  return (
    <div className="border border-white/15 bg-navy/60 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="grid size-11 place-items-center border border-white/20 transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <h4 aria-live="polite" className="font-display text-3xl font-bold uppercase">
          {formatDate(`${month}-01`, { month: "long", year: "numeric" })}
        </h4>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          disabled={!canGoForward}
          aria-label="Next month"
          className="grid size-11 place-items-center border border-white/20 transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            aria-hidden
            className={`pb-1 text-[11px] font-bold uppercase ${
              day === "Sat" || day === "Sun" ? "text-gold" : "text-white/60"
            }`}
          >
            {day}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const inWindow = date >= today && date <= maxDate;
          const states = inWindow ? statesFor(date) : [];
          const free = states.filter(
            (s) => s === "available" || s === "selected",
          ).length;
          const anyBooked = states.includes("booked");
          const isSelected = date === selectedDate;

          if (!inWindow) {
            return (
              <div
                key={date}
                aria-hidden
                className="grid aspect-square place-items-center text-sm text-white/25"
              >
                {i + 1}
              </div>
            );
          }

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-pressed={isSelected}
              aria-label={`${formatDate(date)}: ${
                free === 0
                  ? anyBooked
                    ? "fully booked"
                    : "no slots left"
                  : `${free} of ${states.length} slots available`
              }`}
              className={`flex aspect-square flex-col items-center justify-center gap-1 border text-sm font-bold transition-colors ${
                isSelected
                  ? "border-white bg-white text-navy"
                  : free === 0
                    ? anyBooked
                      ? "border-red-500/50 bg-red-600/25 text-white"
                      : "border-white/10 bg-white/5 text-white/50"
                    : "border-white/15 text-white hover:border-white/60"
              }`}
            >
              {i + 1}
              <span aria-hidden className="flex gap-0.5">
                {states.map((state, n) => (
                  <span key={n} className={`h-1 w-1.5 rounded-full sm:w-2 ${bar[state]}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
