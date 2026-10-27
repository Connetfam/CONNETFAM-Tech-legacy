"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

type FamilyRelative = {
id: number;
family_id: number;
full_name: string;
relationship: string;
email: string | null;
phone: string | null;
notes: string | null;
created_by: string;
created_at: string;
};

type FormData = {
full_name: string;
relationship: string;
email: string;
phone: string;
notes: string;
};

const initialForm: FormData = {
full_name: "",
relationship: "",
email: "",
phone: "",
notes: "",
};

const relationships = [
"Father",
"Mother",
"Brother",
"Sister",
"Son",
"Daughter",
"Grandfather",
"Grandmother",
"Uncle",
"Aunt",
"Cousin",
"Spouse",
"Nephew",
"Niece",
"Grandson",
"Granddaughter",
"Other",
];

export default function FamilyMembersPage() {
const [relatives, setRelatives] = useState<FamilyRelative[]>([]);
const [form, setForm] = useState<FormData>(initialForm);

const [familyId, setFamilyId] = useState<number | null>(null);
const [showForm, setShowForm] = useState(false);

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

const [errorMessage, setErrorMessage] = useState("");
const [successMessage, setSuccessMessage] = useState("");
const [noFamily, setNoFamily] = useState(false);

const loadFamilyMembers = useCallback(async () => {
setLoading(true);
setErrorMessage("");
setNoFamily(false);

try {
// 1. Get the currently logged-in user.
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError) {
throw new Error(authError.message);
}

if (!user) {
setErrorMessage("Please log in to view your family members.");
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
throw new Error(
`Unable to load your profile: ${profileError.message}`
);
}

if (!profile) {
setErrorMessage(
"Your profile was not found. Please complete your profile first."
);
return;
}

// 3. Find an active family membership.
const {
data: membership,
error: membershipError,
} = await supabase
.from("family_members")
.select("family_id")
.eq("profile_id", profile.id)
.eq("status", "active")
.limit(1)
.maybeSingle();

if (membershipError) {
console.error("Family membership error:", membershipError);
throw new Error(
`Unable to check your family membership: ${membershipError.message}`
);
}

if (!membership) {
setFamilyId(null);
setRelatives([]);
setNoFamily(true);
return;
}

setFamilyId(membership.family_id);
setNoFamily(false);

const currentFamilyId = Number(membership.family_id);

if (!Number.isSafeInteger(currentFamilyId)) {
throw new Error("Your family ID is invalid.");
}

setFamilyId(currentFamilyId);

// 4. Load relatives belonging to this family.
const { data, error: relativesError } = await supabase
.from("family_relatives")
.select(
"id, family_id, full_name, relationship, email, phone, notes, created_by, created_at"
)
.eq("family_id", currentFamilyId)
.order("created_at", { ascending: false });

if (relativesError) {
console.error("Relatives lookup error:", relativesError);
throw new Error(
`Unable to load family members: ${relativesError.message}`
);
}

setRelatives((data ?? []) as FamilyRelative[]);
} catch (error) {
console.error("Family Members page error:", error);

setErrorMessage(
error instanceof Error
? error.message
: "Something went wrong while loading your family."
);
} finally {
setLoading(false);
}
}, []);

useEffect(() => {
void loadFamilyMembers();
}, [loadFamilyMembers]);

// 5. Save a new relative to Supabase.
async function handleSaveRelative(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

setErrorMessage("");
setSuccessMessage("");

const fullName = form.full_name.trim();
const relationship = form.relationship;

if (!fullName || !relationship) {
setErrorMessage(
"Please enter the family member's name and relationship."
);
return;
}

if (familyId === null) {
setErrorMessage(
"No active family was found. Please create a family first."
);
return;
}

setSaving(true);

try {
// Verify the session again before saving.
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
throw new Error("Your session has expired. Please log in again.");
}

// Insert into your EXISTING family_relatives table.
const { data: savedRelative, error: insertError } = await supabase
.from("family_relatives")
.insert({
family_id: familyId,
full_name: fullName,
relationship,
email: form.email.trim() || null,
phone: form.phone.trim() || null,
notes: form.notes.trim() || null,
created_by: user.id,
})
.select(
"id, family_id, full_name, relationship, email, phone, notes, created_by, created_at"
)
.single();

if (insertError) {
console.error("Save relative error:", insertError);

throw new Error(
`Unable to save family member: ${insertError.message}`
);
}

// Update the page immediately after a successful insert.
setRelatives((previous) => [
savedRelative as FamilyRelative,
...previous,
]);

setForm(initialForm);
setShowForm(false);

setSuccessMessage(`${fullName} was added successfully.`);
} catch (error) {
console.error("Save family member error:", error);

setErrorMessage(
error instanceof Error
? error.message
: "Unable to save this family member."
);
} finally {
setSaving(false);
}
}

function updateField(
field: keyof FormData,
value: string
) {
setForm((previous) => ({
...previous,
[field]: value,
}));
}

return (
<main className="min-h-screen bg-[#f7f5ef] px-4 py-8 text-gray-900 sm:px-6">
<div className="mx-auto max-w-6xl">
{/* Page heading */}
<header className="mb-8 flex flex-wrap items-center justify-between gap-4">
<div>
<Link
href="/dashboard"
className="mb-5 inline-block text-sm font-medium text-gray-500 hover:text-emerald-800"
>
← Back to Dashboard
</Link>

<p className="mb-2 text-xs font-bold tracking-[0.3em] text-emerald-800">
CONNETFAM
</p>

<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
Family Members
</h1>

<p className="mt-3 text-gray-600">
Keep your family connected, one generation at a time.
</p>
</div>

{!noFamily && (
<button
type="button"
onClick={() => {
setErrorMessage("");
setSuccessMessage("");
setShowForm((previous) => !previous);
}}
disabled={loading || saving}
className="rounded-xl bg-[#17352b] px-5 py-3 font-semibold text-white transition hover:bg-[#21483b] disabled:opacity-50"
>
{showForm ? "Close Form" : "+ Add Family Member"}
</button>
)}
</header>

{/* Error message */}
{errorMessage && (
<div
role="alert"
className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
>
<p className="font-semibold">Something needs your attention</p>
<p className="mt-1 break-words">{errorMessage}</p>

<button
type="button"
onClick={() => void loadFamilyMembers()}
className="mt-3 font-semibold underline"
>
Try again
</button>
</div>
)}

{/* Success message */}
{successMessage && (
<div
role="status"
className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
>
{successMessage}
</div>
)}

{/* Loading state */}
{loading && (
<section className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
<p className="text-gray-600">
Loading your family members...
</p>
</section>
)}

{/* No family membership */}
{!loading && noFamily && (
<section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm sm:p-10">
<div className="mb-4 text-5xl">🌳</div>

<h2 className="text-xl font-bold">
Create your family space first
</h2>

<p className="mt-3 max-w-xl text-gray-600">
You need an active family space before adding relatives.
Create your family space, and then return here to build
your family directory.
</p>

<Link
href="/dashboard/create-family"
className="mt-6 inline-block rounded-xl bg-[#17352b] px-5 py-3 font-semibold text-white hover:bg-[#21483b]"
>
Create Family Space
</Link>

<p className="mt-4 text-xs text-gray-500">
If you have already created a family, we may need to
correct its membership record.
</p>
</section>
)}

{/* Family content */}
{!loading && !noFamily && familyId !== null && (
<>
{/* Summary cards */}
<section className="mb-8 grid gap-5 sm:grid-cols-2">
<div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
<p className="text-sm text-gray-500">
Family Members
</p>

<p className="mt-3 text-4xl font-bold">
{relatives.length}
</p>

<p className="mt-2 text-sm text-gray-500">
Relatives in your family directory
</p>
</div>

<div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
<p className="text-sm text-gray-500">
Family Connections
</p>

<p className="mt-3 text-4xl">🌳</p>

<p className="mt-2 text-sm text-gray-500">
Preserve your family's history and relationships.
</p>
</div>
</section>

{/* Add family member form */}
{showForm && (
<section className="mb-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
<h2 className="text-xl font-bold">
Add a Family Member
</h2>

<p className="mt-2 text-sm text-gray-500">
Enter the details below. Your relative will be
saved to your family's directory.
</p>

<form
onSubmit={handleSaveRelative}
className="mt-6 grid gap-5 sm:grid-cols-2"
>
{/* Full name */}
<div>
<label
htmlFor="full_name"
className="mb-2 block text-sm font-semibold"
>
Full Name *
</label>

<input
id="full_name"
type="text"
value={form.full_name}
onChange={(event) =>
updateField("full_name", event.target.value)
}
placeholder="Enter full name"
maxLength={150}
required
disabled={saving}
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-700 disabled:bg-gray-100"
/>
</div>

{/* Relationship */}
<div>
<label
htmlFor="relationship"
className="mb-2 block text-sm font-semibold"
>
Relationship *
</label>

<select
id="relationship"
value={form.relationship}
onChange={(event) =>
updateField("relationship", event.target.value)
}
required
disabled={saving}
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-emerald-700 disabled:bg-gray-100"
>
<option value="">Select relationship</option>

{relationships.map((relationship) => (
<option
key={relationship}
value={relationship}
>
{relationship}
</option>
))}
</select>
</div>

{/* Email */}
<div>
<label
htmlFor="email"
className="mb-2 block text-sm font-semibold"
>
Email Address (Optional)
</label>

<input
id="email"
type="email"
value={form.email}
onChange={(event) =>
updateField("email", event.target.value)
}
placeholder="Enter email address"
disabled={saving}
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-700 disabled:bg-gray-100"
/>
</div>

{/* Phone */}
<div>
<label
htmlFor="phone"
className="mb-2 block text-sm font-semibold"
>
Phone Number (Optional)
</label>

<input
id="phone"
type="tel"
value={form.phone}
onChange={(event) =>
updateField("phone", event.target.value)
}
placeholder="Enter phone number"
disabled={saving}
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-700 disabled:bg-gray-100"
/>
</div>

{/* Notes */}
<div className="sm:col-span-2">
<label
htmlFor="notes"
className="mb-2 block text-sm font-semibold"
>
Notes (Optional)
</label>

<textarea
id="notes"
rows={4}
value={form.notes}
onChange={(event) =>
updateField("notes", event.target.value)
}
placeholder="Add a short note about this family member"
disabled={saving}
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-700 disabled:bg-gray-100"
/>
</div>

{/* Form actions */}
<div className="flex flex-wrap gap-3 sm:col-span-2">
<button
type="submit"
disabled={saving}
className="rounded-xl bg-[#17352b] px-6 py-3 font-semibold text-white hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-50"
>
{saving
? "Saving Family Member..."
: "Save Family Member"}
</button>

<button
type="button"
disabled={saving}
onClick={() => {
setShowForm(false);
setForm(initialForm);
setErrorMessage("");
}}
className="rounded-xl border border-gray-300 px-6 py-3 font-semibold hover:bg-gray-50 disabled:opacity-50"
>
Cancel
</button>
</div>
</form>
</section>
)}

{/* Family directory */}
<section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
<div className="mb-6">
<h2 className="text-xl font-bold">
Your Family Directory
</h2>

<p className="mt-2 text-sm text-gray-500">
View your family's relatives and their relationships.
</p>
</div>

{relatives.length === 0 ? (
<div className="py-12 text-center">
<div className="mb-4 text-5xl">🌳</div>

<h3 className="text-lg font-bold">
Your family story starts here
</h3>

<p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
Add your first relative and begin building a
lasting record of your family's connections and history.
</p>

{!showForm && (
<button
type="button"
onClick={() => {
setErrorMessage("");
setShowForm(true);
}}
className="mt-6 rounded-xl bg-[#17352b] px-5 py-3 font-semibold text-white hover:bg-[#21483b]"
>
+ Add Your First Family Member
</button>
)}
</div>
) : (
<div className="grid gap-4 md:grid-cols-2">
{relatives.map((relative) => (
<article
key={relative.id}
className="rounded-2xl border border-gray-200 p-5 transition hover:border-emerald-300"
>
<div className="flex items-start gap-4">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-2xl">
👤
</div>

<div className="min-w-0 flex-1">
<h3 className="break-words font-bold">
{relative.full_name}
</h3>

<p className="mt-1 text-sm text-emerald-800">
{relative.relationship}
</p>

{relative.email && (
<p className="mt-3 break-words text-sm text-gray-600">
✉️ {relative.email}
</p>
)}

{relative.phone && (
<p className="mt-2 break-words text-sm text-gray-600">
📞 {relative.phone}
</p>
)}

{relative.notes && (
<p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600">
{relative.notes}
</p>
)}

<p className="mt-4 text-xs text-gray-400">
Added{" "}
{new Date(
relative.created_at
).toLocaleDateString()}
</p>
</div>
</div>
</article>
))}
</div>
)}
</section>
</>
)}
</div>
</main>
);
}
