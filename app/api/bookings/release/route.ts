import { NextResponse } from "next/server";
import { releaseHold } from "@/lib/db";

// Puts the slots back on sale when a customer closes the payment window.
export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (typeof token === "string") await releaseHold(token);
  } catch (error) {
    console.error("Could not release hold", error);
  }
  return new NextResponse(null, { status: 204 });
}
