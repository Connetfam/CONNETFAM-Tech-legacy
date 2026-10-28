import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
try {
const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
return NextResponse.json(
{ error: "Please sign in before accepting this invitation." },
{ status: 401 }
);
}

const accessToken = authorization.slice("Bearer ".length);
const body = await request.json();
const token = body.token;

if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
return NextResponse.json(
{ error: "This invitation link is invalid." },
{ status: 400 }
);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
return NextResponse.json(
{ error: "Supabase is not configured correctly." },
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
{ error: "Your session has expired. Please sign in again." },
{ status: 401 }
);
}

const tokenHash = createHash("sha256").update(token).digest("hex");

const { data: invitation, error: invitationError } = await supabase
.from("family_invitations")
.select("id, family_id, invited_email, status, expires_at")
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
{ error: "This invitation has expired. Please request a new one." },
{ status: 410 }
);
}

if (
invitation.invited_email &&
invitation.invited_email.toLowerCase() !== user.email?.toLowerCase()
) {
return NextResponse.json(
{
error:
"This invitation was sent to a different email address. Please sign in with the invited email.",
},
{ status: 403 }
);
}

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError || !profile) {
console.error("Profile lookup failed:", profileError);
return NextResponse.json(
{
error:
"Your family profile could not be found. Please complete your profile first.",
},
{ status: 403 }
);
}

const { data: existingMembership, error: membershipLookupError } =
await supabase
.from("family_members")
.select("profile_id")
.eq("family_id", invitation.family_id)
.eq("profile_id", profile.id)
.maybeSingle();

if (membershipLookupError) {
console.error("Membership lookup failed:", membershipLookupError);
return NextResponse.json(
{ error: "Could not check your existing family membership." },
{ status: 500 }
);
}

if (!existingMembership) {
const { error: insertMembershipError } = await supabase
.from("family_members")
.insert({
family_id: invitation.family_id,
profile_id: profile.id,
role: "member",
status: "active",
joined_at: new Date().toISOString(),
created_by: user.id,
updated_at: new Date().toISOString(),
is_active: true,
});

if (insertMembershipError) {
console.error("Family membership creation failed:", insertMembershipError);
return NextResponse.json(
{
error:
"Could not add you to the family. Please check the family membership permissions.",
},
{ status: 500 }
);
}
}

const { data: family, error: familyError } = await supabase
.from("families")
.select("name")
.eq("id", invitation.family_id)
.maybeSingle();

if (familyError || !family) {
console.error("Family lookup failed:", familyError);
return NextResponse.json(
{ error: "You were processed, but the family name could not be loaded." },
{ status: 500 }
);
}

const { error: updateInvitationError } = await supabase
.from("family_invitations")
.update({
status: "accepted",
accepted_by: user.id,
accepted_at: new Date().toISOString(),
})
.eq("id", invitation.id)
.eq("status", "pending");

if (updateInvitationError) {
console.error("Invitation update failed:", updateInvitationError);
return NextResponse.json(
{
error:
"Your membership was processed, but the invitation status could not be updated.",
},
{ status: 500 }
);
}

return NextResponse.json({
success: true,
familyName: family.name,
});
} catch (error) {
console.error("Invitation acceptance error:", error);
return NextResponse.json(
{ error: "Something went wrong while accepting the invitation." },
{ status: 500 }
);
}
}