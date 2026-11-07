import { findSlot, slotKey, type SlotId } from "./booking";

// Slots taken by the academy's own events. They show as Booked and can't be
// bought online. A "morning shift" covers Morning and, on weekends, Afternoon;
// an "evening shift" covers Evening. Night slots stay bookable.
const events: { event: string; dates: string[]; slots: SlotId[] }[] = [
  {
    event: "CMP Tournament S7",
    dates: ["2026-11-07"],
    slots: ["morning", "afternoon"],
  },
  {
    event: "CMP Tournament S7",
    dates: [
      "2026-11-08",
      "2026-11-15",
      "2026-11-22",
      "2026-11-29",
      "2026-12-06",
      "2026-12-13",
      "2026-12-20",
      "2026-12-25",
      "2026-12-27",
      "2027-01-03",
    ],
    slots: ["morning", "afternoon", "evening"],
  },
  {
    event: "CCS Infratech Match",
    dates: ["2026-11-23", "2026-11-24", "2026-11-25"],
    slots: ["evening"],
  },
];

// Weekday dates have no Afternoon slot, so it is skipped for them.
export const blockedSlots = events.flatMap(({ event, dates, slots }) =>
  dates.flatMap((date) =>
    slots
      .filter((slotId) => findSlot(date, slotId))
      .map((slotId) => ({ date, slotId, event })),
  ),
);

export const blockedKeys = new Set(
  blockedSlots.map(({ date, slotId }) => slotKey(date, slotId)),
);
