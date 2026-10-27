"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

export default function CreateFamily() {
const router = useRouter();

const [familyName, setFamilyName] = useState("");
const [description, setDescription] = useState("");
const [loading, setLoading] = useState(false);
const [errorMessage, setErrorMessage] = useState("");
const [successMessage, setSuccessMessage] = useState("");

async function handleCreateFamily(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

setErrorMessage("");
setSuccessMessage("");

const cleanedName = familyName.trim();
const cleanedDescription = description.trim();

if (!cleanedName) {
setErrorMessage("Please enter your family name.");
return;
}

setLoading(true);

let createdFamilyId: number | string | null = null;

try {
// 1. Check the signed-in user.
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
setErrorMessage("Please log in before creating a family space.");
return;
}

// 2. Find the user's profile.
const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError) {
console.error("Profile lookup error:", profileError);
setErrorMessage(
`Could not verify your profile: ${profileError.message}`
);
return;
}

if (!profile) {
setErrorMessage(
"Your profile was not found. Please complete your profile first."
);
return;
}

const now = new Date().toISOString();

// 3. Create the family.
const { data: family, error: familyError } = await supabase
.from("families")
.insert({
name: cleanedName,
description: cleanedDescription || null,
created_by: user.id,
updated_by: user.id,
updated_at: now,
privacy_level: "private",
status: "active",
member_count: 1,
is_active: true,
})
.select("id")
.single();

if (familyError || !family) {
console.error("Family creation error:", familyError);
setErrorMessage(
familyError?.message || "Could not create your family space."
);
return;
}

createdFamilyId = family.id;

// 4. Register the creator as the family owner.
const { error: memberError } = await supabase
.from("family_members")
.insert({
family_id: family.id,
profile_id: profile.id,
role: "owner",
status: "active",
joined_at: now,
created_by: user.id,
updated_at: now,
is_active: true,
});

if (memberError) {
console.error("Owner registration error:", memberError);

setErrorMessage(
`The family was created, but owner registration failed: ${memberError.message}`
);

return;
}

// 5. Confirm success and navigate to the dashboard.
setSuccessMessage("Your family space has been created successfully!");

router.push("/dashboard");
router.refresh();
} catch (error) {
console.error("Unexpected error:", error);

setErrorMessage(
error instanceof Error
? error.message
: "Something went wrong. Please try again."
);
} finally {
setLoading(false);
}
}

return (
<main className="min-h-screen bg-[#f7f5ef] text-[#1f2937]">
<header className="border-b border-black/10 bg-white">
<div className="mx-auto max-w-4xl px-6 py-5">
<Link
href="/dashboard"
className="text-sm font-medium text-gray-500 hover:text-black"
>
← Back to dashboard
</Link>

<div className="mt-8">
<p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
LEGACY · CONNETFAM
</p>

<h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
Create your family space 🌳
</h1>

<p className="mt-3 max-w-2xl text-gray-600">
Start building your family&apos;s legacy. Add your family name
and begin connecting generations, stories and memories.
</p>
</div>
</div>
</header>

<section className="mx-auto max-w-4xl px-6 py-10">
<div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
<h2 className="text-xl font-bold">Tell us about your family</h2>

<p className="mt-2 text-sm text-gray-500">
You can change these details later.
</p>

<form
onSubmit={handleCreateFamily}
className="mt-8 space-y-6"
>
<div>
<label
htmlFor="familyName"
className="mb-2 block text-sm font-semibold"
>
Family name
</label>

<input
id="familyName"
type="text"
value={familyName}
onChange={(event) => setFamilyName(event.target.value)}
placeholder="e.g. The Onyekwere Family"
maxLength={120}
required
disabled={loading}
className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700 disabled:bg-gray-100"
/>
</div>

<div>
<label
htmlFor="description"
className="mb-2 block text-sm font-semibold"
>
Family description
</label>

<textarea
id="description"
value={description}
onChange={(event) => setDescription(event.target.value)}
placeholder="Tell us a little about your family..."
rows={5}
maxLength={2000}
disabled={loading}
className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700 disabled:bg-gray-100"
/>
</div>

{errorMessage && (
<div
role="alert"
className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
>
{errorMessage}
</div>
)}

{successMessage && (
<div
role="status"
className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
>
{successMessage}
</div>
)}

<button
type="submit"
disabled={loading}
className="w-full rounded-full bg-[#17352b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-60"
>
{loading ? "Creating your family space..." : "Create family space"}
</button>
</form>
</div>
</section>
</main>
);
}