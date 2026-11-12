"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
ArrowLeft,
ArrowRight,
BookOpen,
CalendarDays,
Camera,
Heart,
Loader2,
MessageCircle,
Mic,
TreeDeciduous,
Users,
Video,
Sparkles,
Copy,
Check,
Mail,
UserPlus,
ShieldCheck,
Share2,
} from "lucide-react";

import { supabase } from "@/app/lib/supabase";

type Family = {
id: number;
name: string;
description?: string | null;
created_by?: string;
};

type FamilyMember = {
id: number;
profile_id: number;
role: string;
status: string;
is_active: boolean;
};

type FamilyRelative = {
id: number;
family_id: number;
full_name: string;
relationship: string | null;
email: string | null;
profile_id: number | null;
};

type Section = "overview" | "space" | "heritage";

const familySpaceFeatures = [
{
title: "Family Members",
description: "Meet the people who make up your family.",
icon: Users,
path: "/dashboard/family-members",
},
{
title: "Family Tree",
description: "Explore family relationships and generations.",
icon: TreeDeciduous,
path: "/dashboard/family-tree",
},
];

const heritageFeatures = [
{
title: "Stories",
description: "Preserve the stories that define your family.",
icon: BookOpen,
path: "/dashboard/stories",
available: true,
},
{
title: "Memories",
description: "Keep special family moments alive.",
icon: Heart,
path: "/dashboard/memories",
available: true,
},
{
title: "Photos & Videos",
description: "Keep family photographs and videos together.",
icon: Camera,
path: "/dashboard/media",
available: true,
},
{
title: "Voice Notes",
description: "Preserve the voices of the people you love.",
icon: Mic,
path: "/dashboard/voice-messages",
available: true,
},
{
title: "Text Messages",
description: "Keep meaningful family messages and conversations.",
icon: MessageCircle,
path: "",
available: false,
},
{
title: "Video Messages",
description: "Save personal video messages from family members.",
icon: Video,
path: "",
available: false,
},
{
title: "Calendar & Events",
description: "Remember birthdays, gatherings and important dates.",
icon: CalendarDays,
path: "/dashboard/calendar",
available: true,
},
];

export default function FamilyHomePage() {
const router = useRouter();

const [family, setFamily] = useState<Family | null>(null);
const [members, setMembers] = useState<FamilyMember[]>([]);
const [relatives, setRelatives] = useState<FamilyRelative[]>([]);

const [userRole, setUserRole] = useState("");

const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [activeSection, setActiveSection] =
useState<Section>("overview");

const [emailByRelative, setEmailByRelative] = useState<
Record<number, string>
>({});

const [invitingId, setInvitingId] = useState<number | null>(null);

const [invitationLinks, setInvitationLinks] = useState<
Record<number, string>
>({});

const [messages, setMessages] = useState<
Record<number, string>
>({});

const [copiedId, setCopiedId] = useState<number | null>(null);

const [globalMessage, setGlobalMessage] = useState("");

const [globalMessageIsError, setGlobalMessageIsError] =
useState(false);

const canInvite =
userRole === "owner" || userRole === "admin";

const loadFamily = useCallback(async () => {
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

const params = new URLSearchParams(window.location.search);

const familyIdValue =
params.get("id") || params.get("family_id");

const selectedFamilyId = Number(familyIdValue);

const requestedSection = params.get("section");

if (
requestedSection === "space" ||
requestedSection === "heritage"
) {
setActiveSection(requestedSection);
} else {
setActiveSection("overview");
}

if (
!familyIdValue ||
!Number.isSafeInteger(selectedFamilyId) ||
selectedFamilyId <= 0
) {
throw new Error(
"No family was selected. Please return to your dashboard and open a family."
);
}

const { data: profile, error: profileError } =
await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.single();

if (profileError) throw profileError;

if (!profile) {
throw new Error("Your profile could not be found.");
}

const { data: membership, error: membershipError } =
await supabase
.from("family_members")
.select("id, role")
.eq("family_id", selectedFamilyId)
.eq("profile_id", profile.id)
.eq("status", "active")
.eq("is_active", true)
.maybeSingle();

if (membershipError) throw membershipError;

if (!membership) {
throw new Error(
"You do not have active access to this family workspace."
);
}

setUserRole(membership.role || "");

const { data: familyData, error: familyError } =
await supabase
.from("families")
.select("id, name, description, created_by")
.eq("id", selectedFamilyId)
.single();

if (familyError) throw familyError;

setFamily(familyData as Family);

const { data: memberData, error: membersError } =
await supabase
.from("family_members")
.select("id, profile_id, role, status, is_active")
.eq("family_id", selectedFamilyId)
.eq("status", "active")
.eq("is_active", true);

if (membersError) throw membersError;

setMembers((memberData || []) as FamilyMember[]);

const { data: relativesData, error: relativesError } =
await supabase
.from("family_relatives")
.select(
"id, family_id, full_name, relationship, email, profile_id"
)
.eq("family_id", selectedFamilyId)
.order("full_name", { ascending: true });

if (relativesError) throw relativesError;

const loadedRelatives = (relativesData ||
[]) as FamilyRelative[];

setRelatives(loadedRelatives);

const savedEmails: Record<number, string> = {};

loadedRelatives.forEach((relative) => {
savedEmails[relative.id] = relative.email || "";
});

setEmailByRelative(savedEmails);
} catch (err) {
console.error("FAMILY HOME ERROR:", err);

setError(
err instanceof Error
? err.message
: "Unable to load this family workspace."
);
} finally {
setLoading(false);
}
}, [router]);

useEffect(() => {
void loadFamily();
}, [loadFamily]);

function changeSection(section: Section) {
setActiveSection(section);

if (!family) return;

const params = new URLSearchParams();

params.set("id", String(family.id));

if (section !== "overview") {
params.set("section", section);
}

router.replace(
`/dashboard/family-home?${params.toString()}`
);
}

function updateRelativeEmail(
relativeId: number,
value: string
) {
setEmailByRelative((previous) => ({
...previous,
[relativeId]: value,
}));

setInvitationLinks((previous) => ({
...previous,
[relativeId]: "",
}));

setMessages((previous) => ({
...previous,
[relativeId]: "",
}));
}

async function sendInvitation(relative: FamilyRelative) {
if (!family) {
setGlobalMessage("No family was found.");
setGlobalMessageIsError(true);
return;
}

if (!canInvite) {
setGlobalMessage(
"Only family owners and admins can invite members."
);
setGlobalMessageIsError(true);
return;
}

if (relative.profile_id) {
setMessages((previous) => ({
...previous,
[relative.id]: "This person already has a connected account.",
}));
return;
}

const email =
emailByRelative[relative.id]?.trim() || "";

if (
email &&
!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
) {
setMessages((previous) => ({
...previous,
[relative.id]: "Please enter a valid email address or leave it empty.",
}));
return;
}

setInvitingId(relative.id);

setMessages((previous) => ({
...previous,
[relative.id]: "",
}));

setInvitationLinks((previous) => ({
...previous,
[relative.id]: "",
}));

try {
const {
data: { session },
error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session) {
router.replace("/login");
return;
}

const response = await fetch(
"/api/family-invitations",
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${session.access_token}`,
},
body: JSON.stringify({
familyId: family.id,
relativeId: relative.id,
email: email || null,
}),
}
);

const result = await response.json();

if (!response.ok || !result.success) {
throw new Error(
result.error ||
"Invitation could not be created."
);
}

if (!result.invitationLink) {
throw new Error(
"The invitation was created, but no link was returned."
);
}

setInvitationLinks((previous) => ({
...previous,
[relative.id]: result.invitationLink,
}));

setMessages((previous) => ({
...previous,
[relative.id]: `Invitation for ${relative.full_name} created successfully.`,
}));
} catch (err) {
console.error("INVITATION ERROR:", err);

setMessages((previous) => ({
...previous,
[relative.id]:
err instanceof Error
? err.message
: "Unable to create the invitation.",
}));
} finally {
setInvitingId(null);
}
}

async function copyInvitationLink(relativeId: number) {
const link = invitationLinks[relativeId];

if (!link) return;

try {
await navigator.clipboard.writeText(link);

setCopiedId(relativeId);

setMessages((previous) => ({
...previous,
[relativeId]: "Invitation link copied successfully.",
}));

window.setTimeout(() => {
setCopiedId((current) =>
current === relativeId ? null : current
);
}, 2500);
} catch {
setMessages((previous) => ({
...previous,
[relativeId]:
"Copying failed. Please select the link and copy it manually.",
}));
}
}

async function shareInvitationLink(relative: FamilyRelative) {
const link = invitationLinks[relative.id];

if (!link || !family) return;

try {
if (navigator.share) {
await navigator.share({
title: "Join my family on Legacy Family",
text: `You have been invited to join ${family.name} on Legacy Family.`,
url: link,
});
} else {
await copyInvitationLink(relative.id);
}
} catch (err) {
if (
err instanceof Error &&
err.name === "AbortError"
) {
return;
}

setMessages((previous) => ({
...previous,
[relative.id]: "Unable to share the invitation link.",
}));
}
}

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-8">
<div className="flex items-center gap-3 rounded-2xl bg-white p-8 text-sm text-gray-600 shadow-sm">
<Loader2
className="animate-spin text-emerald-800"
size={20}
/>
Loading your family workspace...
</div>
</main>
);
}

if (error || !family) {
return (
<main className="min-h-screen bg-[#f7f5ef] p-8">
<div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
<h1 className="text-xl font-bold">
Family workspace unavailable
</h1>

<p className="mt-3">
{error ||
"The selected family could not be found."}
</p>

<Link
href="/dashboard"
className="mt-6 inline-block rounded-full bg-[#17352b] px-6 py-3 text-white"
>
Return to Dashboard
</Link>
</div>
</main>
);
}

const unlinkedRelatives = relatives.filter(
(relative) => !relative.profile_id
);

return (
<main className="min-h-screen bg-[#f7f5ef] px-5 py-8 text-slate-800 sm:px-8">
<div className="mx-auto max-w-6xl">

{/* Navigation */}

<div className="flex flex-wrap items-center justify-between gap-4">
<Link
href="/dashboard"
className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-800"
>
<ArrowLeft size={17} />
Back to Dashboard
</Link>

<span className="text-xs font-semibold tracking-widest text-emerald-800">
LEGACY · CONNETFAM
</span>
</div>

{/* Family Header */}

<header className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#17352b] to-[#28614c] p-8 text-white shadow-sm sm:p-10">
<div className="flex items-center gap-2 text-sm text-emerald-200">
<Sparkles size={16} />
Your family's private home
</div>

<h1 className="mt-4 text-3xl font-bold sm:text-4xl">
{family.name}
</h1>

<p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-100">
{family.description ||
"A shared home for your family's people, stories and memories across generations."}
</p>

<div className="mt-7 flex flex-wrap gap-3">
<span className="rounded-full bg-white/10 px-4 py-2 text-sm">
<Users
className="mr-2 inline"
size={15}
/>
{members.length} active members
</span>

<span className="rounded-full bg-white/10 px-4 py-2 text-sm">
Family workspace #{family.id}
</span>
</div>
</header>

{/* Section Navigation */}

<nav className="mt-7 grid grid-cols-3 gap-2 rounded-2xl border border-black/5 bg-white p-2 shadow-sm">
{(
[
["overview", "Overview"],
["space", "Family Space"],
["heritage", "Family Heritage"],
] as [Section, string][]
).map(([section, label]) => (
<button
key={section}
type="button"
onClick={() => changeSection(section)}
className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
activeSection === section
? "bg-[#17352b] text-white"
: "text-gray-600 hover:bg-gray-100"
}`}
>
{label}
</button>
))}
</nav>

{/* Overview */}

{activeSection === "overview" && (
<section className="mt-9">
<p className="text-sm font-semibold text-emerald-800">
YOUR FAMILY AT A GLANCE
</p>

<h2 className="mt-2 text-2xl font-bold">
Welcome to your family home
</h2>

<p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
Bring your family together and preserve the
stories, relationships and moments that matter.
</p>

<div className="mt-7 grid gap-5 md:grid-cols-2">
<button
type="button"
onClick={() => changeSection("space")}
className="group rounded-3xl border border-emerald-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
>
<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
<TreeDeciduous size={30} />
</div>

<h3 className="mt-5 text-xl font-bold">
Family Space
</h3>

<p className="mt-2 text-sm leading-7 text-gray-600">
Discover your family members, manage
connections and explore your family tree.
</p>

<span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
Explore Family Space
<ArrowRight size={17} />
</span>
</button>

<button
type="button"
onClick={() => changeSection("heritage")}
className="group rounded-3xl border border-amber-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
>
<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
<Heart size={29} />
</div>

<h3 className="mt-5 text-xl font-bold">
Family Heritage
</h3>

<p className="mt-2 text-sm leading-7 text-gray-600">
Preserve photographs, videos, stories, voice
notes and the moments your family shares.
</p>

<span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-800">
Explore Family Heritage
<ArrowRight size={17} />
</span>
</button>
</div>
</section>
)}

{/* Family Space */}

{activeSection === "space" && (
<section className="mt-9">
<p className="text-sm font-semibold text-emerald-800">
YOUR PEOPLE AND CONNECTIONS
</p>

<h2 className="mt-2 text-2xl font-bold">
Family Space
</h2>

<p className="mt-2 text-sm leading-7 text-gray-600">
This is where your family comes together. Manage
members, understand relationships and explore
generations.
</p>

<div className="mt-7 grid gap-5 sm:grid-cols-2">
{familySpaceFeatures.map((feature) => {
const Icon = feature.icon;

return (
<Link
key={feature.title}
href={`${feature.path}?family_id=${family.id}`}
className="group rounded-3xl border border-black/10 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
>
<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
<Icon size={29} />
</div>

<h3 className="mt-5 text-xl font-bold">
{feature.title}
</h3>

<p className="mt-2 text-sm leading-7 text-gray-600">
{feature.description}
</p>

<span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
Open feature
<ArrowRight size={17} />
</span>
</Link>
);
})}
</div>

{/* Invitation Section */}

<div className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
<div className="flex items-center gap-3">
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
<UserPlus size={24} />
</div>

<div>
<h3 className="text-xl font-bold">
Invite Family Members
</h3>

<p className="mt-1 text-sm text-gray-600">
Invite people directly from your existing
family tree.
</p>
</div>
</div>

{!canInvite ? (
<div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
<ShieldCheck
className="mr-2 inline"
size={18}
/>
Only family owners and admins can generate
invitations.
</div>
) : (
<div className="mt-7 space-y-5">
{relatives.length === 0 && (
<div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
No family-tree people have been added yet.
Add your relatives to the Family Tree first.
</div>
)}

{relatives.map((relative) => {
const link =
invitationLinks[relative.id];

const isInviting =
invitingId === relative.id;

const isConnected =
Boolean(relative.profile_id);

return (
<div
key={relative.id}
className="rounded-2xl border border-gray-200 bg-white p-5"
>
<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
<div>
<h4 className="text-lg font-bold text-gray-900">
{relative.full_name}
</h4>

<p className="mt-1 text-sm text-gray-500">
{relative.relationship ||
"Family member"}
</p>
</div>

{isConnected ? (
<span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
<Check size={16} />
Already Connected
</span>
) : (
<span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
<UserPlus size={15} />
Not connected yet
</span>
)}
</div>

{!isConnected && (
<>
<div className="mt-5">
<label
htmlFor={`email-${relative.id}`}
className="mb-2 block text-sm font-semibold text-gray-700"
>
Email address (optional)
</label>

<input
id={`email-${relative.id}`}
type="email"
value={
emailByRelative[relative.id] || ""
}
onChange={(event) =>
updateRelativeEmail(
relative.id,
event.target.value
)
}
placeholder="Leave empty if they don't have an email"
className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
/>

<p className="mt-2 text-xs text-gray-500">
You can generate a link without
entering an email address.
</p>
</div>

<button
type="button"
onClick={() =>
sendInvitation(relative)
}
disabled={isInviting}
className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17352b] px-6 py-3 font-semibold text-white transition hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
>
{isInviting ? (
<Loader2
size={18}
className="animate-spin"
/>
) : (
<Mail size={18} />
)}

{isInviting
? "Generating invitation..."
: `Invite ${relative.full_name}`}
</button>
</>
)}

{messages[relative.id] && (
<div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
{messages[relative.id]}
</div>
)}

{link && (
<div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
<div className="flex items-center gap-2 font-semibold text-emerald-900">
<Check size={19} />
Invitation link created!
</div>

<input
readOnly
value={link}
onFocus={(event) =>
event.target.select()
}
className="mt-4 w-full rounded-lg border border-emerald-200 bg-white px-3 py-3 text-sm"
/>

<div className="mt-4 flex flex-wrap gap-3">
<button
type="button"
onClick={() =>
copyInvitationLink(relative.id)
}
className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white"
>
{copiedId === relative.id ? (
<Check size={17} />
) : (
<Copy size={17} />
)}

{copiedId === relative.id
? "Copied"
: "Copy Link"}
</button>

<button
type="button"
onClick={() =>
shareInvitationLink(relative)
}
className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-800"
>
<Share2 size={17} />
Share Invitation
</button>
</div>
</div>
)}
</div>
);
})}
</div>
)}

{globalMessage && (
<div
className={`mt-4 rounded-xl p-4 text-sm ${
globalMessageIsError
? "border border-red-200 bg-red-50 text-red-700"
: "border border-emerald-200 bg-emerald-50 text-emerald-800"
}`}
>
{globalMessage}
</div>
)}
</div>

{/* Member Count */}

<div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
<div className="flex items-center justify-between gap-4">
<div>
<h3 className="font-bold">
Your Family Members
</h3>

<p className="mt-1 text-sm text-gray-500">
Active accounts in this family.
</p>
</div>

<Link
href={`/dashboard/family-members?family_id=${family.id}`}
className="text-sm font-semibold text-emerald-800"
>
Manage Members →
</Link>
</div>

<p className="mt-5 text-3xl font-bold">
{members.length}
</p>

<p className="text-sm text-gray-500">
Active family accounts
</p>
</div>
</section>
)}

{/* Family Heritage */}

{activeSection === "heritage" && (
<section className="mt-9">
<p className="text-sm font-semibold text-amber-800">
YOUR FAMILY'S HISTORY AND MEMORIES
</p>

<h2 className="mt-2 text-2xl font-bold">
Family Heritage
</h2>

<p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
A place to preserve the stories, photographs,
voices, messages and important moments that
future generations will treasure.
</p>

<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
{heritageFeatures.map((feature) => {
const Icon = feature.icon;

const cardContent = (
<>
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
<Icon size={25} />
</div>

<div className="mt-5 flex items-center justify-between gap-2">
<h3 className="font-bold">
{feature.title}
</h3>

{feature.available ? (
<ArrowRight
size={17}
className="text-amber-800"
/>
) : (
<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
Coming soon
</span>
)}
</div>

<p className="mt-2 text-sm leading-6 text-gray-600">
{feature.description}
</p>
</>
);

return feature.available ? (
<Link
key={feature.title}
href={`${feature.path}?family_id=${family.id}`}
className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
>
{cardContent}
</Link>
) : (
<div
key={feature.title}
className="rounded-2xl border border-black/10 bg-white p-6 opacity-75"
>
{cardContent}
</div>
);
})}
</div>

<div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
<div className="flex items-start gap-3">
<Heart
className="mt-1 shrink-0 text-amber-800"
size={21}
/>

<div>
<h3 className="font-bold text-amber-950">
Every memory matters
</h3>

<p className="mt-1 text-sm leading-6 text-amber-900/80">
Your family's heritage is more than
photographs. It is the voices, messages,
stories and experiences that make your
family what it is.
</p>
</div>
</div>
</div>
</section>
)}

{/* Footer */}

<footer className="mt-12 flex flex-wrap gap-5 border-t border-gray-200 pt-6">
<Link
href="/dashboard/settings"
className="text-sm font-semibold text-gray-600 hover:text-emerald-800"
>
Account Settings
</Link>

<Link
href="/dashboard/notifications"
className="text-sm font-semibold text-gray-600 hover:text-emerald-800"
>
Notifications
</Link>
</footer>
</div>
</main>
);
}
