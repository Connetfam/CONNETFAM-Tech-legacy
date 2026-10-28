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

type FamilyRelative = {
id: number;
family_id: number;
full_name: string;
relationship: string | null;
email: string | null;
phone: string | null;
notes: string | null;
};

type ProfileUser = {
email?: string;
user_metadata?: {
avatar_url?: string;
full_name?: string;
name?: string;
};
};

export default function FamilyHomePage() {
const router = useRouter();

const [familyId, setFamilyId] = useState<number | null>(null);
const [family, setFamily] = useState<Family | null>(null);
const [relatives, setRelatives] = useState<FamilyRelative[]>([]);
const [user, setUser] = useState<ProfileUser | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const loadFamily = useCallback(
async (id: number) => {
setLoading(true);
setError("");

try {
const {
data: { user: currentUser },
error: authError,
} = await supabase.auth.getUser();

if (authError) throw authError;

if (!currentUser) {
router.replace("/login");
return;
}

setUser({
email: currentUser.email ?? undefined,
user_metadata: currentUser.user_metadata,
});

// Load the selected family.
const { data: familyData, error: familyError } = await supabase
.from("families")
.select("id, name, description, created_by")
.eq("id", id)
.maybeSingle();

if (familyError) throw familyError;

if (!familyData) {
throw new Error(
"This family could not be found, or you do not have permission to view it."
);
}

setFamily(familyData as Family);

// Load relatives belonging to this family only.
const { data: relativeData, error: relativesError } =
await supabase
.from("family_relatives")
.select(
"id, family_id, full_name, relationship, email, phone, notes"
)
.eq("family_id", id)
.order("created_at", { ascending: true });

if (relativesError) throw relativesError;

setRelatives((relativeData ?? []) as FamilyRelative[]);
} catch (err) {
console.error("Family Home loading error:", err);

setError(
err instanceof Error
? err.message
: "Unable to load this family. Please try again."
);
} finally {
setLoading(false);
}
},
[router]
);

useEffect(() => {
// Read the family ID from the URL, for example:
// /dashboard/family-home?id=1
const params = new URLSearchParams(window.location.search);
const idFromUrl = params.get("id");

if (!idFromUrl) {
setLoading(false);
setError(
"No family was selected. Return to your dashboard and open a family."
);
return;
}

const parsedId = Number(idFromUrl);

if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
setLoading(false);
setError("The family link is invalid. Please select a family again.");
return;
}

setFamilyId(parsedId);
void loadFamily(parsedId);
}, [loadFamily]);

const avatarUrl = user?.user_metadata?.avatar_url;
const displayName =
user?.user_metadata?.full_name ||
user?.user_metadata?.name ||
user?.email?.split("@")[0] ||
"My Account";

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-6">
<div className="text-center">
<div className="mb-4 text-5xl">🌳</div>
<p className="text-gray-600">Opening your family home...</p>
</div>
</main>
);
}

if (error || !family) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-6">
<div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
<div className="mb-4 text-5xl">🏡</div>

<h1 className="text-2xl font-bold">Family Home</h1>

<p className="mt-3 break-words text-sm leading-6 text-gray-600">
{error || "We could not load this family."}
</p>

<Link
href="/dashboard"
className="mt-6 inline-flex rounded-full bg-[#17352b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#21483b]"
>
Return to dashboard
</Link>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-[#f7f5ef] text-[#1f2937]">
{/* Top navigation */}
<header className="border-b border-black/10 bg-white">
<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
<Link href="/dashboard" className="shrink-0">
<span className="text-xl font-bold tracking-tight text-emerald-800">
ConnetFam
</span>
<span className="hidden text-sm text-gray-500 sm:block">
Every family has a story.
</span>
</Link>

<div className="flex items-center gap-3">
<div className="hidden text-right sm:block">
<p className="text-sm font-semibold">{displayName}</p>
<p className="max-w-48 truncate text-xs text-gray-500">
{user?.email}
</p>
</div>

<Link
href="/dashboard/settings"
aria-label="Open profile and settings"
title="Profile and settings"
className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-emerald-50 text-xl"
>
{avatarUrl ? (
// The image URL comes from the signed-in user's metadata.
// eslint-disable-next-line @next/next/no-img-element
<img
src={avatarUrl}
alt="Your profile"
className="h-full w-full object-cover"
/>
) : (
"👤"
)}
</Link>
</div>
</div>
</header>

<div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
{/* Breadcrumbs */}
<nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
<Link
href="/dashboard"
className="hover:text-emerald-800"
>
My Dashboard
</Link>
<span>/</span>
<span className="font-medium text-gray-800">
{family.name}
</span>
</nav>

{/* Family introduction */}
<section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#17352b] via-emerald-800 to-teal-700 p-6 text-white sm:p-10">
<div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
<div className="max-w-2xl">
<p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-100">
Your family home
</p>

<h1 className="mt-3 break-words text-3xl font-bold sm:text-4xl">
{family.name}
</h1>

<p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-emerald-50 sm:text-base">
{family.description ||
"A shared home for your family stories, memories, and connections."}
</p>

<div className="mt-6 flex flex-wrap gap-3">
<Link
href={`/dashboard/family-members?family_id=${family.id}`}
className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
>
+ Manage Family Members
</Link>

<Link
href={`/dashboard/family?id=${family.id}`}
className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
>
Open Family Tree
</Link>
</div>
</div>

<div className="flex h-28 w-28 shrink-0 items-center justify-center self-start rounded-3xl border border-white/20 bg-white/10 text-6xl md:self-center">
🌳
</div>
</div>
</section>

{/* Family overview */}
<section className="mt-8 grid gap-4 sm:grid-cols-2">
<div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
<p className="text-sm text-gray-500">Family members added</p>

<p className="mt-2 text-3xl font-bold text-emerald-800">
{relatives.length}
</p>

<p className="mt-2 text-sm text-gray-500">
Relatives recorded in this family space.
</p>
</div>

<div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
<p className="text-sm text-gray-500">Family space</p>

<p className="mt-2 text-xl font-bold">
{family.name}
</p>

<p className="mt-2 text-sm text-gray-500">
Your dedicated place to preserve family history.
</p>
</div>
</section>

{/* Family members */}
<section className="mt-10">
<div className="mb-5 flex flex-wrap items-end justify-between gap-4">
<div>
<h2 className="text-2xl font-bold">Our Family</h2>
<p className="mt-2 text-sm text-gray-500">
The relatives recorded in this family space.
</p>
</div>

<Link
href={`/dashboard/family-members?family_id=${family.id}`}
className="text-sm font-semibold text-emerald-800 hover:underline"
>
Manage members →
</Link>
</div>

{relatives.length === 0 ? (
<div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
<div className="mb-4 text-5xl">👨‍👩‍👧‍👦</div>

<h3 className="text-lg font-bold">
Your family tree starts here
</h3>

<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
Add your parents, siblings, children, grandparents, and
other relatives to begin building your family history.
</p>

<Link
href={`/dashboard/family-members?family_id=${family.id}`}
className="mt-6 inline-flex rounded-full bg-[#17352b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#21483b]"
>
Add your first relative
</Link>
</div>
) : (
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
{relatives.map((relative) => (
<article
key={relative.id}
className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md"
>
<div className="flex items-start gap-4">
<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-2xl">
👤
</div>

<div className="min-w-0">
<h3 className="break-words font-bold">
{relative.full_name}
</h3>

<p className="mt-1 text-sm text-emerald-800">
{relative.relationship || "Family member"}
</p>
</div>
</div>

{relative.email && (
<p className="mt-4 break-all text-sm text-gray-500">
✉️ {relative.email}
</p>
)}

{relative.phone && (
<p className="mt-2 break-words text-sm text-gray-500">
📞 {relative.phone}
</p>
)}

{relative.notes && (
<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
{relative.notes}
</p>
)}
</article>
))}
</div>
)}
</section>

{/* Family features */}
<section className="mt-12">
<h2 className="text-2xl font-bold">Keep Your Family Connected</h2>

<p className="mt-2 text-sm text-gray-500">
Preserve the moments, voices, and stories that matter.
</p>

<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
<FeatureCard
icon="📖"
title="Family Stories"
description="Record the stories and wisdom passed between generations."
href="/dashboard/stories"
/>

<FeatureCard
icon="💝"
title="Memories"
description="Keep important family moments and milestones."
href="/dashboard/memories"
/>

<FeatureCard
icon="📸"
title="Family Photos"
description="Keep your family's photographs and media together."
href="/dashboard/media"
/>

<FeatureCard
icon="📅"
title="Family Calendar"
description="Keep track of birthdays, reunions, and recurring events."
href="/dashboard/calendar"
/>

<FeatureCard
icon="🎙️"
title="Voice Messages"
description="Preserve the voices and messages of loved ones."
href="/dashboard/voice-messages"
/>

<FeatureCard
icon="⚙️"
title="Family Settings"
description="Manage your account and profile preferences."
href="/dashboard/settings"
/>
</div>
</section>

<footer className="mt-12 border-t border-black/10 py-6 text-center text-xs text-gray-400">
ConnetFam · Every family has a story.
</footer>
</div>
</main>
);
}

function FeatureCard({
icon,
title,
description,
href,
}: {
icon: string;
title: string;
description: string;
href: string;
}) {
return (
<Link
href={href}
className="group rounded-2xl border border-black/5 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
>
<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
{icon}
</div>

<h3 className="font-bold group-hover:text-emerald-800">
{title}
</h3>

<p className="mt-2 text-sm leading-6 text-gray-500">
{description}
</p>

<span className="mt-4 inline-block text-sm font-semibold text-emerald-800">
Explore →
</span>
</Link>
);
}