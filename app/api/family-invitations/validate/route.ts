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
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase server environment variables.");

      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
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
      console.error("Invitation lookup failed:", invitationError);

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
      .select("id, name")
      .eq("id", invitation.family_id)
      .maybeSingle();

    if (familyError) {
      console.error("Family lookup failed:", familyError);

      return NextResponse.json(
        { error: "Could not load the family." },
        { status: 500 }
      );
    }

    if (!family) {
      console.error(
        "Invitation points to a missing family. Family ID:",
        invitation.family_id
      );

      return NextResponse.json(
        { error: "The family linked to this invitation could not be found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      familyId: family.id,
      familyName: family.name,
    });
  } catch (error) {
    console.error("Invitation validation error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while checking the invitation." },
      { status: 500 }
    );
  }
}