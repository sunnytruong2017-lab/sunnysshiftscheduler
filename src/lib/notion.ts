import { Client } from "@notionhq/client";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const EMPLOYEES_DB = process.env.NOTION_EMPLOYEES_DB!;
export const TIMESLOTS_DB = process.env.NOTION_TIMESLOTS_DB!;
export const SHIFTS_DB    = process.env.NOTION_SHIFTS_DB!;
// Optional — only required if using the Shift Templates feature.
export const TEMPLATES_DB = process.env.NOTION_TEMPLATES_DB ?? "";

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

// ─── Shift Templates ─────────────────────────────────────────────────────────
// Template data is stored as a paragraph block in the page body so we avoid
// Notion's 2000-character limit on rich_text properties.
export async function getTemplates() {
  if (!TEMPLATES_DB) return [];
  const res = await notion.databases.query({
    database_id: TEMPLATES_DB,
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  const templates = await Promise.all(res.results.map(async (p: any) => {
    const blocks = await notion.blocks.children.list({ block_id: p.id });
    const dataBlock = blocks.results.find((b: any) => b.type === "paragraph") as any;
    // Concatenate all rich_text pieces (handles chunked data)
    const data = (dataBlock?.paragraph?.rich_text ?? [])
      .map((t: any) => t.plain_text ?? "").join("") || "[]";
    return { id: p.id, name: p.properties.Name?.title?.[0]?.plain_text ?? "", data };
  }));
  return templates;
}

export async function createTemplate(name: string, data: string) {
  if (!TEMPLATES_DB) throw new Error("NOTION_TEMPLATES_DB is not configured.");
  // Chunk into ≤1900-char pieces to stay under Notion's 2000-char rich_text limit.
  const chunks: { text: { content: string } }[] = [];
  for (let i = 0; i < data.length; i += 1900) {
    chunks.push({ text: { content: data.slice(i, i + 1900) } });
  }
  if (chunks.length === 0) chunks.push({ text: { content: "[]" } });
  return notion.pages.create({
    parent: { database_id: TEMPLATES_DB },
    properties: {
      Name: { title: [{ text: { content: name } }] },
    },
    children: [{
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: { rich_text: chunks },
    }],
  });
}

export async function deleteTemplate(id: string) {
  if (!TEMPLATES_DB) return;
  return notion.pages.update({ page_id: id, archived: true });
}
