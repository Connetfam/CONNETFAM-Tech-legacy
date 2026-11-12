"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
ArrowRight,
BookOpen,
CalendarDays,
Camera,
Heart,
Loader2,
Plus,
Sparkles,
Trash2,
TreeDeciduous,
Users,
Mic,
MessageCircle,
Video,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

type Family = {
id: number;
name: string;
description: string | null;
created_by: string;
role: string;
isOwner: boolean;
};

export default function DashboardPage() {
const router = useRouter();

const [families, setFamilies] = useState<Family[]>([]);
const [loading, setLoading] = useState(true);
const [deletingId, setDeletingId] = useState<number | null>(null);
const [error, setError] = useState("");
const [notice, setNotice] = useState("");

const loadFamilies = useCallback(async () => {
setLoading(true);
setError("");

try {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError) throw authError;

if (!user) {
router.replace("/login");
return;
}

// Find the user's profile ID.
const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError) throw profileError;

if (!profile) {
setFamilies([]);
setError(
"Your profile could not be found. Please sign out and sign in again."
);
return;
}

// Find every active family membership belonging to this profile.
const { data: memberships, error: membershipError } = await supabase
.from("family_members")
.select("family_id, role")
.eq("profile_id", profile.id)
.eq("status", "active")
.eq("is_active", true);

if (membershipError) throw membershipError;

const activeMemberships = memberships ?? [];

if (activeMemberships.length === 0) {
setFamilies([]);
return;
}

const familyIds = [
...new Set(activeMemberships.map((membership) => membership.family_id)),
];

// Load the family spaces the user belongs to.
const { data: familyData, error: familyError } = await supabase
.from("families")
.select("id, name, description, created_by")
.in("id", familyIds)
.order("id", { ascending: false });

if (familyError) throw familyError;

// Attach the user's membership role to each family.
const membershipByFamily = new Map<number, string>();

activeMemberships.forEach((membership) => {
membershipByFamily.set(
Number(membership.family_id),
membership.role ?? "member"
);
});

const formattedFamilies: Family[] = (familyData ?? []).map((family) => {
const role = membershipByFamily.get(Number(family.id)) ?? "member";

return {
...family,
role,
isOwner: role.toLowerCase() === "owner",
};
});

setFamilies(formattedFamilies);
} catch (err) {
console.error("Dashboard loading error:", err);

setError(
err instanceof Error
? err.message
: "Unable to load your family spaces. Please try again."
);
} finally {
setLoading(false);
}
}, [router]);

useEffect(() => {
void loadFamilies();
}, [loadFamilies]);

async function handleDeleteFamily(family: Family) {
if (!family.isOwner) {
setError("Only the family owner can delete this family space.");
return;
}

const confirmed = window.confirm(
`Are you sure you want to delete "${family.name}"?\n\nOnly empty family spaces can be deleted. This action cannot be undone.`
);

if (!confirmed) return;

setDeletingId(family.id);
setError("");
setNotice("");

try {
const { data, error: rpcError } = await supabase.rpc(
"delete_empty_family",
{
target_family_id: family.id,
}
);

if (rpcError) throw rpcError;

const result = data as
| {
success?: boolean;
error?: string;
message?: string;
}
| null;

if (!result || result.success !== true) {
throw new Error(
result?.error ||
result?.message ||
"The family space could not be deleted."
);
}

setFamilies((current) =>
current.filter((item) => item.id !== family.id)
);

setNotice(`"${family.name}" was deleted successfully.`);
} catch (err) {
console.error("Delete family error:", err);

setError(
err instanceof Error
? err.message
: "Unable to delete this family space."
);
} finally {
setDeletingId(null);
}
}

const primaryFamily = families[0];

return (
<main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
<div className="mx-auto max-w-7xl">

{/* Welcome section */}
<section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 p-7 text-white shadow-sm sm:p-10">
<div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-white/10" />
<div className="pointer-events-none absolute -right-4 -top-8 h-52 w-52 rounded-full border border-white/10" />

<div className="relative z-10 max-w-2xl">
<div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-emerald-50">
<Sparkles size={15} />
Your family's home
</div>

<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
Welcome to Legacy Family
</h1>

<p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50 sm:text-base">
Every family has a story worth preserving. Bring your loved ones
together, protect your memories, and keep your family history
alive for generations.
</p>

<div className="mt-7 flex flex-wrap gap-3">
{primaryFamily ? (
<Link
href={`/dashboard/family-home?id=${primaryFamily.id}`}
className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
>
Open your family
<ArrowRight size={17} />
</Link>
) : (
<Link
href="/dashboard/family"
className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
>
Create your family space
<Plus size={17} />
</Link>
)}
</div>
</div>
</section>

{/* Messages */}
{error && (
<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
{error}
<button
onClick={() => void loadFamilies()}
className="ml-2 font-semibold underline"
>
Try again
</button>
</div>
)}

{notice && (
<div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
{notice}
</div>
)}

{/* Family spaces heading */}
<section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
<div>
<p className="text-sm font-medium text-emerald-700">
Your connections
</p>
<h2 className="mt-1 text-2xl font-bold tracking-tight">
Your Family Spaces
</h2>
<p className="mt-2 text-sm text-slate-500">
Access the families you created or have been invited to join.
</p>
</div>

<Link
href="/dashboard/family"
className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
>
<Plus size={17} />
Create Family
</Link>
</section>

{/* Loading */}
{loading && (
<div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
<div className="flex items-center gap-3 text-sm text-slate-500">
<Loader2 className="animate-spin" size={20} />
Loading your family spaces...
</div>
</div>
)}

{/* No families */}
{!loading && !error && families.length === 0 && (
<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
<TreeDeciduous size={32} />
</div>

<h3 className="mt-5 text-xl font-bold">
Your family story starts here
</h3>

<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
Create a family space or accept an invitation to join your
family's shared home.
</p>

<Link
href="/dashboard/family"
className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
>
Create your first family space
<ArrowRight size={17} />
</Link>
</div>
)}

{/* Family cards */}
{!loading && families.length > 0 && (
<div className="grid gap-5 lg:grid-cols-2">
{families.map((family) => (
<article
key={family.id}
className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
>
<div className="p-6">
<div className="flex items-start justify-between gap-4">
<div className="flex min-w-0 items-center gap-3">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
<TreeDeciduous size={26} />
</div>

<div className="min-w-0">
<h3 className="truncate text-lg font-bold">
{family.name}
</h3>
<p className="mt-1 text-xs capitalize text-slate-500">
{family.role}
</p>
</div>
</div>

{family.isOwner && (
<button
type="button"
onClick={() => void handleDeleteFamily(family)}
disabled={deletingId === family.id}
title="Delete empty family space"
className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
>
{deletingId === family.id ? (
<Loader2 size={18} className="animate-spin" />
) : (
<Trash2 size={18} />
)}
</button>
)}
</div>

<p className="mt-4 min-h-10 text-sm leading-6 text-slate-500">
{family.description ||
"A shared home for your family's people, stories and memories."}
</p>

<div className="mt-6 grid gap-3 sm:grid-cols-2">
<Link
href={`/dashboard/family-home?id=${family.id}&section=space`}
className="group flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 transition hover:border-emerald-400 hover:bg-emerald-100"
>
<div>
<div className="flex items-center gap-2 font-semibold text-emerald-900">
<Users size={18} />
Family Space
</div>
<p className="mt-1 text-xs text-emerald-800/75">
Members and family tree
</p>
</div>
<ArrowRight
size={18}
className="text-emerald-700 transition group-hover:translate-x-1"
/>
</Link>

<Link
href={`/dashboard/family-home?id=${family.id}&section=heritage`}
className="group flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 transition hover:border-amber-400 hover:bg-amber-100"
>
<div>
<div className="flex items-center gap-2 font-semibold text-amber-950">
<Heart size={18} />
Family Heritage
</div>
<p className="mt-1 text-xs text-amber-900/75">
Stories and memories
</p>
</div>
<ArrowRight
size={18}
className="text-amber-800 transition group-hover:translate-x-1"
/>
</Link>
</div>

<Link
href={`/dashboard/family-home?id=${family.id}`}
className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
>
Open family overview
<ArrowRight size={16} />
</Link>
</div>
</article>
))}
</div>
)}

{/* What Legacy Family preserves */}
<section className="mt-12">
<div className="mb-5">
<p className="text-sm font-medium text-emerald-700">
Preserve what matters
</p>
<h2 className="mt-1 text-2xl font-bold tracking-tight">
A home for every part of your family story
</h2>
</div>

<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
<div className="rounded-2xl border border-slate-200 bg-white p-5">
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
<TreeDeciduous size={21} />
</div>
<h3 className="mt-4 font-semibold">Family connections</h3>
<p className="mt-2 text-sm leading-6 text-slate-500">
Keep track of family members, relationships and generations.
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5">
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
<BookOpen size={21} />
</div>
<h3 className="mt-4 font-semibold">Stories and memories</h3>
<p className="mt-2 text-sm leading-6 text-slate-500">
Preserve the moments and stories that make your family unique.
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5">
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
<Camera size={21} />
</div>
<h3 className="mt-4 font-semibold">Photos and videos</h3>
<p className="mt-2 text-sm leading-6 text-slate-500">
Keep family photographs and videos together.
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5">
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
<CalendarDays size={21} />
</div>
<h3 className="mt-4 font-semibold">Family moments</h3>
<p className="mt-2 text-sm leading-6 text-slate-500">
Remember birthdays, gatherings and important dates.
</p>
</div>
</div>
</section>

{/* Footer */}
<footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
Legacy Family — Keeping family stories alive across generations.
</footer>
</div>
</main>
);
}
