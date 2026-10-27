"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ResetPasswordPage() {
const router = useRouter();

const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function handleUpdatePassword(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

setMessage("");
setError("");

if (password.length < 8) {
setError("Your password must contain at least 8 characters.");
return;
}

if (password !== confirmPassword) {
setError("Your passwords do not match.");
return;
}

setLoading(true);

try {
const { error: updateError } =
await supabase.auth.updateUser({
password,
});

if (updateError) {
setError(updateError.message);
return;
}

setMessage("Your password has been updated successfully.");

setPassword("");
setConfirmPassword("");

setTimeout(() => {
router.push("/login");
}, 2000);
} catch (err) {
console.error("Password update failed:", err);
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
Reset your password
</h1>

<p className="mb-8 text-gray-600">
Enter your new password below.
</p>

<form
onSubmit={handleUpdatePassword}
className="space-y-5"
>
<div>
<label
htmlFor="password"
className="mb-2 block font-medium"
>
New password
</label>

<input
id="password"
type="password"
value={password}
onChange={(event) =>
setPassword(event.target.value)
}
autoComplete="new-password"
minLength={8}
required
placeholder="At least 8 characters"
className="w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700"
/>
</div>

<div>
<label
htmlFor="confirmPassword"
className="mb-2 block font-medium"
>
Confirm new password
</label>

<input
id="confirmPassword"
type="password"
value={confirmPassword}
onChange={(event) =>
setConfirmPassword(event.target.value)
}
autoComplete="new-password"
minLength={8}
required
placeholder="Enter your password again"
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
{loading ? "Updating..." : "Update Password"}
</button>
</form>
</div>
</main>
);
}