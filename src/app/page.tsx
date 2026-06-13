import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { getEmployees, getTimeSlots, getShifts } from "@/lib/notion";
import ClientApp, { type InitialData, type Shift } from "./ClientApp";

// Always fetch fresh data from Notion on each request — shift schedules
// change frequently and must never be served from a stale build cache.
export const dynamic = "force-dynamic";

// Server Component: preload data for the current month AND current week
// before the page is sent to the browser, so the client has data the
// instant it mounts (no fetch, no spinner on first load).
export default async function Page() {
  const today = new Date();

  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd   = format(endOfMonth(today),   "yyyy-MM-dd");
  const weekStart  = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd    = format(endOfWeek(today,   { weekStartsOn: 1 }), "yyyy-MM-dd");

  let employees: Awaited<ReturnType<typeof getEmployees>> = [];
  let timeSlots: Awaited<ReturnType<typeof getTimeSlots>> = [];
  let monthShifts: ReturnType<typeof enrich> = [];
  let weekShifts: ReturnType<typeof enrich> = [];

  try {
    [employees, timeSlots] = await Promise.all([getEmployees(), getTimeSlots()]);
    const [monthRaw, weekRaw] = await Promise.all([
      getShifts(monthStart, monthEnd),
      getShifts(weekStart, weekEnd),
    ]);
    monthShifts = enrich(monthRaw, employees, timeSlots);
    weekShifts  = enrich(weekRaw, employees, timeSlots);
  } catch {
    // If Notion isn't reachable at build/request time, fall back to an
    // empty initial state — the client will fetch normally.
  }

  const monthData: InitialData = {
    rangeKey: `${monthStart}_${monthEnd}`,
    employees, timeSlots, shifts: monthShifts,
  };
  const weekData: InitialData = {
    rangeKey: `${weekStart}_${weekEnd}`,
    employees, timeSlots, shifts: weekShifts,
  };

  return <ClientApp initialData={monthData} initialDataAlt={weekData} />;
}

function enrich(
  shifts: Awaited<ReturnType<typeof getShifts>>,
  employees: Awaited<ReturnType<typeof getEmployees>>,
  timeSlots: Awaited<ReturnType<typeof getTimeSlots>>,
): Shift[] {
  const empMap  = Object.fromEntries(employees.map(e => [e.id, e.name]));
  const slotMap = Object.fromEntries(timeSlots.map(s => [s.id, s]));
  const sorted = shifts.map(s => ({
    ...s,
    employeeName:  empMap[s.employeeId]             ?? "Unknown",
    timeSlotLabel: slotMap[s.timeSlotId]?.label     ?? "",
    timeSlotStart: slotMap[s.timeSlotId]?.startTime ?? "",
    timeSlotEnd:   slotMap[s.timeSlotId]?.endTime   ?? "",
    timeSlotColor: slotMap[s.timeSlotId]?.color     ?? "#6366f1",
    role: (s.role as "Server"|"Cook") ?? "Server",
  }));
  return sorted.sort((a,b) => {
    const ta = a.timeSlotStart || "00:00";
    const tb = b.timeSlotStart || "00:00";
    return ta.localeCompare(tb);
  });
}
