import { createClient } from “@supabase/supabase-js”;
import { NextRequest, NextResponse } from “next/server”;
import { createHash, randomBytes } from “crypto”;

export const runtime = “nodejs”;

export async function POST(request: NextRequest) {
try {
const authorization = request.headers.get(“authorization”);

if (!authorization?.startsWith("Bearer ")) {
  return NextResponse.json(
    { error: "Please sign in before creating an invitation." },
    { status: 401 }
  );
}

const accessToken = authorization.slice("Bearer ".length);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  return NextResponse.json(
    { error: "Supabase environment variables are missing." },
    { status: 500 }
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  },
});

const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser(accessToken);

if (authError || !user) {
  return NextResponse.json(
    { error: "Your session is invalid or has expired. Please sign in again." },
    { status: 401 }
  );
}

const body = await request.json();
const familyId = Number(body.familyId);
const invitedEmail =
  typeof body.email === "string" && body.email.trim()
    ? body.email.trim().toLowerCase()
    : null;

if (!Number.isSafeInteger(familyId) || familyId <= 0) {
  return NextResponse.json(
    { error: "A valid family ID is required." },
    { status: 400 }
  );
}

if (
  invitedEmail &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)
) {
  return NextResponse.json(
    { error: "Please enter a valid email address." },
    { status: 400 }
  );
}

// Confirm the user has an active profile and family membership.
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id")
  .eq("user_id", user.id)
  .maybeSingle();

if (profileError) {
  console.error("Invitation profile lookup failed:", profileError);
  return NextResponse.json(
    { error: "Could not verify your family profile." },
    { status: 500 }
  );
}

if (!profile) {
  return NextResponse.json(
    { error: "Your family profile could not be found." },
    { status: 403 }
  );
}

const { data: membership, error: membershipError } = await supabase
  .from("family_members")
  .select("family_id")
  .eq("family_id", familyId)
  .eq("profile_id", profile.id)
  .eq("status", "active")
  .eq("is_active", true)
  .maybeSingle();

if (membershipError) {
  console.error("Invitation membership lookup failed:", membershipError);
  return NextResponse.json(
    { error: "Could not verify your family membership." },
    { status: 500 }
  );
}

if (!membership) {
  return NextResponse.json(
    { error: "You must be an active member of this family to invite someone." },
    { status: 403 }
  );
}

// Generate a cryptographically random token; store only its SHA-256 hash.
const token = randomBytes(32).toString("hex");
const tokenHash = createHash("sha256").update(token).digest("hex");

const expiresAt = new Date(
  Date.now() + 7 * 24 * 60 * 60 * 1000
).toISOString();

const { error: insertError } = await supabase
  .from("family_invitations")
  .insert({
    family_id: familyId,
    invited_by: user.id,
    token_hash: tokenHash,
    invited_email: invitedEmail,
    status: "pending",
    expires_at: expiresAt,
  });

if (insertError) {
  console.error("Invitation creation failed:", insertError);
  return NextResponse.json(
    { error: "Could not create the invitation. Please try again." },
    { status: 500 }
  );
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!siteUrl) {
  return NextResponse.json(
    { error: "The application URL is not configured." },
    { status: 500 }
  );
}

const invitationUrl = new URL(
  `/join/${token}`,
  siteUrl
).toString();

return NextResponse.json({
  success: true,
  invitationUrl,
  expiresAt,
});
} catch (error) {
console.error(“Invitation API error:”, error);

return NextResponse.json(
  { error: "Something went wrong while creating the invitation." },
  { status: 500 }
);
}
}