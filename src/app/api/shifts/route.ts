import { NextRequest, NextResponse } from "next/server";
import { getShifts, createShift, updateShift, deleteShift, getEmployees, getTimeSlots } from "@/lib/notion";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start") || "";
    const end = searchParams.get("end") || "";
    const [shifts, employees, timeSlots] = await Promise.all([
      getShifts(start, end),
      getEmployees(),
      getTimeSlots(),
    ]);
    const empMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));
    const slotMap = Object.fromEntries(timeSlots.map((s) => [s.id, s]));
    const enriched = shifts.map((s) => ({
      ...s,
      employeeName: empMap[s.employeeId] ?? "Unknown",
      timeSlotLabel: slotMap[s.timeSlotId]?.label ?? "",
      timeSlotStart: slotMap[s.timeSlotId]?.startTime ?? "",
      timeSlotEnd: slotMap[s.timeSlotId]?.endTime ?? "",
    }));
    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, employeeName, date, timeSlotId, timeSlotLabel } = await req.json();
    await createShift(employeeId, employeeName, date, timeSlotId, timeSlotLabel);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, employeeId, employeeName, date, timeSlotId, timeSlotLabel } = await req.json();
    await updateShift(id, employeeId, employeeName, date, timeSlotId, timeSlotLabel);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteShift(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
