import { Ban, CigaretteOff, MapPin, Phone, UtensilsCrossed } from "lucide-react";
import {
  BALL_PRICE,
  formatRupees,
  UMPIRES_PRICE,
  weekdaySlots,
  weekendSlots,
  type Slot,
} from "@/lib/booking";
import { bookingPhone, contact } from "@/lib/site";
import { Reveal } from "../reveal";
import { SlotIcon } from "./slot-icon";

function RateTable({
  title,
  days,
  slots,
  accent,
}: {
  title: string;
  days: string;
  slots: Slot[];
  accent: "mist" | "gold";
}) {
  const heading = accent === "gold" ? "text-gold" : "text-mist";
  const rule = accent === "gold" ? "border-gold" : "border-mist";

  return (
    <div className={`border-t-4 bg-navy/70 p-5 md:p-8 ${rule}`}>
      <h3
        className={`font-display text-4xl leading-none font-bold uppercase ${heading}`}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm font-semibold text-white/75">{days}</p>
      <table className="mt-6 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/20 text-xs tracking-[0.14em] text-white/65 uppercase">
            <th scope="col" className="pb-3 font-bold">
              Slot
            </th>
            <th scope="col" className="pb-3 font-bold">
              Timing
            </th>
            <th scope="col" className="pb-3 text-right font-bold">
              Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.id} className="border-b border-white/10">
              <th scope="row" className="py-4 pr-2 font-semibold">
                <span className="flex items-center gap-2">
                  <SlotIcon id={slot.id} className={`size-5 ${heading}`} />
                  {slot.name}
                </span>
              </th>
              <td className="py-4 pr-2 text-sm text-white/85 sm:text-base">
                {slot.timing}
              </td>
              <td className="py-4 text-right font-display text-2xl font-bold whitespace-nowrap">
                {formatRupees(slot.rate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-white/70">
        Rates are without umpire and without ball
      </p>
    </div>
  );
}

function RuleBadge({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "stop" | "welcome";
}) {
  return (
    <li
      className={`flex items-center gap-4 border p-4 font-display text-xl leading-tight font-bold uppercase md:text-2xl ${
        tone === "stop"
          ? "border-red-400/60 bg-red-600/20"
          : "border-emerald-400/60 bg-emerald-500/15"
      }`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-full ${
          tone === "stop" ? "bg-red-600" : "bg-emerald-600"
        }`}
      >
        {icon}
      </span>
      {label}
    </li>
  );
}

export function RateChart() {
  return (
    <div className="mt-20 md:mt-28">
      <Reveal>
        <h3 className="font-display text-4xl font-bold uppercase md:text-5xl">
          Full rate chart
        </h3>
      </Reveal>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Reveal>
          <RateTable
            title="Weekdays"
            days="Monday to Friday"
            slots={weekdaySlots}
            accent="mist"
          />
        </Reveal>
        <Reveal delay={0.08}>
          <RateTable
            title="Weekends"
            days="Saturday & Sunday"
            slots={weekendSlots}
            accent="gold"
          />
        </Reveal>
      </div>

      <Reveal className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 border border-gold/60 bg-gold/10 p-6">
          <p className="font-display text-2xl font-bold uppercase">
            Match Ball
          </p>
          <p className="text-right font-display text-3xl font-bold text-gold">
            {formatRupees(BALL_PRICE)}
            <span className="block font-sans text-sm font-semibold text-white/75">
              per ball
            </span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 border border-gold/60 bg-gold/10 p-6">
          <p className="font-display text-2xl font-bold uppercase">
            Umpires
            <span className="block font-sans text-sm font-semibold text-white/75 normal-case">
              2 per match
            </span>
          </p>
          <p className="font-display text-3xl font-bold text-gold">
            {formatRupees(UMPIRES_PRICE)}
          </p>
        </div>
      </Reveal>

      <Reveal>
        <ul className="mt-5 grid gap-5 md:grid-cols-3">
          <RuleBadge
            tone="stop"
            label="No Smoking"
            icon={<CigaretteOff aria-hidden className="size-6" />}
          />
          <RuleBadge
            tone="stop"
            label="No Tobacco / Gutkha"
            icon={<Ban aria-hidden className="size-6" />}
          />
          <RuleBadge
            tone="welcome"
            label="Canteen Available Inside"
            icon={<UtensilsCrossed aria-hidden className="size-6" />}
          />
        </ul>
      </Reveal>

      <Reveal className="mt-10 flex flex-col gap-6 border-t border-white/20 pt-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <p className="flex max-w-xl gap-3 leading-relaxed text-white/85">
            <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-gold" />
            <span className="whitespace-pre-line">{contact.address}</span>
          </p>
          <a
            href={`tel:${bookingPhone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 font-display text-3xl font-bold transition-colors hover:text-gold"
          >
            <Phone aria-hidden className="size-5 shrink-0 text-gold" />
            {bookingPhone}
          </a>
        </div>
        <a
          href="#pick-a-slot"
          className="inline-flex h-13 shrink-0 items-center justify-center bg-ball px-7 text-sm font-bold text-white transition-colors duration-300 hover:bg-[#a81f18]"
        >
          Book Your Slot Now!
        </a>
      </Reveal>
    </div>
  );
}
