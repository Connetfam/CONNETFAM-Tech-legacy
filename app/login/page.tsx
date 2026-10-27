"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
const router = useRouter();

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

setMessage("Login successful! Welcome to Legacy Family.");

router.replace("/dashboard");
router.refresh();
} catch (error) {
console.error("Login error:", error);
setMessage("Something went wrong. Please try again.");
} finally {
setLoading(false);
}
}

return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-6 text-[#1f2937]">
<div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
<p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
CONNETFAM
</p>

<h1 className="mb-2 text-3xl font-bold">
Welcome back to Legacy Family
</h1>

<p className="mb-8 text-gray-600">
Log in to continue preserving your family&apos;s story.
</p>

<form onSubmit={handleLogin} className="space-y-5">
<div>
<label
htmlFor="email"
className="mb-2 block font-medium"
>
Email
</label>

<input
id="email"
type="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
required
autoComplete="email"
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
placeholder="you@example.com"
/>
</div>

<div>
<label
htmlFor="password"
className="mb-2 block font-medium"
>
Password
</label>

<input
id="password"
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
required
autoComplete="current-password"
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
placeholder="Your password"
/>
</div>

<div className="-mt-2 text-right">
<Link
href="/forgot-password"
className="text-sm font-medium text-emerald-700 hover:underline"
>
Forgot password?
</Link>
</div>

<button
type="submit"
disabled={loading}
className="w-full rounded-xl bg-[#17352b] px-4 py-3 font-semibold text-white hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-60"
>
{loading ? "Logging in..." : "Log in"}
</button>

{message && (
<p
role="status"
aria-live="polite"
className="mt-4 text-center text-sm"
>
{message}
</p>
)}
</form>

<p className="mt-6 text-center text-sm text-gray-500">
Your family&apos;s stories deserve to live on. 🌳
</p>
</div>
</main>
);
}