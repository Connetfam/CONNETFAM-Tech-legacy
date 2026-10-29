"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";

function SignupForm() {
const searchParams = useSearchParams();
const redirectParam = searchParams.get("redirect");

const safeRedirect =
redirectParam &&
redirectParam.startsWith("/") &&
!redirectParam.startsWith("//")
? redirectParam
: "/dashboard";

const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);

async function handleSignup(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
setMessage("");

if (password.length < 6) {
setMessage("Your password must contain at least 6 characters.");
return;
}

if (password !== confirmPassword) {
setMessage("Your passwords do not match. Please try again.");
return;
}

setLoading(true);

try {
const { data, error } = await supabase.auth.signUp({
email: email.trim(),
password: password,
options: {
data: {
full_name: fullName.trim(),
},
emailRedirectTo:
window.location.origin +
"/auth/callback?next=" +
encodeURIComponent(safeRedirect),
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
"Your account request was successful. Check your email to verify your address before continuing."
);
} catch (error) {
console.error("Signup error:", error);
setMessage("Something went wrong. Please try again.");
} finally {
setLoading(false);
}
}

const loginUrl =
"/login?redirect=" + encodeURIComponent(safeRedirect);

return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-5 py-10 text-[#1f2937]">
<section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
<p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
CONNETFAM
</p>

<h1 className="mb-2 text-3xl font-bold">
Create Your Account
</h1>

<p className="mb-8 text-gray-600">
Join your family and start preserving your family&apos;s story for
generations.
</p>

<form onSubmit={handleSignup} className="space-y-5">
<div>
<label
htmlFor="fullName"
className="mb-2 block font-medium"
>
Full name
</label>

<input
id="fullName"
type="text"
value={fullName}
onChange={(event) => setFullName(event.target.value)}
autoComplete="name"
placeholder="Enter your full name"
required
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
/>
</div>

<div>
<label
htmlFor="email"
className="mb-2 block font-medium"
>
Email address
</label>

<input
id="email"
type="email"
value={email}
onChange={(event) => setEmail(event.target.value)}
autoComplete="email"
placeholder="you@example.com"
required
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
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
onChange={(event) => setPassword(event.target.value)}
autoComplete="new-password"
placeholder="At least 6 characters"
minLength={6}
required
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
/>
</div>

<div>
<label
htmlFor="confirmPassword"
className="mb-2 block font-medium"
>
Confirm password
</label>

<input
id="confirmPassword"
type="password"
value={confirmPassword}
onChange={(event) => setConfirmPassword(event.target.value)}
autoComplete="new-password"
placeholder="Enter your password again"
minLength={6}
required
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
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
<p
role="status"
aria-live="polite"
className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700"
>
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

<p className="mt-4 text-center text-xs text-gray-500">
By creating an account, you can begin preserving your family&apos;s
memories on ConnetFam.
</p>
</section>
</main>
);
}

export default function SignupPage() {
return (
<Suspense
fallback={
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-6">
<p className="text-gray-600">Loading signup page...</p>
</main>
}
>
<SignupForm />
</Suspense>
);
}