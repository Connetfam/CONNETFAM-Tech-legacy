"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SignupPage() {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);

async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault();
setLoading(true);
setMessage("");

try {
const { error } = await supabase.auth.signUp({
email: email.trim(),
password,
options: {
emailRedirectTo: "https://connetfam-tech-legacy.vercel.app/",
},
});

if (error) {
setMessage(error.message);
} else {
setMessage(
"Account created! Please check your email and click the confirmation link to activate your account."
);
}
} catch {
setMessage("Something went wrong. Please try again.");
} finally {
setLoading(false);
}
}

return (
<main className="min-h-screen flex items-center justify-center px-6">
<div className="w-full max-w-md">
<h1 className="text-3xl font-bold mb-2">
Create your Legacy Family account
</h1>

<p className="text-gray-600 mb-8">
Start preserving your family&apos;s story for generations.
</p>

<form onSubmit={handleSignup} className="space-y-5">
<div>
<label
htmlFor="email"
className="block mb-2 font-medium"
>
Email
</label>

<input
id="email"
type="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
autoComplete="email"
required
className="w-full border rounded-lg px-4 py-3"
placeholder="you@example.com"
/>
</div>

<div>
<label
htmlFor="password"
className="block mb-2 font-medium"
>
Password
</label>

<input
id="password"
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
autoComplete="new-password"
required
minLength={6}
className="w-full border rounded-lg px-4 py-3"
placeholder="At least 6 characters"
/>
</div>

<button
type="submit"
disabled={loading}
className="w-full rounded-lg px-4 py-3 font-semibold bg-black text-white disabled:opacity-60"
>
{loading ? "Creating account..." : "Create Account"}
</button>

{message && (
<p
role="status"
aria-live="polite"
className="text-sm mt-4"
>
{message}
</p>
)}
</form>
</div>
</main>
);
}