"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";

function LoginForm() {
const searchParams = useSearchParams();
const redirectTo = searchParams.get("redirect");

const safeRedirect =
redirectTo &&
redirectTo.startsWith("/") &&
!redirectTo.startsWith("//")
? redirectTo
: "/dashboard";

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);

async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault();
setLoading(true);
setMessage("");

try {
const { error } = await supabase.auth.signInWithPassword({
email: email.trim(),
password,
});

if (error) {
setMessage(error.message);
return;
}

window.location.assign(safeRedirect);
} catch (error) {
console.error("Login error:", error);
setMessage("Something went wrong. Please try again.");
} finally {
setLoading(false);
}
}

const signupUrl = `/signup?redirect=${encodeURIComponent(safeRedirect)}`;

return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-6 text-[#1f2937]">
<div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
<p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
CONNETFAM
</p>

<h1 className="mb-2 text-3xl font-bold">Welcome back</h1>

<p className="mb-8 text-gray-600">
Log in to continue preserving your family&apos;s story.
</p>

<form onSubmit={handleLogin} className="space-y-5">
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
autoComplete="current-password"
required
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
placeholder="Your password"
/>
</div>

<button
type="submit"
disabled={loading}
className="w-full rounded-xl bg-[#17352b] px-4 py-3 font-semibold text-white hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-60"
>
{loading ? "Logging in..." : "Log In"}
</button>

{message && (
<p role="status" aria-live="polite" className="text-sm text-red-700">
{message}
</p>
)}
</form>

<p className="mt-6 text-center text-sm text-gray-600">
Don&apos;t have an account?{" "}
<Link
href={signupUrl}
className="font-semibold text-emerald-700 hover:underline"
>
Create an account
</Link>
</p>
</div>
</main>
);
}

export default function LoginPage() {
return (
<Suspense
fallback={
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef]">
<p>Loading login page...</p>
</main>
}
>
<LoginForm />
</Suspense>
);
}