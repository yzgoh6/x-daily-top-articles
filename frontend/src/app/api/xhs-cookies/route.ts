import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-admin-secret");
  return provided === secret;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("xhs_cookies")
    .select("a1,web_session,updated_at")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  function mask(val: string): string {
    if (!val) return "";
    if (val.length <= 12) return "****";
    return `${val.slice(0, 6)}...${val.slice(-6)}`;
  }

  return NextResponse.json({
    a1_preview: mask(data.a1 ?? ""),
    web_session_preview: mask(data.web_session ?? ""),
    updated_at: data.updated_at,
  });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { a1, web_session } = body;

  if (!a1 || !web_session) {
    return NextResponse.json(
      { error: "a1 and web_session are required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from("xhs_cookies").upsert({
    id: 1,
    a1,
    web_session,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
