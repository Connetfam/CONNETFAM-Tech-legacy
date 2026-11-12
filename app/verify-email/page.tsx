"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";

function VerifyEmailForm() {
const searchParams = useSearchParams();

const email = (searchParams.get("email") || "").trim().toLowerCase();
const redirectParam = searchParams.get("redirect");

const safeRedirect =
redirectParam &&
redirectParam.startsWith("/") &&
!redirectParam.startsWith("//")
? redirectParam
: "/dashboard";

const [token, setToken] = useState("");
const [message, setMessage] = useState("");
const [messageType, setMessageType] = useState<"success" | "error">("error");
const [loading, setLoading] = useState(false);
const [resending, setResending] = useState(false);

async function handleVerify(event: FormEvent<HTMLFormElement>) {
event.preventDefault();

setMessage("");

if (!email) {
setMessage("Email address is missing. Please sign up again.");
setMessageType("error");
return;
}

if (!/^\d{6}$/.test(token)) {
setMessage("Please enter your complete six-digit code.");
setMessageType("error");
return;
}

setLoading(true);

try {
const { data, error } = await supabase.auth.verifyOtp({
email,
token,
type: "signup",
});

if (error) {
setMessage(error.message);
setMessageType("error");
return;
}

if (!data.session || !data.user) {
setMessage("Verification was unsuccessful. Please try again.");
setMessageType("error");
return;
}

window.location.assign(safeRedirect);
} catch (error) {
console.error("Verification error:", error);
setMessage("Something went wrong. Please try again.");
setMessageType("error");
} finally {
setLoading(false);
}
}

async function handleResend() {
setMessage("");

if (!email) {
setMessage("Email address is missing. Please sign up again.");
setMessageType("error");
return;
}

setResending(true);

try {
const { error } = await supabase.auth.resend({
type: "signup",
email,
});

if (error) {
setMessage(error.message);
setMessageType("error");
return;
}

setToken("");
setMessage("A new verification email has been requested.");
setMessageType("success");
} catch (error) {
console.error("Resend error:", error);
setMessage("Unable to resend the code. Please try again.");
setMessageType("error");
} finally {
setResending(false);
}
}

return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-5 py-10 text-[#1f2937]">
<section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-sm">

<p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
LEGACY FAMILY
</p>

<div className="mb-6 text-center">
<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
✉️
</div>

<h1 className="mb-3 text-3xl font-bold">
Verify Your Email
</h1>

<p className="text-gray-600">
Enter the six-digit verification code sent to your email.
</p>
</div>

<div className="mb-6 rounded-xl bg-emerald-50 p-4 text-center">
<p className="mb-1 text-xs text-gray-500">
Verification email sent to
</p>

<p className="break-all font-semibold text-emerald-800">
{email || "Email unavailable"}
</p>
</div>

<form onSubmit={handleVerify} className="space-y-5">

<div>
<label
htmlFor="token"
className="mb-2 block font-medium"
>
Six-digit verification code
</label>

<input
id="token"
type="text"
inputMode="numeric"
autoComplete="one-time-code"
maxLength={6}
value={token}
onChange={(event) =>
setToken(
event.target.value.replace(/\D/g, "").slice(0, 6)
)
}
placeholder="000000"
required
className="w-full rounded-xl border border-black/15 px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] outline-none focus:border-emerald-700"
/>
</div>

{message && (
<p
role="alert"
aria-live="polite"
className={`rounded-xl p-3 text-sm ${
messageType === "success"
? "bg-emerald-50 text-emerald-800"
: "bg-red-50 text-red-700"
}`}
>
{message}
</p>
)}

<button
type="submit"
disabled={loading || token.length !== 6 || !email}
className="w-full rounded-xl bg-[#17352b] px-4 py-3 font-semibold text-white hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Verifying..." : "Verify Email"}
</button>

</form>

<div className="mt-7 border-t border-gray-100 pt-6 text-center">

<p className="mb-3 text-sm text-gray-600">
Didn't receive your code?
</p>

<button
type="button"
onClick={handleResend}
disabled={resending || !email}
className="font-semibold text-emerald-700 hover:underline disabled:opacity-50"
>
{resending ? "Sending..." : "Resend verification code"}
</button>

</div>

<p className="mt-6 text-center text-sm text-gray-500">
Wrong email address?{" "}
<Link
href="/signup"
className="font-semibold text-emerald-700 hover:underline"
>
Return to signup
</Link>
</p>

</section>
</main>
);
}

export default function VerifyEmailPage() {
return (
<Suspense
fallback={
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-6">
<p className="text-gray-600">Loading verification page...</p>
</main>
}
>
<VerifyEmailForm />
</Suspense>
);
}
