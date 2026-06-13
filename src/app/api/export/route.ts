import { NextRequest, NextResponse } from "next/server";
import { getShifts, getEmployees, getTimeSlots } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format     = searchParams.get("format") || "xlsx";
  const start      = searchParams.get("start")  || "";
  const end        = searchParams.get("end")    || "";
  const empFilter  = searchParams.get("employees"); // comma-separated IDs, or absent = all

  const [shifts, employees, timeSlots] = await Promise.all([
    getShifts(start, end), getEmployees(), getTimeSlots(),
  ]);

  const empMap  = Object.fromEntries(employees.map(e => [e.id, e.name]));
  const slotMap = Object.fromEntries(timeSlots.map(s => [s.id, s]));

  const filterIds = empFilter ? empFilter.split(",").map(s=>s.trim()).filter(Boolean) : null;
  const filterIdSet = filterIds ? new Set(filterIds) : null;

  const enriched = shifts
    .map(s => ({
      ...s,
      employeeName:  empMap[s.employeeId]             ?? "Unknown",
      timeSlotLabel: slotMap[s.timeSlotId]?.label     ?? "",
      timeSlotStart: slotMap[s.timeSlotId]?.startTime ?? "",
      timeSlotEnd:   slotMap[s.timeSlotId]?.endTime   ?? "",
    }))
    .filter(s => !filterIdSet || filterIdSet.has(s.employeeId))
    .sort((a,b) => a.date.localeCompare(b.date) || a.timeSlotStart.localeCompare(b.timeSlotStart));

  if (format === "ical") {
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Shift Scheduler//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    for (const s of enriched) {
      const dateStr  = s.date.replace(/-/g, "");
      const startHHMM = (s.timeSlotStart || "09:00").replace(":", "") + "00";
      const endHHMM   = (s.timeSlotEnd   || "17:00").replace(":", "") + "00";
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${s.id}@shiftscheduler`);
      lines.push(`DTSTART:${dateStr}T${startHHMM}`);
      lines.push(`DTEND:${dateStr}T${endHHMM}`);
      lines.push(`SUMMARY:${s.employeeName} — ${s.timeSlotLabel} (${s.role})`);
      lines.push(`DESCRIPTION:${s.timeSlotStart}–${s.timeSlotEnd} | ${s.role}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const filename = filterIds?.length===1
      ? `shifts-${(empMap[filterIds[0]]??filterIds[0]).replace(/[^a-z0-9]+/gi,"-")}.ics`
      : "shifts.ics";
    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // XLSX
  const rows = [["Date", "Employee", "Role", "Time Slot", "Start", "End"]];
  for (const s of enriched) {
    rows.push([s.date, s.employeeName, s.role ?? "", s.timeSlotLabel, s.timeSlotStart, s.timeSlotEnd]);
  }
  return NextResponse.json({ rows, start, end });
}
