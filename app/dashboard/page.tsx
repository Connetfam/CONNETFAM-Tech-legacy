"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type Family = {
id: number;
name: string;
description: string | null;
created_by: string;
};

const navigationItems = [
{ label: "Dashboard", href: "/dashboard", icon: "🏠" },
{ label: "Family Tree", href: "/dashboard/family", icon: "🌳" },
{
label: "Family Members",
href: "/dashboard/family-members",
icon: "👨‍👩‍👧‍👦",
},
{ label: "Stories", href: "/dashboard/stories", icon: "📖" },
{ label: "Memories", href: "/dashboard/memories", icon: "💝" },
{ label: "Media", href: "/dashboard/media", icon: "📸" },
{
label: "Family Calendar",
href: "/dashboard/calendar",
icon: "📅",
},
{
label: "Voice Messages",
href: "/dashboard/voice-messages",
icon: "🎙️",
},
{ label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export default function DashboardPage() {
const router = useRouter();

const [families, setFamilies] = useState<Family[]>([]);
const [loading, setLoading] = useState(true);
const [deletingId, setDeletingId] = useState<number | null>(null);
const [error, setError] = useState("");
const [notice, setNotice] = useState("");
const [userEmail, setUserEmail] = useState("");

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

setUserEmail(user.email ?? "");

const { data, error: familyError } = await supabase
.from("families")
.select("id, name, description, created_by")
.eq("created_by", user.id)
.order("id", { ascending: false });

if (familyError) throw familyError;

setFamilies((data ?? []) as Family[]);
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
const confirmed = window.confirm(
`Are you sure you want to delete "${family.name}"?\n\nThis action cannot be undone. Only empty family spaces can be deleted.`
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
deleted_family_id?: number;
deleted_family_name?: string;
}
| null;

if (!result || result.success !== true) {
throw new Error(
result?.error ||
result?.message ||
"The database did not confirm that the family space was deleted."
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
: "Unable to delete this family space. Please try again."
);
} finally {
setDeletingId(null);
}
}

async function handleSignOut() {
const { error: signOutError } = await supabase.auth.signOut();

if (signOutError) {
setError(signOutError.message);
return;
}

router.replace("/login");
}

return (
<main className="min-h-screen bg-slate-50 text-slate-900">
<div className="flex min-h-screen">
<aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 md:flex md:flex-col">
<Link href="/dashboard" className="mb-8">
<div className="text-2xl font-bold tracking-tight text-emerald-700">
ConnetFam
</div>
<p className="mt-1 text-xs text-slate-500">
Every family has a story.
</p>
</Link>

<nav className="flex-1 space-y-1">
{navigationItems.map((item) => {
const active = item.href === "/dashboard";

return (
<Link
key={item.href}
href={item.href}
className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
active
? "bg-emerald-50 text-emerald-800"
: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
}`}
>
<span className="text-lg">{item.icon}</span>
<span>{item.label}</span>
</Link>
);
})}
</nav>

<button
onClick={handleSignOut}
className="mt-6 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
>
Sign out
</button>
</aside>

<section className="min-w-0 flex-1">
<header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
<div>
<p className="text-sm text-slate-500">Your workspace</p>
<h1 className="text-xl font-bold sm:text-2xl">
Family Dashboard
</h1>
</div>

<div className="flex items-center gap-3">
<div className="hidden text-right sm:block">
<p className="text-sm font-semibold">My Account</p>
<p className="max-w-48 truncate text-xs text-slate-500">
{userEmail}
</p>
</div>

<Link
href="/dashboard/settings"
aria-label="Open settings"
title="Settings"
className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl hover:bg-slate-50"
>
⚙️
</Link>
</div>
</header>

<div className="mx-auto max-w-7xl p-5 sm:p-8">
<div className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white sm:p-8">
<p className="mb-2 text-sm font-medium text-emerald-100">
Welcome to ConnetFam
</p>
<h2 className="text-2xl font-bold sm:text-3xl">
Keep your family connected.
</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
Preserve family stories, celebrate important moments, and
create a legacy for future generations.
</p>

<Link
href="/dashboard/family"
className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
>
+ Create a Family Space
</Link>
</div>

{error && (
<div
role="alert"
className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
>
<p>{error}</p>
<button
onClick={() => void loadFamilies()}
className="font-semibold underline"
>
Try again
</button>
</div>
)}

{notice && (
<div
role="status"
className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
>
{notice}
</div>
)}

<div className="mb-8 flex flex-wrap items-end justify-between gap-4">
<div>
<h2 className="text-xl font-bold">My Family Spaces</h2>
<p className="mt-1 text-sm text-slate-500">
Manage the family spaces you created.
</p>
</div>

<span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
{families.length}{" "}
{families.length === 1 ? "family space" : "family spaces"}
</span>
</div>

{loading ? (
<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
<p className="text-slate-500">Loading your family spaces...</p>
</div>
) : families.length === 0 ? (
<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
<div className="mb-4 text-5xl">🌳</div>
<h3 className="text-lg font-bold">Your family story starts here</h3>
<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
Create your first family space to begin preserving your
family history, memories, and stories.
</p>
<Link
href="/dashboard/family"
className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
>
Create your first family space
</Link>
</div>
) : (
<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
{families.map((family) => (
<article
key={family.id}
className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
>
<div className="mb-4 flex items-start justify-between gap-3">
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
🌳
</div>

<button
type="button"
onClick={() => void handleDeleteFamily(family)}
disabled={deletingId !== null}
className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
>
{deletingId === family.id
? "Deleting..."
: "Delete"}
</button>
</div>

<h3 className="break-words text-lg font-bold">
{family.name}
</h3>

<p className="mt-2 min-h-12 break-words text-sm leading-6 text-slate-500">
{family.description || "Your family's shared space."}
</p>

<div className="mt-5 grid grid-cols-2 gap-2">
<Link
href={`/dashboard/family?id=${family.id}`}
className="rounded-xl bg-emerald-700 px-3 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-800"
>
Open Family
</Link>

<Link
href="/dashboard/family-members"
className="rounded-xl border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
>
Members
</Link>
</div>
</article>
))}
</div>
)}

<div className="mb-4 mt-12">
<h2 className="text-xl font-bold">Explore Your Workspace</h2>
<p className="mt-1 text-sm text-slate-500">
Access the tools that help your family preserve its legacy.
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
{navigationItems
.filter((item) => item.href !== "/dashboard")
.map((item) => (
<Link
key={item.href}
href={item.href}
className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
>
<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl transition group-hover:bg-emerald-50">
{item.icon}
</div>
<h3 className="font-bold">{item.label}</h3>
<p className="mt-2 text-sm leading-6 text-slate-500">
{getFeatureDescription(item.label)}
</p>
<span className="mt-4 inline-block text-sm font-semibold text-emerald-700">
Open feature →
</span>
</Link>
))}
</div>

<footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
ConnetFam · Preserving family stories for generations.
</footer>
</div>
</section>
</div>
</main>
);
}

function getFeatureDescription(label: string): string {
const descriptions: Record<string, string> = {
"Family Tree": "Explore family connections and generations.",
"Family Members": "Add and manage your family members.",
Stories: "Preserve the stories that define your family.",
Memories: "Keep precious moments and family milestones.",
Media: "Organize family photos and videos.",
"Family Calendar": "Keep track of family events and important dates.",
"Voice Messages": "Preserve the voices of the people you love.",
Settings: "Manage your account and workspace preferences.",
};

return descriptions[label] ?? "Explore this family feature.";
}