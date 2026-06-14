import { NextRequest, NextResponse } from "next/server";
import { getTemplates, createTemplate, deleteTemplate } from "@/lib/notion";

export async function GET() {
  try { return NextResponse.json(await getTemplates()); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const { name, data } = await req.json();
    await createTemplate(name, JSON.stringify(data));
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
