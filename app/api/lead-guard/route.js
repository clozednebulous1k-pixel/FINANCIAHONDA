import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ error: "Método não permitido" }, { status: 405 });
}
