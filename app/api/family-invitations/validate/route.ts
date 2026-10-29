import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: "This invitation link is invalid." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error("Missing Supabase server environment variables.");

      return NextResponse.json(
        { error: "The invitation service is not configured correctly." },
        { status: 500 }
      );
    }

    // Server-side client: never expose this secret key in browser code.
    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const { data: invitation, error: invitationError } = await supabase
      .from("family_invitations")
      .select("family_id, status, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (invitationError) {
      console.error("Invitation validation failed:", invitationError);

      return NextResponse.json(
        { error: "Could not verify this invitation." },
        { status: 500 }
      );
    }

    if (!invitation || invitation.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation is invalid or has already been used." },
        { status: 404 }
      );
    }

    if (new Date(invitation.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This invitation has expired. Please request a new link." },
        { status: 410 }
      );
    }

    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("name")
      .eq("id", invitation.family_id)
      .maybeSingle();

    if (familyError || !family) {
      console.error("Invitation family lookup failed:", familyError);

      return NextResponse.json(
        { error: "Could not find the family for this invitation." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      familyName: family.name,
    });
  } catch (error) {
    console.error("Invitation validation API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while checking the invitation." },
      { status: 500 }
    );
  }
}