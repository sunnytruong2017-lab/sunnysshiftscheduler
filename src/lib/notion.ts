import { Client } from "@notionhq/client";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const EMPLOYEES_DB = process.env.NOTION_EMPLOYEES_DB!;
export const TIMESLOTS_DB = process.env.NOTION_TIMESLOTS_DB!;
export const SHIFTS_DB    = process.env.NOTION_SHIFTS_DB!;
export const TEMPLATES_DB = process.env.NOTION_TEMPLATES_DB!;

// ─── Employees ────────────────────────────────────────────────
export async function getEmployees() {
  const res = await notion.databases.query({
    database_id: EMPLOYEES_DB,
    filter: { property: "Active", checkbox: { equals: true } },
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return res.results.map((p: any) => ({
    id:   p.id,
    name: p.properties.Name?.title?.[0]?.plain_text ?? "",
  }));
}

export async function addEmployee(name: string) {
  return notion.pages.create({
    parent: { database_id: EMPLOYEES_DB },
    properties: {
      Name:   { title: [{ text: { content: name } }] },
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
    id:        p.id,
    label:     p.properties.Label?.title?.[0]?.plain_text ?? "",
    startTime: p.properties["Start Time"]?.rich_text?.[0]?.plain_text ?? "",
    endTime:   p.properties["End Time"]?.rich_text?.[0]?.plain_text ?? "",
    color:     p.properties["Color"]?.rich_text?.[0]?.plain_text ?? "#6366f1",
  }));
}

export async function addTimeSlot(label: string, startTime: string, endTime: string, color: string) {
  return notion.pages.create({
    parent: { database_id: TIMESLOTS_DB },
    properties: {
      Label:          { title: [{ text: { content: label } }] },
      "Start Time":   { rich_text: [{ text: { content: startTime } }] },
      "End Time":     { rich_text: [{ text: { content: endTime } }] },
      "Color":        { rich_text: [{ text: { content: color } }] },
      Active:         { checkbox: true },
    },
  });
}

export async function updateTimeSlot(id: string, label: string, startTime: string, endTime: string, color: string) {
  return notion.pages.update({
    page_id: id,
    properties: {
      Label:        { title: [{ text: { content: label } }] },
      "Start Time": { rich_text: [{ text: { content: startTime } }] },
      "End Time":   { rich_text: [{ text: { content: endTime } }] },
      "Color":      { rich_text: [{ text: { content: color } }] },
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
    id:         p.id,
    date:       p.properties.Date?.date?.start ?? "",
    employeeId: p.properties.Employee?.relation?.[0]?.id ?? "",
    timeSlotId: p.properties["Time Slot"]?.relation?.[0]?.id ?? "",
    role:       p.properties.Role?.select?.name ?? "Server",
  }));
}

export async function createShift(
  employeeId: string, employeeName: string,
  date: string, timeSlotId: string, timeSlotLabel: string, role: string
) {
  return notion.pages.create({
    parent: { database_id: SHIFTS_DB },
    properties: {
      Title:       { title: [{ text: { content: `${employeeName} — ${date}` } }] },
      Employee:    { relation: [{ id: employeeId }] },
      Date:        { date: { start: date } },
      "Time Slot": { relation: [{ id: timeSlotId }] },
      Role:        { select: { name: role } },
    },
  });
}

export async function updateShift(
  id: string, employeeId: string, employeeName: string,
  date: string, timeSlotId: string, timeSlotLabel: string, role: string
) {
  return notion.pages.update({
    page_id: id,
    properties: {
      Title:       { title: [{ text: { content: `${employeeName} — ${date}` } }] },
      Employee:    { relation: [{ id: employeeId }] },
      Date:        { date: { start: date } },
      "Time Slot": { relation: [{ id: timeSlotId }] },
      Role:        { select: { name: role } },
    },
  });
}

export async function deleteShift(id: string) {
  return notion.pages.update({ page_id: id, archived: true });
}

// Used for "undo delete" — re-activates an archived shift page.
export async function restoreShift(id: string) {
  return notion.pages.update({ page_id: id, archived: false });
}

// ─── Shift Templates ────────────────────────────────────────────
// Each template stores a JSON blob of relative entries:
// [{ dayOffset: 0-6 (Mon=0..Sun=6), employeeId, timeSlotId, role }]
export async function getTemplates() {
  const res = await notion.databases.query({
    database_id: TEMPLATES_DB,
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return res.results.map((p: any) => ({
    id:   p.id,
    name: p.properties.Name?.title?.[0]?.plain_text ?? "",
    data: p.properties.Data?.rich_text?.[0]?.plain_text ?? "[]",
  }));
}

export async function createTemplate(name: string, data: string) {
  return notion.pages.create({
    parent: { database_id: TEMPLATES_DB },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      Data: { rich_text: [{ text: { content: data } }] },
    },
  });
}

export async function deleteTemplate(id: string) {
  return notion.pages.update({ page_id: id, archived: true });
}
