// Kept apart from lib/admissions.ts so browser code can use the labels
// without pulling in the database driver.

// Follow-up stages for an admission request. "joined" means the player is
// now a student; the student count on the dashboard counts these.
export const admissionStatuses = {
  new: "New",
  contacted: "Contacted",
  joined: "Joined (student)",
  not_interested: "Not interested",
} as const;
export type AdmissionStatus = keyof typeof admissionStatuses;

export const isAdmissionStatus = (value: unknown): value is AdmissionStatus =>
  typeof value === "string" && Object.hasOwn(admissionStatuses, value);
