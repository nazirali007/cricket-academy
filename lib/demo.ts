import { isDatabaseConfigured } from "./db";
import { isPaymentConfigured, isTestMode } from "./razorpay";

// Test mode lets you try the whole booking flow before the database and
// Razorpay are set up. It never runs on the live site unless BOOKING_DEMO is
// set there on purpose.
export const isDemoMode = () =>
  !(isDatabaseConfigured() && isPaymentConfigured()) &&
  (process.env.NODE_ENV === "development" || process.env.BOOKING_DEMO === "true");

// In test mode with Razorpay TEST keys, payments go through Razorpay's real
// test checkout instead of the built-in dummy window. Live keys are never used
// here: without a database there would be no record of a real payment.
export const isTestCheckout = () =>
  isDemoMode() && isPaymentConfigured() && isTestMode();
