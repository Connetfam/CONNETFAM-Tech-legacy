import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
try {
const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
return NextResponse.json(
{ success: false, error: "Please log in." },
{ status: 401 }
);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !publishableKey || !secretKey) {
throw new Error("Supabase environment variables are missing.");
}

const authClient = createClient(supabaseUrl, publishableKey);

const {
data: { user },
error: authError,
} = await authClient.auth.getUser(authorization.slice(7));

if (authError || !user) {
return NextResponse.json(
{ success: false, error: "Invalid or expired session." },
{ status: 401 }
);
}

const admin = createClient(supabaseUrl, secretKey, {
auth: {
autoRefreshToken: false,
persistSession: false,
},
});

const { data: profile, error: profileError } = await admin
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError) throw profileError;

if (!profile) {
return NextResponse.json(
{ success: false, error: "Profile not found." },
{ status: 404 }
);
}

const familyId = Number(
request.nextUrl.searchParams.get("familyId")
);

if (!Number.isSafeInteger(familyId) || familyId <= 0) {
return NextResponse.json(
{ success: false, error: "Invalid family ID." },
{ status: 400 }
);
}

// Confirm active owner permissions.

const { data: owner, error: ownerError } = await admin
.from("family_members")
.select("id")
.eq("family_id", familyId)
.eq("profile_id", profile.id)
.eq("role", "owner")
.eq("status", "active")
.eq("is_active", true)
.maybeSingle();

if (ownerError) throw ownerError;

if (!owner) {
return NextResponse.json(
{
success: false,
error: "Only an active family owner can view pending requests.",
},
{ status: 403 }
);
}

// Retrieve pending memberships.

const { data: requests, error: requestsError } = await admin
.from("family_members")
.select(
"id, family_id, profile_id, relative_id, role, status, created_at"
)
.eq("family_id", familyId)
.eq("status", "pending")
.eq("is_active", false)
.order("created_at", { ascending: false });

if (requestsError) throw requestsError;

const profileIds = [
...new Set((requests || []).map((item) => item.profile_id)),
];

const relativeIds = [
...new Set(
(requests || [])
.map((item) => item.relative_id)
.filter((id): id is number => id !== null)
),
];

let profiles: any[] = [];
let relatives: any[] = [];

if (profileIds.length > 0) {
const { data, error } = await admin
.from("profiles")
.select("id, user_id, full_name:display_name, avatar_url")
.in("id", profileIds);

if (error) {
// Fallback if avatar_url is unavailable.
const fallback = await admin
.from("profiles")
.select("id, user_id, full_name:display_name")
.in("id", profileIds);

if (fallback.error) throw fallback.error;

profiles = fallback.data || [];
} else {
profiles = data || [];
}
}

if (relativeIds.length > 0) {
const { data, error } = await admin
.from("family_relatives")
.select("id, full_name, relationship")
.in("id", relativeIds)
.eq("family_id", familyId);

if (error) throw error;

relatives = data || [];
}

const enrichedRequests = (requests || []).map((item) => ({
...item,
profile:
profiles.find(
(person) => person.id === item.profile_id
) || null,
relative:
relatives.find(
(person) => person.id === item.relative_id
) || null,
}));

return NextResponse.json(
{
success: true,
requests: enrichedRequests,
},
{
status: 200,
headers: {
"Cache-Control": "no-store",
},
}
);
} catch (error) {
console.error("Pending requests error:", error);

return NextResponse.json(
{
success: false,
error:
error instanceof Error
? error.message
: "Unable to load pending requests.",
},
{ status: 500 }
);
}
}
