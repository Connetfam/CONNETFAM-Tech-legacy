"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function JoinFamilyPage() {
const params = useParams<{ token: string }>();
const router = useRouter();

const [familyName, setFamilyName] = useState("");
const [loading, setLoading] = useState(true);
const [joining, setJoining] = useState(false);
const [error, setError] = useState("");
const [message, setMessage] = useState("");

useEffect(() => {
async function checkInvitation() {
try {
const response = await fetch(
`/api/family-invitations/validate?token=${encodeURIComponent(params.token)}`
);

const result = await response.json();

if (!response.ok) {
setError(result.error || "This invitation is invalid or has expired.");
return;
}

setFamilyName(result.familyName);
} catch {
setError("Could not verify this invitation. Please try again.");
} finally {
setLoading(false);
}
}

if (params.token) {
checkInvitation();
}
}, [params.token]);

async function handleJoin() {
setJoining(true);
setError("");
setMessage("");

try {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
const returnTo = `/join/${encodeURIComponent(params.token)}`;
router.push(`/login?redirect=${encodeURIComponent(returnTo)}`);
return;
}

const {
data: { session },
} = await supabase.auth.getSession();

if (!session) {
setError("Please sign in again, then reopen this invitation.");
return;
}

const response = await fetch("/api/family-invitations/accept", {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${session.access_token}`,
},
body: JSON.stringify({ token: params.token }),
});

const result = await response.json();

if (!response.ok) {
setError(result.error || "Could not join this family.");
return;
}

setMessage(`You have joined ${result.familyName || familyName}!`);
router.push("/dashboard");
router.refresh();
} catch {
setError("Something went wrong. Please try again.");
} finally {
setJoining(false);
}
}

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center p-6">
<p>Checking your family invitation...</p>
</main>
);
}

return (
<main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
<section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-lg">
<div className="mb-5 text-4xl">🌳</div>

<h1 className="text-3xl font-bold text-gray-900">
Join Your Family
</h1>

{error ? (
<p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
{error}
</p>
) : (
<p className="mt-4 text-gray-600">
{familyName
? `You have been invited to join ${familyName} on ConnetFam.`
: "You have received a family invitation on ConnetFam."}
</p>
)}

{message && (
<p className="mt-4 rounded-xl bg-green-50 p-4 text-green-700">
{message}
</p>
)}

<button
type="button"
onClick={handleJoin}
disabled={joining || Boolean(error)}
className="mt-6 w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
>
{joining ? "Joining family..." : "Accept Invitation"}
</button>

<p className="mt-4 text-sm text-gray-500">
Invitation links are temporary and may expire.
</p>
</section>
</main>
);
}