import { Client } from "@notionhq/client";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const EMPLOYEES_DB = process.env.NOTION_EMPLOYEES_DB!;
export const TIMESLOTS_DB = process.env.NOTION_TIMESLOTS_DB!;
export const SHIFTS_DB = process.env.NOTION_SHIFTS_DB!;

// ─── Employees ────────────────────────────────────────────────
export async function getEmployees() {
  const res = await notion.databases.query({
    database_id: EMPLOYEES_DB,
    filter: { property: "Active", checkbox: { equals: true } },
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return res.results.map((p: any) => ({
    id: p.id,
    name: p.properties.Name?.title?.[0]?.plain_text ?? "",
  }));
}

export async function addEmployee(name: string) {
  return notion.pages.create({
    parent: { database_id: EMPLOYEES_DB },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      Active: { checkbox: true },
    },
  });
}

export async function removeEmployee(id: string) {
  return notion.pages.update({ page_id: id, properties: { Active: { checkbox: false } } });
}

// ─── Time Slots ───────────────────────────────────────────────
export async function getTimeSlots() {
  const res = await notion.databases.query({
    database_id: TIMESLOTS_DB,
    filter: { property: "Active", checkbox: { equals: true } },
  });
  return res.results.map((p: any) => ({
    id: p.id,
    label: p.properties.Label?.title?.[0]?.plain_text ?? "",
    startTime: p.properties["Start Time"]?.rich_text?.[0]?.plain_text ?? "",
    endTime: p.properties["End Time"]?.rich_text?.[0]?.plain_text ?? "",
  }));
}

export async function addTimeSlot(label: string, startTime: string, endTime: string) {
  return notion.pages.create({
    parent: { database_id: TIMESLOTS_DB },
    properties: {
      Label: { title: [{ text: { content: label } }] },
      "Start Time": { rich_text: [{ text: { content: startTime } }] },
      "End Time": { rich_text: [{ text: { content: endTime } }] },
      Active: { checkbox: true },
    },
  });
}

export async function updateTimeSlot(id: string, label: string, startTime: string, endTime: string) {
  return notion.pages.update({
    page_id: id,
    properties: {
      Label: { title: [{ text: { content: label } }] },
      "Start Time": { rich_text: [{ text: { content: startTime } }] },
      "End Time": { rich_text: [{ text: { content: endTime } }] },
    },
  });
}

export async function removeTimeSlot(id: string) {
  return notion.pages.update({ page_id: id, properties: { Active: { checkbox: false } } });
}

// ─── Shifts ───────────────────────────────────────────────────
export async function getShifts(startDate: string, endDate: string) {
  const res = await notion.databases.query({
    database_id: SHIFTS_DB,
    filter: {
      and: [
        { property: "Date", date: { on_or_after: startDate } },
        { property: "Date", date: { on_or_before: endDate } },
      ],
    },
  });
  return res.results.map((p: any) => ({
    id: p.id,
    title: p.properties.Title?.title?.[0]?.plain_text ?? "",
    date: p.properties.Date?.date?.start ?? "",
    employeeId: p.properties.Employee?.relation?.[0]?.id ?? "",
    employeeName: "",
    timeSlotId: p.properties["Time Slot"]?.relation?.[0]?.id ?? "",
    timeSlotLabel: "",
    timeSlotStart: "",
    timeSlotEnd: "",
  }));
}

export async function createShift(employeeId: string, employeeName: string, date: string, timeSlotId: string, timeSlotLabel: string) {
  return notion.pages.create({
    parent: { database_id: SHIFTS_DB },
    properties: {
      Title: { title: [{ text: { content: `${employeeName} — ${date}` } }] },
      Employee: { relation: [{ id: employeeId }] },
      Date: { date: { start: date } },
      "Time Slot": { relation: [{ id: timeSlotId }] },
    },
  });
}

export async function updateShift(id: string, employeeId: string, employeeName: string, date: string, timeSlotId: string, timeSlotLabel: string) {
  return notion.pages.update({
    page_id: id,
    properties: {
      Title: { title: [{ text: { content: `${employeeName} — ${date}` } }] },
      Employee: { relation: [{ id: employeeId }] },
      Date: { date: { start: date } },
      "Time Slot": { relation: [{ id: timeSlotId }] },
    },
  });
}

export async function deleteShift(id: string) {
  return notion.pages.update({ page_id: id, archived: true });
}
