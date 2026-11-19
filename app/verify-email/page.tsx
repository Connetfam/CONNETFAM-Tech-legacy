"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
const searchParams = useSearchParams();

const email = searchParams.get("email") || "";
const redirect = searchParams.get("redirect");

const safeRedirect =
redirect &&
redirect.startsWith("/") &&
!redirect.startsWith("//")
? redirect
: "/dashboard";

const loginUrl = `/login?redirect=${encodeURIComponent(safeRedirect)}`;

return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-5 py-10 text-[#1f2937]">
<section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
<div className="mb-5 text-5xl">📩</div>

<p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
LEGACY FAMILY
</p>

<h1 className="mb-3 text-2xl font-bold">
Verify Your Email
</h1>

<p className="mb-5 text-gray-600">
Your account has been created successfully.
Please check your email and click the verification
link we sent you to activate your account.
</p>

{email && (
<p className="mb-5 break-all rounded-xl bg-gray-50 p-3 text-sm font-medium text-gray-700">
{email}
</p>
)}

<p className="mb-6 text-sm text-gray-500">
After verifying your email, you will be redirected
to continue your registration or family invitation.
</p>

<Link
href={loginUrl}
className="block w-full rounded-xl bg-[#17352b] px-4 py-3 font-semibold text-white hover:bg-[#21483b]"
>
Go to Login
</Link>

<p className="mt-5 text-xs text-gray-500">
Didn't receive the email? Check your spam folder.
</p>
</section>
</main>
);
}

export default function VerifyEmailPage() {
return (
<Suspense
fallback={
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef]">
<p className="text-gray-600">Loading...</p>
</main>
}
>
<VerifyEmailContent />
</Suspense>
);
}