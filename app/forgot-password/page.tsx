"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function ForgotPasswordPage() {
const [email, setEmail] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function handleResetPassword(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

setMessage("");
setError("");
setLoading(true);

try {
const { error: resetError } =
await supabase.auth.resetPasswordForEmail(email.trim(), {
redirectTo: `${window.location.origin}/reset-password`,
});

if (resetError) {
setError(resetError.message);
return;
}

setMessage(
"If an account exists for this email, a password reset link will be sent. Please check your inbox and spam folder."
);
} catch (err) {
console.error("Password reset request failed:", err);
setError("Something went wrong. Please try again.");
} finally {
setLoading(false);
}
}

return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-6 py-10 text-[#1f2937]">
<div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
<p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
CONNETFAM
</p>

<h1 className="mb-3 text-3xl font-bold">
Forgot your password?
</h1>

<p className="mb-8 text-gray-600">
Enter your account email address and we&apos;ll help you
reset your password.
</p>

<form onSubmit={handleResetPassword} className="space-y-5">
<div>
<label htmlFor="email" className="mb-2 block font-medium">
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

{message && (
<p
role="status"
className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
>
{message}
</p>
)}

{error && (
<p
role="alert"
className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
>
{error}
</p>
)}

<button
type="submit"
disabled={loading}
className="w-full rounded-xl bg-[#17352b] px-4 py-3 font-semibold text-white hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-60"
>
{loading ? "Sending..." : "Send Reset Link"}
</button>
</form>

<p className="mt-6 text-center text-sm text-gray-500">
Remember your password?{" "}
<Link
href="/login"
className="font-semibold text-emerald-700 hover:underline"
>
Back to Login
</Link>
</p>
</div>
</main>
);
}