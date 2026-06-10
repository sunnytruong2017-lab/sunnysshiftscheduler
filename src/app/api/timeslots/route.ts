import { NextRequest, NextResponse } from "next/server";
import { getTimeSlots, addTimeSlot, updateTimeSlot, removeTimeSlot } from "@/lib/notion";

export async function GET() {
  try { return NextResponse.json(await getTimeSlots()); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const { label, startTime, endTime, color } = await req.json();
    await addTimeSlot(label, startTime, endTime, color ?? "#6366f1");
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, label, startTime, endTime, color } = await req.json();
    await updateTimeSlot(id, label, startTime, endTime, color ?? "#6366f1");
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await removeTimeSlot(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
