import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
let newlyLinkedRelativeId: number | null = null;
let membershipId: number | null = null;

try {
const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
return NextResponse.json(
{ success: false, error: "Please log in first." },
{ status: 401 }
);
}

const authClient = createClient(supabaseUrl, publishableKey);

const {
data: { user },
error: authError,
} = await authClient.auth.getUser(authorization.substring(7));

if (authError || !user) {
return NextResponse.json(
{ success: false, error: "Your session is invalid." },
{ status: 401 }
);
}

const body = await request.json();
membershipId = Number(body.membershipId);
const action = body.action;

if (
!Number.isInteger(membershipId) ||
membershipId <= 0 ||
!["approve", "reject"].includes(action)
) {
return NextResponse.json(
{ success: false, error: "Invalid approval request." },
{ status: 400 }
);
}

// Find the current user's profile.
const { data: ownerProfile, error: profileError } =
await supabaseAdmin
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError) throw profileError;

if (!ownerProfile) {
return NextResponse.json(
{ success: false, error: "Your profile could not be found." },
{ status: 404 }
);
}

// Find the membership request.
const { data: membership, error: membershipError } =
await supabaseAdmin
.from("family_members")
.select(
"id, family_id, profile_id, relative_id, status, is_active"
)
.eq("id", membershipId)
.maybeSingle();

if (membershipError) throw membershipError;

if (!membership) {
return NextResponse.json(
{ success: false, error: "Membership request not found." },
{ status: 404 }
);
}

if (
membership.status !== "pending" ||
membership.is_active === true
) {
return NextResponse.json(
{ success: false, error: "This request has already been processed." },
{ status: 400 }
);
}

if (membership.profile_id === ownerProfile.id) {
return NextResponse.json(
{ success: false, error: "You cannot approve your own request." },
{ status: 403 }
);
}

// Only an active family owner can approve or reject.
const { data: ownerMembership, error: ownerError } =
await supabaseAdmin
.from("family_members")
.select("id")
.eq("family_id", membership.family_id)
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
error: "Only an active family owner can approve requests.",
},
{ status: 403 }
);
}

// Find the account making the request.
const { data: requestingProfile, error: requestingProfileError } =
await supabaseAdmin
.from("profiles")
.select("id, user_id")
.eq("id", membership.profile_id)
.maybeSingle();

if (requestingProfileError) throw requestingProfileError;

if (!requestingProfile) {
return NextResponse.json(
{ success: false, error: "The requesting profile was not found." },
{ status: 404 }
);
}

if (action === "reject") {
const { error: rejectError } = await supabaseAdmin
.from("family_members")
.update({
status: "rejected",
is_active: false,
})
.eq("id", membership.id)
.eq("status", "pending");

if (rejectError) throw rejectError;

await supabaseAdmin.from("notifications").insert({
user_id: requestingProfile.user_id,
family_id: membership.family_id,
actor_user_id: user.id,
type: "family_join_rejected",
title: "Family request declined",
message: "Your request to join the family was declined.",
link: "/dashboard",
is_read: false,
metadata: {
membership_id: membership.id,
family_id: membership.family_id,
},
});

return NextResponse.json({
success: true,
status: "rejected",
message: "The membership request has been rejected.",
});
}

// APPROVAL: Link the account to its existing family-tree person.
if (membership.relative_id) {
const { data: relative, error: relativeError } =
await supabaseAdmin
.from("family_relatives")
.select("id, family_id, profile_id")
.eq("id", membership.relative_id)
.eq("family_id", membership.family_id)
.maybeSingle();

if (relativeError) throw relativeError;

if (!relative) {
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
relative.profile_id !== membership.profile_id
) {
return NextResponse.json(
{
success: false,
error: "This family-tree person is already linked to another account.",
},
{ status: 409 }
);
}

if (!relative.profile_id) {
const { data: linkedRelative, error: linkError } =
await supabaseAdmin
.from("family_relatives")
.update({ profile_id: membership.profile_id })
.eq("id", relative.id)
.eq("family_id", membership.family_id)
.is("profile_id", null)
.select("id")
.maybeSingle();

if (linkError) throw linkError;

if (!linkedRelative) {
return NextResponse.json(
{
success: false,
error: "This family-tree person has just been linked to another account. Refresh and try again.",
},
{ status: 409 }
);
}

newlyLinkedRelativeId = relative.id;
}
}

// Activate the membership only after the tree link succeeds.
const { data: approvedMembership, error: approveError } =
await supabaseAdmin
.from("family_members")
.update({
status: "active",
is_active: true,
joined_at: new Date().toISOString(),
})
.eq("id", membership.id)
.eq("status", "pending")
.select("id")
.maybeSingle();

if (approveError) throw approveError;

if (!approvedMembership) {
// Undo the new link if the membership could not be activated.
if (newlyLinkedRelativeId) {
await supabaseAdmin
.from("family_relatives")
.update({ profile_id: null })
.eq("id", newlyLinkedRelativeId)
.eq("profile_id", membership.profile_id);
}

return NextResponse.json(
{
success: false,
error: "The request could not be approved. Please refresh and try again.",
},
{ status: 409 }
);
}

// Notify the person whose request was approved.
const { error: notificationError } = await supabaseAdmin
.from("notifications")
.insert({
user_id: requestingProfile.user_id,
family_id: membership.family_id,
actor_user_id: user.id,
type: "family_join_approved",
title: "Family membership approved",
message: "Your request has been approved. You are now a family member.",
link: "/dashboard/family-home",
is_read: false,
metadata: {
membership_id: membership.id,
family_id: membership.family_id,
},
});

if (notificationError) {
console.error("Approval notification error:", notificationError);
}

return NextResponse.json({
success: true,
status: "active",
familyId: membership.family_id,
relativeId: membership.relative_id,
message: "The family membership has been approved successfully.",
});
} catch (error) {
console.error("Family membership approval error:", error);

// Undo a newly created tree link if approval failed unexpectedly.
if (newlyLinkedRelativeId && membershipId) {
const { data: membership } = await supabaseAdmin
.from("family_members")
.select("profile_id, status")
.eq("id", membershipId)
.maybeSingle();

if (membership?.status !== "active" && membership?.profile_id) {
await supabaseAdmin
.from("family_relatives")
.update({ profile_id: null })
.eq("id", newlyLinkedRelativeId)
.eq("profile_id", membership.profile_id);
}
}

return NextResponse.json(
{
success: false,
error:
error instanceof Error
? error.message
: "Unable to process the membership request.",
},
{ status: 500 }
);
}
}
