"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function SignupPage() {
const searchParams = useSearchParams();
const redirectTo = searchParams.get("redirect");

const safeRedirect =
redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
? redirectTo
: "/dashboard";

const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);

async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault();
setLoading(true);
setMessage("");

try {
const { data, error } = await supabase.auth.signUp({
email: email.trim(),
password,
options: {
data: {
full_name: fullName.trim(),
},
emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
},
});

if (error) {
setMessage(error.message);
return;
}

if (data.session) {
window.location.assign(safeRedirect);
return;
}

setMessage(
"Account created. Check your email to verify your address before continuing."
);
} catch (error) {
console.error("Signup error:", error);
setMessage("Something went wrong. Please try again.");
} finally {
setLoading(false);
}
}

const loginUrl = `/login?redirect=${encodeURIComponent(safeRedirect)}`;

return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-6 text-[#1f2937]">
<div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
<p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
CONNETFAM
</p>

<h1 className="mb-2 text-3xl font-bold">
Create your Legacy Family account
</h1>

<p className="mb-8 text-gray-600">
Start preserving your family&apos;s story for generations.
</p>

<form onSubmit={handleSignup} className="space-y-5">
<div>
<label htmlFor="fullName" className="mb-2 block font-medium">
Full name
</label>
<input
id="fullName"
type="text"
value={fullName}
onChange={(e) => setFullName(e.target.value)}
autoComplete="name"
required
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
placeholder="Your full name"
/>
</div>

<div>
<label htmlFor="email" className="mb-2 block font-medium">
Email
</label>
<input
id="email"
type="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
autoComplete="email"
required
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
placeholder="you@example.com"
/>
</div>

<div>
<label htmlFor="password" className="mb-2 block font-medium">
Password
</label>
<input
id="password"
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
autoComplete="new-password"
minLength={6}
required
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
placeholder="At least 6 characters"
/>
</div>

<button
type="submit"
disabled={loading}
className="w-full rounded-xl bg-[#17352b] px-4 py-3 font-semibold text-white hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-60"
>
{loading ? "Creating account..." : "Create Account"}
</button>

{message && (
<p role="status" aria-live="polite" className="mt-4 text-sm">
{message}
</p>
)}
</form>

<p className="mt-6 text-center text-sm text-gray-600">
Already have an account?{" "}
<Link
href={loginUrl}
className="font-semibold text-emerald-700 hover:underline"
>
Log in
</Link>
</p>
</div>
</main>
);
}