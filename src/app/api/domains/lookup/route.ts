import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { initDatabase } from "@/lib/db-init";

export async function GET(req: Request) {
  try {
    await initDatabase();
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json({ success: false, error: "Missing domain" }, { status: 400 });
    }

    // Lookup custom domain and verify creator premium status
    const result = await sql`
      SELECT cd.form_id, u.is_premium, u.role
      FROM custom_domains cd
      JOIN users u ON cd.user_id = u.id
      WHERE cd.domain = ${domain} AND cd.status = 'active'
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Domain not registered or pending" }, { status: 404 });
    }

    const { form_id, is_premium, role } = result[0];
    const isPremium = is_premium || role === "super_admin";

    if (!isPremium) {
      return NextResponse.json({ success: false, error: "Owner is not premium" }, { status: 403 });
    }

    return NextResponse.json({ success: true, formId: form_id });
  } catch (error: any) {
    console.error("Domain lookup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
