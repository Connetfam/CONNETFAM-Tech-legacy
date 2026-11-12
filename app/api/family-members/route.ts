import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const publishableKey =
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const secretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
supabaseUrl,
secretKey,
{
auth: {
autoRefreshToken: false,
persistSession: false,
},
}
);

export async function POST(request: NextRequest) {
try {
// Authenticate the person making the decision.

const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
return NextResponse.json(
{ success: false, error: "Please log in first." },
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
{ success: false, error: "Your session is invalid." },
{ status: 401 }
);
}

// Read the request.

const body = await request.json();

const membershipId = Number(body.membershipId);
const action = body.action;

if (
!Number.isSafeInteger(membershipId) ||
membershipId <= 0 ||
!["approve", "reject"].includes(action)
) {
return NextResponse.json(
{ success: false, error: "Invalid request details." },
{ status: 400 }
);
}

// Find the owner's profile.

const { data: ownerProfile, error: ownerProfileError } =
await supabaseAdmin
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (ownerProfileError || !ownerProfile) {
return NextResponse.json(
{ success: false, error: "Your profile could not be found." },
{ status: 404 }
);
}

// Find the pending membership.

const { data: targetMembership, error: membershipError } =
await supabaseAdmin
.from("family_members")
.select(
"id, family_id, profile_id, relative_id, role, status, is_active"
)
.eq("id", membershipId)
.maybeSingle();

if (membershipError || !targetMembership) {
return NextResponse.json(
{ success: false, error: "Membership request not found." },
{ status: 404 }
);
}

if (
targetMembership.status !== "pending" ||
targetMembership.is_active
) {
return NextResponse.json(
{
success: false,
error: "This membership request is no longer pending.",
},
{ status: 409 }
);
}

// Confirm that the person making the decision is the owner.

const { data: ownerMembership, error: ownerError } =
await supabaseAdmin
.from("family_members")
.select("id")
.eq("family_id", targetMembership.family_id)
.eq("profile_id", ownerProfile.id)
.eq("role", "owner")
.eq("status", "active")
.eq("is_active", true)
.maybeSingle();

if (ownerError) throw ownerError;

if (!ownerMembership) {
return NextResponse.json(
{
success: false,
error: "Only the active family owner can approve or reject requests.",
},
{ status: 403 }
);
}

// The owner cannot approve their own membership request.

if (targetMembership.profile_id === ownerProfile.id) {
return NextResponse.json(
{
success: false,
error: "You cannot approve your own membership request.",
},
{ status: 403 }
);
}

// Find the invited person's actual auth UUID.

const { data: invitedProfile, error: invitedProfileError } =
await supabaseAdmin
.from("profiles")
.select("id, user_id")
.eq("id", targetMembership.profile_id)
.maybeSingle();

if (invitedProfileError || !invitedProfile) {
return NextResponse.json(
{
success: false,
error: "The invited person's profile could not be found.",
},
{ status: 404 }
);
}

if (action === "approve") {
// Link the account to the existing family-tree person.

if (targetMembership.relative_id) {
const { data: relative, error: relativeError } =
await supabaseAdmin
.from("family_relatives")
.select("id, family_id, profile_id")
.eq("id", targetMembership.relative_id)
.eq("family_id", targetMembership.family_id)
.maybeSingle();

if (relativeError || !relative) {
return NextResponse.json(
{
success: false,
error: "The linked family-tree person could not be found.",
},
{ status: 404 }
);
}

if (
relative.profile_id &&
relative.profile_id !== invitedProfile.id
) {
return NextResponse.json(
{
success: false,
error: "This family-tree person is already connected to another account.",
},
{ status: 409 }
);
}

if (!relative.profile_id) {
const { data: linkedRelative, error: linkError } =
await supabaseAdmin
.from("family_relatives")
.update({
profile_id: invitedProfile.id,
})
.eq("id", relative.id)
.eq("family_id", targetMembership.family_id)
.is("profile_id", null)
.select("id")
.maybeSingle();

if (linkError) throw linkError;

if (!linkedRelative) {
return NextResponse.json(
{
success: false,
error: "This family-tree person was linked to another account. Please refresh and try again.",
},
{ status: 409 }
);
}
}
}

// Activate membership only after the person has been linked.

const { data: approvedMembership, error: approveError } =
await supabaseAdmin
.from("family_members")
.update({
status: "active",
is_active: true,
joined_at: new Date().toISOString(),
updated_at: new Date().toISOString(),
})
.eq("id", membershipId)
.eq("status", "pending")
.eq("is_active", false)
.select("id")
.maybeSingle();

if (approveError) throw approveError;

if (!approvedMembership) {
return NextResponse.json(
{
success: false,
error: "The request changed before it could be approved. Please refresh.",
},
{ status: 409 }
);
}
} else {
// Reject the request.

const { data: rejectedMembership, error: rejectError } =
await supabaseAdmin
.from("family_members")
.update({
status: "rejected",
is_active: false,
updated_at: new Date().toISOString(),
})
.eq("id", membershipId)
.eq("status", "pending")
.eq("is_active", false)
.select("id")
.maybeSingle();

if (rejectError) throw rejectError;

if (!rejectedMembership) {
return NextResponse.json(
{
success: false,
error: "The request changed before it could be rejected. Please refresh.",
},
{ status: 409 }
);
}
}

// Notify the invited person using their actual auth UUID.

const notification = {
user_id: invitedProfile.user_id,
actor_user_id: user.id,
family_id: targetMembership.family_id,
type:
action === "approve"
? "family_join_approved"
: "family_join_rejected",
title:
action === "approve"
? "Your family request was approved"
: "Your family request was declined",
message:
action === "approve"
? "Your membership has been approved. You can now access your family workspace."
: "Your request to join this family was declined.",
link: "/dashboard",
is_read: false,
metadata: {
membership_id: membershipId,
family_id: targetMembership.family_id,
},
};

const { error: notificationError } =
await supabaseAdmin
.from("notifications")
.insert(notification);

if (notificationError) {
console.error(
"Membership decision notification error:",
notificationError
);
}

return NextResponse.json({
success: true,
status: action === "approve" ? "active" : "rejected",
message:
action === "approve"
? "Family membership approved successfully."
: "Family membership request rejected.",
});
} catch (error) {
console.error("Membership approval error:", error);

return NextResponse.json(
{
success: false,
error:
error instanceof Error
? error.message
: "Something went wrong while processing the membership request.",
},
{ status: 500 }
);
}
}
