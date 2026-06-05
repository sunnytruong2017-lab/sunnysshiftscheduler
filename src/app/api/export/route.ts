import { NextRequest, NextResponse } from "next/server";
import { getShifts, getEmployees, getTimeSlots } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "xlsx";
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

  if (format === "ical") {
    // Generate iCal
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Shift Scheduler//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    for (const s of enriched) {
      const dateStr = s.date.replace(/-/g, "");
      const startHHMM = (s.timeSlotStart || "09:00").replace(":", "") + "00";
      const endHHMM = (s.timeSlotEnd || "17:00").replace(":", "") + "00";
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${s.id}@shiftscheduler`);
      lines.push(`DTSTART:${dateStr}T${startHHMM}`);
      lines.push(`DTEND:${dateStr}T${endHHMM}`);
      lines.push(`SUMMARY:${s.employeeName} — ${s.timeSlotLabel}`);
      lines.push(`DESCRIPTION:${s.timeSlotStart}–${s.timeSlotEnd}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="shifts.ics"`,
      },
    });
  }

  // XLSX export — build CSV-like structure, client will handle XLSX
  const rows = [["Date", "Employee", "Time Slot", "Start", "End"]];
  for (const s of enriched) {
    rows.push([s.date, s.employeeName, s.timeSlotLabel, s.timeSlotStart, s.timeSlotEnd]);
  }
  return NextResponse.json({ rows, start, end });
}
