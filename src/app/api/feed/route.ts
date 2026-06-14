import { NextRequest, NextResponse } from "next/server";
import { getShifts, getEmployees, getTimeSlots } from "@/lib/notion";
import { format, startOfWeek, subWeeks, addWeeks } from "date-fns";

// Public rolling iCal feed for one employee — designed to be subscribed to
// in Google Calendar / Apple Calendar / Outlook via a personal URL.
// Covers from 2 weeks ago through 8 weeks ahead, refreshed on each fetch.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("id") || "";
  if (!employeeId) return new NextResponse("Missing employee id", { status: 400 });

  const today = new Date();
  const start = format(subWeeks(startOfWeek(today,{weekStartsOn:1}), 2), "yyyy-MM-dd");
  const end   = format(addWeeks(startOfWeek(today,{weekStartsOn:1}), 8), "yyyy-MM-dd");

  const [shifts, employees, timeSlots] = await Promise.all([
    getShifts(start, end), getEmployees(), getTimeSlots(),
  ]);

  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return new NextResponse("Employee not found", { status: 404 });

  const slotMap = Object.fromEntries(timeSlots.map(s => [s.id, s]));
  const mine = shifts.filter(s => s.employeeId === employeeId);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shift Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${employee.name}'s Shifts`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const s of mine) {
    const slot = slotMap[s.timeSlotId];
    const dateStr   = s.date.replace(/-/g, "");
    const startHHMM = (slot?.startTime || "09:00").replace(":", "") + "00";
    const endHHMM   = (slot?.endTime   || "17:00").replace(":", "") + "00";
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${s.id}@shiftscheduler`);
    lines.push(`DTSTART:${dateStr}T${startHHMM}`);
    lines.push(`DTEND:${dateStr}T${endHHMM}`);
    lines.push(`SUMMARY:${slot?.label ?? "Shift"} (${s.role}) — ${employee.name}`);
    lines.push(`DESCRIPTION:${slot?.startTime ?? ""}\\u2013${slot?.endTime ?? ""} | ${s.role}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
