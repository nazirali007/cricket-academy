import { isDatabaseConfigured } from "./db";
import { isPaymentConfigured } from "./razorpay";

// Test mode lets you try the whole booking flow before the database and
// Razorpay are set up. It never runs on the live site unless BOOKING_DEMO is
// set there on purpose.
export const isDemoMode = () =>
  !(isDatabaseConfigured() && isPaymentConfigured()) &&
  (process.env.NODE_ENV === "development" || process.env.BOOKING_DEMO === "true");
