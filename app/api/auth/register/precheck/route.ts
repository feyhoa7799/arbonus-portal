import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Маршрут больше не используется." },
    { status: 410 },
  );
}