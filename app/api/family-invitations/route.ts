import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const publishableKey =
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const secretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
auth: {
autoRefreshToken: false,
persistSession: false,
},
});

export async function POST(request: NextRequest) {
let createdRelativeId: number | null = null;

try {
const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
return NextResponse.json(
{ error: "Authentication required." },
{ status: 401 }
);
}

const accessToken = authorization.substring(7);

const authClient = createClient(
supabaseUrl,
publishableKey
);

const {
data: { user },
error: authError,
} = await authClient.auth.getUser(accessToken);

if (authError || !user) {
return NextResponse.json(
{ error: "Invalid session." },
{ status: 401 }
);
}

const body = await request.json();

const familyId = Number(body.familyId);

const fullName =
typeof body.fullName === "string"
? body.fullName.trim()
: "";

const relationship =
typeof body.relationship === "string"
? body.relationship.trim()
: "";

const email =
typeof body.email === "string"
? body.email.trim()
: "";

if (
!Number.isSafeInteger(familyId) ||
familyId <= 0
) {
return NextResponse.json(
{ error: "A valid family is required." },
{ status: 400 }
);
}

if (!fullName || fullName.length > 150) {
return NextResponse.json(
{ error: "Please enter a valid full name." },
{ status: 400 }
);
}

if (!relationship || relationship.length > 100) {
return NextResponse.json(
{ error: "Please enter their relationship to the family." },
{ status: 400 }
);
}

if (
email &&
!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
) {
return NextResponse.json(
{ error: "Please enter a valid email address." },
{ status: 400 }
);
}

// Find the current user's profile.

const { data: profile, error: profileError } =
await supabaseAdmin
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError || !profile) {
return NextResponse.json(
{ error: "Your profile could not be found." },
{ status: 404 }
);
}

// Verify active family membership.

const { data: membership, error: membershipError } =
await supabaseAdmin
.from("family_members")
.select("id, role")
.eq("family_id", familyId)
.eq("profile_id", profile.id)
.eq("status", "active")
.eq("is_active", true)
.maybeSingle();

if (membershipError || !membership) {
return NextResponse.json(
{ error: "You do not have active access to this family." },
{ status: 403 }
);
}

// Only owners and admins can invite.

if (!["owner", "admin"].includes(membership.role)) {
return NextResponse.json(
{
error:
"Only family owners and admins can invite members.",
},
{ status: 403 }
);
}

// Confirm the family exists.

const { data: family, error: familyError } =
await supabaseAdmin
.from("families")
.select("id, name")
.eq("id", familyId)
.maybeSingle();

if (familyError || !family) {
return NextResponse.json(
{ error: "Family could not be found." },
{ status: 404 }
);
}

// Create a new family-tree person.
// Email is optional.

const { data: relative, error: relativeError } =
await supabaseAdmin
.from("family_relatives")
.insert({
family_id: familyId,
full_name: fullName,
relationship,
email: email || null,
profile_id: null,
created_by: user.id,
})
.select("id")
.single();

if (relativeError || !relative) {
console.error(
"Family relative creation error:",
relativeError
);

return NextResponse.json(
{ error: "Could not add this person to the family tree." },
{ status: 500 }
);
}

createdRelativeId = relative.id;

// Generate a secure invitation token.

const token = randomBytes(32).toString("hex");

const tokenHash = createHash("sha256")
.update(token)
.digest("hex");

const expiresAt = new Date(
Date.now() + 7 * 24 * 60 * 60 * 1000
).toISOString();

// Create invitation linked to the new family-tree person.

const { error: invitationError } =
await supabaseAdmin
.from("family_invitations")
.insert({
family_id: familyId,
relative_id: relative.id,
invited_by: user.id,
token_hash: tokenHash,
invited_email: email || null,
status: "pending",
expires_at: expiresAt,
});

if (invitationError) {
console.error(
"Invitation creation error:",
invitationError
);

// Clean up the new family-tree person if
// the invitation could not be created.

await supabaseAdmin
.from("family_relatives")
.delete()
.eq("id", relative.id)
.eq("family_id", familyId);

createdRelativeId = null;

return NextResponse.json(
{ error: "Could not create the invitation." },
{ status: 500 }
);
}

const baseUrl =
process.env.NEXT_PUBLIC_SITE_URL ||
process.env.NEXT_PUBLIC_APP_URL ||
request.nextUrl.origin;

const invitationLink =
`${baseUrl.replace(/\/$/, "")}/join/${token}`;

return NextResponse.json({
success: true,
invitationType: "new_relative",
invitationLink,
relativeId: relative.id,
relativeName: fullName,
familyName: family.name,
expiresAt,
});
} catch (error) {
console.error("Invitation API error:", error);

// Best-effort cleanup if an unexpected error
// happens after creating the family-tree person.

if (createdRelativeId !== null) {
await supabaseAdmin
.from("family_relatives")
.delete()
.eq("id", createdRelativeId);
}

return NextResponse.json(
{
error:
"Something went wrong while creating the invitation.",
},
{ status: 500 }
);
}
}
