"use client";

import { Check, LoaderCircle, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  addDays,
  BALL_PRICE,
  bookingReference,
  formatDate,
  formatRupees,
  isWeekend,
  MAX_BALLS,
  slotsFor,
  totalFor,
  UMPIRES_PRICE,
  type Slot,
} from "@/lib/booking";
import { SlotIcon } from "./slot-icon";

const DAYS_SHOWN = 14;
const REFRESH_EVERY_MS = 20_000;

type Availability = {
  today: string;
  nowMinutes: number;
  maxDate: string;
  connected: boolean;
  booked: { date: string; slotId: string }[];
};

type Status = "available" | "booked" | "closed" | "offline";

const statusLabel: Record<Status, string> = {
  available: "Available",
  booked: "Booked",
  closed: "Closed",
  offline: "Unavailable",
};

const cardStyle: Record<Status, string> = {
  available:
    "border-emerald-400/70 bg-emerald-500/12 hover:bg-emerald-500/22 cursor-pointer",
  booked: "border-red-400/70 bg-red-600/18 cursor-not-allowed",
  closed: "border-white/15 bg-white/5 opacity-60 cursor-not-allowed",
  offline: "border-white/15 bg-white/5 cursor-not-allowed",
};

const pillStyle: Record<Status, string> = {
  available: "bg-emerald-400 text-navy",
  booked: "bg-red-600 text-white",
  closed: "bg-white/15 text-white",
  offline: "bg-white/15 text-white",
};

const inputClass =
  "mt-1.5 h-12 w-full border border-navy/25 bg-white px-4 text-navy outline-none transition-colors focus:border-ball focus:ring-1 focus:ring-ball";

export function SlotPicker() {
  const [data, setData] = useState<Availability | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [balls, setBalls] = useState(0);
  const [umpires, setUmpires] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    id: number;
    date: string;
    slot: Slot;
    total: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/slots", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setData(await response.json());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  // Keeps the chart current if someone else books while this page is open.
  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (!data) {
    return (
      <div
        id="pick-a-slot"
        className="grid min-h-64 scroll-mt-24 place-items-center border border-white/15 bg-navy/50 p-8 text-center text-white/80"
      >
        {loadFailed ? (
          "We couldn't load availability. Please refresh the page."
        ) : (
          <span className="flex items-center gap-3">
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
            Loading availability…
          </span>
        )}
      </div>
    );
  }

  const { today, nowMinutes, maxDate, connected } = data;
  const canBook = connected && !loadFailed;
  const taken = new Set(data.booked.map((b) => `${b.date}|${b.slotId}`));

  const statusOf = (day: string, slot: Slot): Status => {
    if (!canBook) return "offline";
    if (taken.has(`${day}|${slot.id}`)) return "booked";
    if (day === today && slot.startsAt <= nowMinutes) return "closed";
    return "available";
  };

  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i));
  // Opens on the first day with something to book, not a day that's over.
  const firstOpenDay = days.find((day) =>
    slotsFor(day).some((slot) => statusOf(day, slot) === "available"),
  );
  const date =
    chosenDate && chosenDate >= today ? chosenDate : (firstOpenDay ?? today);
  const slots = slotsFor(date);
  const selected =
    slots.find((s) => s.id === slotId && statusOf(date, s) === "available") ??
    null;
  const justTaken = slotId !== null && selected === null;
  const total = selected ? totalFor(selected.rate, balls, umpires) : 0;

  function chooseDate(next: string) {
    setChosenDate(next);
    setSlotId(null);
    setError(null);
    setConfirmed(null);
  }

  function chooseSlot(slot: Slot) {
    // Keeps this date selected even if earlier days change while they book.
    setChosenDate(date);
    setSlotId(slot.id);
    setError(null);
    setConfirmed(null);
    panelRef.current?.scrollIntoView({ block: "nearest" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || submitting) return;
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slotId: selected.id,
          balls,
          umpires,
          name: form.get("name"),
          phone: form.get("phone"),
          organisation: form.get("organisation"),
          website: form.get("website"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error);
      } else {
        setConfirmed({ id: result.id, date, slot: selected, total });
        setSlotId(null);
        setBalls(0);
        setUmpires(false);
      }
    } catch {
      setError("We couldn't save your booking. Please try again.");
    } finally {
      setSubmitting(false);
      load();
    }
  }

  return (
    <div
      id="pick-a-slot"
      className="grid scroll-mt-24 gap-8 lg:grid-cols-[1.45fr_1fr]"
    >
      <div className="min-w-0">
        {!canBook && (
          <p role="status" className="mb-6 border border-gold/60 bg-gold/10 p-4">
            Online booking isn&apos;t available right now. You can still see
            our full rate chart below.
          </p>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <h3 className="font-display text-3xl font-bold uppercase">
            1. Choose a date
          </h3>
          <label className="text-sm font-semibold text-white/85">
            Or pick any date
            <input
              type="date"
              min={today}
              max={maxDate}
              value={date}
              onChange={(e) => {
                if (e.target.value >= today && e.target.value <= maxDate) {
                  chooseDate(e.target.value);
                }
              }}
              className="ml-3 h-10 border border-white/30 bg-transparent px-3 text-white scheme-dark"
            />
          </label>
        </div>

        <ul className="mt-5 flex gap-2 overflow-x-auto pb-3">
          {days.map((day) => {
            const free = slotsFor(day).filter(
              (slot) => statusOf(day, slot) === "available",
            ).length;
            const anyBooked = slotsFor(day).some(
              (slot) => statusOf(day, slot) === "booked",
            );
            const isSelected = day === date;
            return (
              <li key={day} className="shrink-0">
                <button
                  type="button"
                  onClick={() => chooseDate(day)}
                  aria-pressed={isSelected}
                  className={`relative block w-20 border px-2 py-3 text-center transition-colors duration-300 ${
                    isSelected
                      ? "border-white text-navy"
                      : "border-white/20 text-white hover:border-white/60"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="selected-date"
                      aria-hidden
                      className="absolute inset-0 bg-white"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 36,
                      }}
                    />
                  )}
                  <span className="relative block">
                    <span
                      className={`block text-xs font-bold uppercase ${
                        isSelected
                          ? "text-navy"
                          : isWeekend(day)
                            ? "text-gold"
                            : "text-white/70"
                      }`}
                    >
                      {day === today
                        ? "Today"
                        : formatDate(day, { weekday: "short" })}
                    </span>
                    <span className="block font-display text-3xl leading-tight font-bold">
                      {formatDate(day, { day: "numeric" })}
                    </span>
                    <span className="block text-xs">
                      {formatDate(day, { month: "short" })}
                    </span>
                    {canBook && (
                      <span
                        className={`mt-1 block text-[11px] font-bold ${
                          free > 0
                            ? isSelected
                              ? "text-emerald-700"
                              : "text-emerald-300"
                            : !anyBooked
                              ? isSelected
                                ? "text-navy/60"
                                : "text-white/60"
                              : isSelected
                                ? "text-red-700"
                                : "text-red-300"
                        }`}
                      >
                        {free > 0
                          ? `${free} free`
                          : anyBooked
                            ? "Full"
                            : "Closed"}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-display text-3xl font-bold uppercase">
            2. Choose a slot
          </h3>
          <ul className="flex gap-4 text-sm font-semibold">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-full bg-emerald-400" />
              Available
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-full bg-red-600" />
              Booked
            </li>
          </ul>
        </div>
        <p className="mt-2 text-white/80">{formatDate(date)}</p>

        <AnimatePresence mode="wait">
          <motion.ul
            key={date}
            className="mt-5 grid gap-3 sm:grid-cols-2"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {slots.map((slot) => {
              const status = statusOf(date, slot);
              const isSelected = selected?.id === slot.id;
              return (
                <li key={slot.id}>
                  <motion.button
                    type="button"
                    disabled={status !== "available"}
                    aria-pressed={isSelected}
                    onClick={() => chooseSlot(slot)}
                    whileTap={status === "available" ? { scale: 0.98 } : undefined}
                    className={`relative h-full w-full border-2 p-5 text-left transition-colors duration-300 ${
                      isSelected
                        ? "border-gold bg-gold/20"
                        : cardStyle[status]
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <SlotIcon id={slot.id} className="size-8 text-gold" />
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase ${
                          isSelected
                            ? "bg-gold text-navy"
                            : pillStyle[status]
                        }`}
                      >
                        {isSelected && <Check aria-hidden className="size-3.5" />}
                        {isSelected ? "Selected" : statusLabel[status]}
                      </span>
                    </span>
                    <span className="mt-4 block font-display text-3xl font-bold uppercase">
                      {slot.name}
                    </span>
                    <span className="mt-1 block text-sm text-white/85">
                      {slot.timing}
                    </span>
                    <span className="mt-3 block font-display text-3xl font-bold">
                      {formatRupees(slot.rate)}
                    </span>
                  </motion.button>
                </li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </div>

      <div ref={panelRef} className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
        <div className="bg-cream p-6 text-navy md:p-8">
          {confirmed ? (
            <motion.div
              role="status"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="grid size-14 place-items-center rounded-full bg-emerald-600 text-white">
                <Check aria-hidden className="size-8" />
              </span>
              <h3 className="mt-5 font-display text-4xl leading-none font-bold uppercase">
                Your slot is booked
              </h3>
              <dl className="mt-5 space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-bold">{bookingReference(confirmed.id)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="text-right font-bold">
                    {formatDate(confirmed.date)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Slot</dt>
                  <dd className="text-right font-bold">
                    {confirmed.slot.name}, {confirmed.slot.timing}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-bold">{formatRupees(confirmed.total)}</dd>
                </div>
              </dl>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Please keep your reference number. The academy will contact you
                on your phone number about this booking.
              </p>
              <button
                type="button"
                onClick={() => setConfirmed(null)}
                className="mt-6 h-12 w-full border border-navy/30 text-sm font-bold transition-colors hover:bg-navy hover:text-white"
              >
                Book another slot
              </button>
            </motion.div>
          ) : selected ? (
            <form onSubmit={submit}>
              <h3 className="font-display text-3xl font-bold uppercase">
                3. Confirm your booking
              </h3>
              <p className="mt-3 font-semibold">{formatDate(date)}</p>
              <p className="text-muted-foreground">
                {selected.name}, {selected.timing}
              </p>

              <div className="mt-6 space-y-4 border-y border-navy/15 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">Match balls</p>
                    <p className="text-sm text-muted-foreground">
                      {formatRupees(BALL_PRICE)} per ball
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Remove a ball"
                      disabled={balls === 0}
                      onClick={() => setBalls(balls - 1)}
                      className="grid size-11 place-items-center border border-navy/30 disabled:opacity-40"
                    >
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span aria-live="polite" className="w-6 text-center font-bold">
                      {balls}
                    </span>
                    <button
                      type="button"
                      aria-label="Add a ball"
                      disabled={balls === MAX_BALLS}
                      onClick={() => setBalls(balls + 1)}
                      className="grid size-11 place-items-center border border-navy/30 disabled:opacity-40"
                    >
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span>
                    <span className="block font-semibold">
                      Umpires (2 per match)
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {formatRupees(UMPIRES_PRICE)}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={umpires}
                    onChange={(e) => setUmpires(e.target.checked)}
                    className="size-6 accent-ball"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <motion.span
                  key={total}
                  initial={{ scale: 1.12 }}
                  animate={{ scale: 1 }}
                  className="font-display text-4xl font-bold"
                >
                  {formatRupees(total)}
                </motion.span>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block text-sm font-semibold">
                  Your name
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    name="name"
                    autoComplete="name"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Mobile number
                  <input
                    required
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Company or team (optional)
                  <input
                    name="organisation"
                    maxLength={120}
                    autoComplete="organization"
                    className={inputClass}
                  />
                </label>
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="absolute -left-[9999px] size-px"
                />
              </div>

              {error && (
                <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex h-13 w-full items-center justify-center gap-2 bg-ball text-sm font-bold text-white transition-colors duration-300 hover:bg-[#a81f18] disabled:opacity-70"
              >
                {submitting && (
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                )}
                {submitting ? "Booking…" : `Book for ${formatRupees(total)}`}
              </button>
            </form>
          ) : (
            <div>
              <h3 className="font-display text-3xl font-bold uppercase">
                3. Confirm your booking
              </h3>
              {(justTaken || error) && (
                <p role="alert" className="mt-3 font-semibold text-red-700">
                  {error ??
                    "Sorry, that slot has just been booked. Please choose another."}
                </p>
              )}
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Select a green slot to add match balls or umpires and enter your
                details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
