import { NextRequest, NextResponse } from "next/server";
import { getShifts, getEmployees, getTimeSlots } from "@/lib/notion";
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns";

// Public, read-only endpoint: returns upcoming shifts for a single employee.
// Used by the personal schedule page (QR code / shareable link).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("id") || "";
    if (!employeeId) return NextResponse.json({ error: "Missing employee id" }, { status: 400 });

    const today = new Date();
    const start = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const end   = format(endOfWeek(addWeeks(today, 3), { weekStartsOn: 1 }), "yyyy-MM-dd");

    let employees, timeSlots, shifts;
    try {
      [employees, timeSlots, shifts] = await Promise.all([
        getEmployees(), getTimeSlots(), getShifts(start, end),
      ]);
    } catch (notionErr: any) {
      return NextResponse.json({ error: `Notion fetch failed: ${notionErr.message}` }, { status: 500 });
    }

    const employee = employees.find((e: any) => e.id === employeeId);
    if (!employee) {
      return NextResponse.json({
        error: `Employee not found. id="${employeeId}". Available ids: ${employees.map((e:any)=>e.id).join(", ")}`,
      }, { status: 404 });
    }

    const slotMap = Object.fromEntries(timeSlots.map((s: any) => [s.id, s]));
    const mine = shifts
      .filter((s: any) => s.employeeId === employeeId)
      .map((s: any) => ({
        id: s.id,
        date: s.date,
        role: s.role,
        timeSlotLabel: slotMap[s.timeSlotId]?.label     ?? "",
        timeSlotStart: slotMap[s.timeSlotId]?.startTime ?? "",
        timeSlotEnd:   slotMap[s.timeSlotId]?.endTime   ?? "",
        timeSlotColor: slotMap[s.timeSlotId]?.color     ?? "#6366f1",
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.timeSlotStart.localeCompare(b.timeSlotStart));

    return NextResponse.json({ employee, shifts: mine, rangeStart: start, rangeEnd: end });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.slice(0,500) }, { status: 500 });
  }
}
