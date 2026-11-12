"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

type InvitationDetails = {
valid: boolean;
familyId?: number;
familyName?: string;
relativeName?: string | null;
error?: string;
};

export default function JoinFamilyPage() {
const params = useParams();
const router = useRouter();

const token = params.token as string;

const [invitation, setInvitation] =
useState<InvitationDetails | null>(null);

const [loading, setLoading] = useState(true);
const [accepting, setAccepting] = useState(false);
const [userLoggedIn, setUserLoggedIn] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const redirectPath = `/join/${token}`;
const encodedRedirect = encodeURIComponent(redirectPath);

const loadInvitation = useCallback(async () => {
try {
const response = await fetch(
`/api/family-invitations/validate?token=${encodeURIComponent(token)}`
);

const result = await response.json();

setInvitation(result);

const {
data: { session },
} = await supabase.auth.getSession();

setUserLoggedIn(Boolean(session));
} catch {
setError("Unable to load this invitation.");
} finally {
setLoading(false);
}
}, [token]);

useEffect(() => {
if (token) {
loadInvitation();
}
}, [token, loadInvitation]);

async function handleAccept() {
setAccepting(true);
setError("");
setMessage("");

try {
const {
data: { session },
} = await supabase.auth.getSession();

if (!session) {
setError("Please log in or create an account first.");
return;
}

const response = await fetch(
"/api/family-invitations/accept",
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${session.access_token}`,
},
body: JSON.stringify({ token }),
}
);

const result = await response.json();

if (!response.ok) {
setError(result.error || "Unable to accept invitation.");
return;
}

if (result.status === "active") {
router.push(
`/dashboard/family-home?family_id=${invitation?.familyId}`
);
return;
}

setMessage(
"Your request has been sent. The family owner must approve your membership before you can access the family space."
);
} catch {
setError("Something went wrong. Please try again.");
} finally {
setAccepting(false);
}
}

if (loading) {
return (
<main className="min-h-screen flex items-center justify-center bg-gray-50">
<p className="text-gray-600">Checking invitation...</p>
</main>
);
}

if (!invitation?.valid) {
return (
<main className="min-h-screen flex items-center justify-center bg-gray-50 px-5">
<div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
<h1 className="text-2xl font-bold text-gray-900">
Invitation unavailable
</h1>

<p className="mt-3 text-gray-600">
{invitation?.error || error || "This invitation is invalid or has expired."}
</p>

<Link
href="/"
className="mt-6 inline-block rounded-lg bg-green-700 px-6 py-3 text-white"
>
Go home
</Link>
</div>
</main>
);
}

return (
<main className="min-h-screen flex items-center justify-center bg-gray-50 px-5 py-10">
<div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
<div className="mb-6 text-center">
<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
🌳
</div>

<h1 className="text-3xl font-bold text-gray-900">
You're invited!
</h1>

<p className="mt-3 text-gray-600">
You've been invited to join
</p>

<h2 className="mt-2 text-2xl font-semibold text-green-800">
{invitation.familyName}
</h2>

{invitation.relativeName && (
<p className="mt-3 text-sm text-gray-500">
This invitation is connected to the existing family-tree
record for{" "}
<strong>{invitation.relativeName}</strong>.
</p>
)}
</div>

{message ? (
<div className="rounded-xl bg-green-50 p-5 text-center text-green-800">
<h3 className="font-semibold">
Request submitted
</h3>
<p className="mt-2 text-sm">{message}</p>
</div>
) : userLoggedIn ? (
<div>
<p className="mb-5 text-center text-gray-600">
Accept this invitation to request membership in the family.
</p>

<button
onClick={handleAccept}
disabled={accepting}
className="w-full rounded-xl bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
>
{accepting ? "Submitting..." : "Accept invitation"}
</button>
</div>
) : (
<div className="space-y-4">
<p className="text-center text-gray-600">
Join your family by creating an account or logging in.
</p>

<Link
href={`/signup?redirect=${encodedRedirect}`}
className="block w-full rounded-xl bg-green-700 px-6 py-3 text-center font-semibold text-white hover:bg-green-800"
>
Create Account
</Link>

<Link
href={`/login?redirect=${encodedRedirect}`}
className="block w-full rounded-xl border border-green-700 px-6 py-3 text-center font-semibold text-green-800 hover:bg-green-50"
>
Log In
</Link>
</div>
)}

{error && (
<p className="mt-5 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
{error}
</p>
)}

<p className="mt-8 text-center text-xs text-gray-400">
Your family stories deserve to be preserved.
</p>
</div>
</main>
);
}
