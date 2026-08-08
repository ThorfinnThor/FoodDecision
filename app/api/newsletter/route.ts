import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ error: "signup_not_available" }, { status: 410 });
}
