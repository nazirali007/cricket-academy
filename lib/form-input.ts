// Cleans text typed into a public form: trims it, collapses runs of spaces
// and caps its length. Anything that isn't a string becomes "".
export const cleanText = (value: unknown, maxLength: number) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";

// Like cleanText, but keeps line breaks (for messages).
export const cleanMultiline = (value: unknown, maxLength: number) =>
  typeof value === "string"
    ? value
        .replace(/\r\n?/g, "\n")
        .replace(/[^\S\n]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, maxLength)
    : "";

// Accepts a 10-digit Indian mobile number, with or without +91 or a leading 0.
export function normalisePhone(value: unknown) {
  const digits = cleanText(value, 20).replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}
