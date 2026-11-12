import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.SUPABASE_SECRET_KEY!
);

export async function GET(request: NextRequest) {
try {
const token = request.nextUrl.searchParams.get("token");

if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
return NextResponse.json(
{ valid: false, error: "Invalid invitation link." },
{ status: 400 }
);
}

const tokenHash = createHash("sha256")
.update(token)
.digest("hex");

const { data: invitation, error } = await supabaseAdmin
.from("family_invitations")
.select(
"id, family_id, relative_id, status, expires_at"
)
.eq("token_hash", tokenHash)
.maybeSingle();

if (error || !invitation) {
return NextResponse.json(
{ valid: false, error: "Invitation not found." },
{ status: 404 }
);
}

if (invitation.status !== "pending") {
return NextResponse.json(
{ valid: false, error: "This invitation has already been used or cancelled." },
{ status: 400 }
);
}

if (new Date(invitation.expires_at).getTime() < Date.now()) {
return NextResponse.json(
{ valid: false, error: "This invitation has expired." },
{ status: 400 }
);
}

const { data: family, error: familyError } =
await supabaseAdmin
.from("families")
.select("id, name")
.eq("id", invitation.family_id)
.maybeSingle();

if (familyError || !family) {
return NextResponse.json(
{ valid: false, error: "Family not found." },
{ status: 404 }
);
}

let relativeName = null;

if (invitation.relative_id) {
const { data: relative } = await supabaseAdmin
.from("family_relatives")
.select("id, full_name")
.eq("id", invitation.relative_id)
.eq("family_id", invitation.family_id)
.maybeSingle();

if (!relative) {
return NextResponse.json(
{ valid: false, error: "The family member linked to this invitation could not be found." },
{ status: 404 }
);
}

relativeName = relative.full_name;
}

return NextResponse.json({
valid: true,
familyId: invitation.family_id,
familyName: family.name,
relativeName,
expiresAt: invitation.expires_at,
});
} catch (error) {
console.error("Invitation validation error:", error);

return NextResponse.json(
{ valid: false, error: "Unable to validate invitation." },
{ status: 500 }
);
}
}
