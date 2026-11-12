import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const publishableKey =
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(
supabaseUrl,
process.env.SUPABASE_SECRET_KEY!,
{
auth: {
autoRefreshToken: false,
persistSession: false,
},
}
);

export async function POST(request: NextRequest) {
try {
const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
return NextResponse.json(
{ error: "Please log in first." },
{ status: 401 }
);
}

const authClient = createClient(
supabaseUrl,
publishableKey
);

const {
data: { user },
error: authError,
} = await authClient.auth.getUser(
authorization.substring(7)
);

if (authError || !user) {
return NextResponse.json(
{ error: "Your session is invalid." },
{ status: 401 }
);
}

const { token } = await request.json();

if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
return NextResponse.json(
{ error: "Invalid invitation token." },
{ status: 400 }
);
}

const tokenHash = createHash("sha256")
.update(token)
.digest("hex");

const { data: invitation, error: invitationError } =
await supabaseAdmin
.from("family_invitations")
.select(
"id, family_id, relative_id, invited_by, invited_email, status, expires_at"
)
.eq("token_hash", tokenHash)
.maybeSingle();

if (invitationError || !invitation) {
return NextResponse.json(
{ error: "Invitation not found." },
{ status: 404 }
);
}

if (invitation.status !== "pending") {
return NextResponse.json(
{ error: "This invitation is no longer available." },
{ status: 400 }
);
}

if (
new Date(invitation.expires_at).getTime() < Date.now()
) {
return NextResponse.json(
{ error: "This invitation has expired." },
{ status: 400 }
);
}

if (
invitation.invited_email &&
invitation.invited_email.toLowerCase() !==
user.email?.toLowerCase()
) {
return NextResponse.json(
{
error:
"Please log in using the email address invited to this family.",
},
{ status: 403 }
);
}

// Find the invited user's profile.

const { data: profile, error: profileError } =
await supabaseAdmin
.from("profiles")
.select("id, user_id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError || !profile) {
return NextResponse.json(
{ error: "Your profile could not be found." },
{ status: 404 }
);
}

// Verify the existing family-tree person.

if (invitation.relative_id) {
const { data: relative, error: relativeError } =
await supabaseAdmin
.from("family_relatives")
.select("id, profile_id")
.eq("id", invitation.relative_id)
.eq("family_id", invitation.family_id)
.maybeSingle();

if (relativeError || !relative) {
return NextResponse.json(
{
error:
"The invited family-tree person could not be found.",
},
{ status: 404 }
);
}

if (
relative.profile_id &&
relative.profile_id !== profile.id
) {
return NextResponse.json(
{
error:
"This family-tree person is already linked to another account.",
},
{ status: 409 }
);
}
}

// Check whether this account already has a membership.

const { data: existingMembership, error: existingError } =
await supabaseAdmin
.from("family_members")
.select("id, status, relative_id, is_active")
.eq("family_id", invitation.family_id)
.eq("profile_id", profile.id)
.limit(1)
.maybeSingle();

if (existingError) throw existingError;

let membershipId: number;

if (existingMembership) {
if (
existingMembership.status === "active" &&
existingMembership.is_active
) {
return NextResponse.json({
success: true,
status: "active",
familyId: invitation.family_id,
message: "You are already an active family member.",
});
}

if (existingMembership.status === "rejected") {
return NextResponse.json(
{
error:
"Your previous membership request was rejected. Please contact the family owner.",
},
{ status: 403 }
);
}

// Keep an existing pending membership pending.

if (
existingMembership.status === "pending" &&
!existingMembership.relative_id &&
invitation.relative_id
) {
const { error: relativeUpdateError } =
await supabaseAdmin
.from("family_members")
.update({
relative_id: invitation.relative_id,
})
.eq("id", existingMembership.id)
.eq("status", "pending");

if (relativeUpdateError) {
throw relativeUpdateError;
}
}

membershipId = existingMembership.id;
} else {
// New membership requests are ALWAYS pending.

const { data: newMembership, error: membershipError } =
await supabaseAdmin
.from("family_members")
.insert({
family_id: invitation.family_id,
profile_id: profile.id,
relative_id: invitation.relative_id,
role: "member",
status: "pending",
is_active: false,
invited_by: invitation.invited_by,
created_by: invitation.invited_by,
})
.select("id")
.single();

if (membershipError || !newMembership) {
console.error(
"Membership creation error:",
membershipError
);

return NextResponse.json(
{
error:
"Could not create your membership request.",
},
{ status: 500 }
);
}

membershipId = newMembership.id;
}

// Mark the invitation as accepted, not the membership.

const { error: updateInvitationError } =
await supabaseAdmin
.from("family_invitations")
.update({
status: "accepted",
accepted_by: user.id,
accepted_at: new Date().toISOString(),
})
.eq("id", invitation.id)
.eq("status", "pending");

if (updateInvitationError) {
throw updateInvitationError;
}

// Find active family owners.

const { data: owners, error: ownersError } =
await supabaseAdmin
.from("family_members")
.select("profile_id")
.eq("family_id", invitation.family_id)
.eq("role", "owner")
.eq("status", "active")
.eq("is_active", true);

if (ownersError) throw ownersError;

const ownerProfileIds = [
...new Set(
(owners || []).map((owner) => owner.profile_id)
),
];

let notificationCreated = false;

if (ownerProfileIds.length > 0) {
// notifications.user_id must receive the actual UUID,
// not the bigint profiles.id.

const { data: ownerProfiles, error: ownerProfilesError } =
await supabaseAdmin
.from("profiles")
.select("user_id")
.in("id", ownerProfileIds);

if (ownerProfilesError) throw ownerProfilesError;

const notifications = (ownerProfiles || []).map(
(ownerProfile) => ({
user_id: ownerProfile.user_id,
actor_user_id: user.id,
family_id: invitation.family_id,
type: "family_join_request",
title: "New family membership request",
message:
"Someone has requested to join your family. Review their request.",
link: "/dashboard/family-members",
is_read: false,
metadata: {
membership_id: membershipId,
family_id: invitation.family_id,
},
})
);

if (notifications.length > 0) {
const { error: notificationError } =
await supabaseAdmin
.from("notifications")
.insert(notifications);

if (notificationError) {
console.error(
"Notification creation error:",
notificationError
);
} else {
notificationCreated = true;
}
}
}

return NextResponse.json({
success: true,
status: "pending",
familyId: invitation.family_id,
membershipId,
notificationCreated,
message:
"Your membership request has been sent. The family owner must approve it before you can access the family workspace.",
});
} catch (error) {
console.error("Invitation acceptance error:", error);

return NextResponse.json(
{
error:
error instanceof Error
? error.message
: "Something went wrong while accepting the invitation.",
},
{ status: 500 }
);
}
}
