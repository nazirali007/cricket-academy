// Date formatting for the admin pages, always in India time whatever the
// server's own time zone. Postgres hands back timestamps as Date objects.

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const isoMinute = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDateTime = (value: string | Date | null) =>
  value ? dateTime.format(new Date(value)) : "";

// "2026-11-12 14:05", which spreadsheets sort and read as a date.
export const spreadsheetDateTime = (value: string | Date | null) =>
  value ? isoMinute.format(new Date(value)) : "";
