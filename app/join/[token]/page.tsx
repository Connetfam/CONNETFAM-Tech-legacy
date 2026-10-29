"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function JoinFamilyPage() {
const params = useParams<{ token: string }>();
const router = useRouter();
const token = params.token;

const [familyName, setFamilyName] = useState("");
const [loading, setLoading] = useState(true);
const [checkingSession, setCheckingSession] = useState(true);
const [signedIn, setSignedIn] = useState(false);
const [joining, setJoining] = useState(false);
const [error, setError] = useState("");

const returnTo = `/join/${encodeURIComponent(token)}`;
const loginUrl = `/login?redirect=${encodeURIComponent(returnTo)}`;
const signupUrl = `/signup?redirect=${encodeURIComponent(returnTo)}`;

useEffect(() => {
async function initialisePage() {
try {
const [invitationResponse, sessionResult] = await Promise.all([
fetch(
`/api/family-invitations/validate?token=${encodeURIComponent(token)}`,
{ cache: "no-store" }
),
supabase.auth.getSession(),
]);

const invitation = await invitationResponse.json();

if (!invitationResponse.ok || !invitation.valid) {
setError(
invitation.error ||
"This invitation is invalid, has expired, or has already been used."
);
} else {
setFamilyName(invitation.familyName || "your family");
}

setSignedIn(Boolean(sessionResult.data.session));
} catch {
setError("Could not verify this invitation. Please try again.");
} finally {
setLoading(false);
setCheckingSession(false);
}
}

if (token) {
initialisePage();
}
}, [token]);

async function handleJoin() {
setJoining(true);
setError("");

try {
const {
data: { session },
error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session) {
setSignedIn(false);
setError("Please log in to accept this invitation.");
return;
}

const response = await fetch("/api/family-invitations/accept", {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${session.access_token}`,
},
body: JSON.stringify({ token }),
});

const result = await response.json();

if (!response.ok) {
setError(result.error || "Could not join this family.");
return;
}

if (!result.familyId) {
setError(
"You joined successfully, but we could not open the family page."
);
return;
}

router.replace(
`/dashboard/family-home?id=${encodeURIComponent(String(result.familyId))}`
);
router.refresh();
} catch {
setError("Something went wrong. Please try again.");
} finally {
setJoining(false);
}
}

if (loading || checkingSession) {
return (
<main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
<p className="text-gray-600">Checking your family invitation...</p>
</main>
);
}

return (
<main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
<section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-lg">
<div className="mb-5 text-5xl">🌳</div>

<p className="mb-2 text-sm font-semibold uppercase tracking-wider text-green-700">
ConnetFam
</p>

<h1 className="text-3xl font-bold text-gray-900">
Join Your Family
</h1>

{error ? (
<p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
{error}
</p>
) : (
<>
<p className="mt-4 text-gray-600">
You have been invited to join{" "}
<strong className="text-gray-900">{familyName}</strong>.
</p>

{!signedIn ? (
<div className="mt-7 space-y-3">
<Link
href={loginUrl}
className="block w-full rounded-xl bg-green-700 px-5 py-3 text-center font-semibold text-white hover:bg-green-800"
>
Log In to Join
</Link>

<Link
href={signupUrl}
className="block w-full rounded-xl border border-green-700 px-5 py-3 text-center font-semibold text-green-800 hover:bg-green-50"
>
Create an Account
</Link>

<p className="pt-2 text-center text-sm text-gray-500">
Already have a ConnetFam account? Log in. New to ConnetFam?
Create an account first.
</p>
</div>
) : (
<div className="mt-7">
<p className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">
You are logged in. Accept the invitation to join{" "}
{familyName}.
</p>

<button
type="button"
onClick={handleJoin}
disabled={joining}
className="w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{joining ? "Joining family..." : "Accept Invitation"}
</button>
</div>
)}
</>
)}

<p className="mt-6 text-center text-xs text-gray-500">
Family invitations are temporary and may expire.
</p>
</section>
</main>
);
}