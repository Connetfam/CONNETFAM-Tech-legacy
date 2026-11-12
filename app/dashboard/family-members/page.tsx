"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
Users,
UserPlus,
Search,
TreeDeciduous,
Mail,
Phone,
CalendarDays,
X,
Loader2,
ArrowRight,
BookUser,
Heart,
Copy,
Share2,
Check,
Link as LinkIcon,
ShieldCheck,
UserCheck,
UserX,
RefreshCw,
} from "lucide-react";

import { supabase } from "@/app/lib/supabase";

type FamilyRelative = {
id: number;
family_id: number;
full_name: string;
relationship: string | null;
email: string | null;
phone: string | null;
notes: string | null;
created_at: string;
profile_id?: number | null;
};

type PendingRequest = {
id: number;
family_id: number;
profile_id: number;
relative_id?: number | null;
role: string;
status: string;
created_at: string;
profile?: {
id: number;
user_id?: string;
full_name?: string | null;
avatar_url?: string | null;
} | null;
relative?: {
id: number;
full_name: string;
relationship: string | null;
} | null;
};

type FormData = {
full_name: string;
relationship: string;
email: string;
phone: string;
notes: string;
};

type InvitationResponse = {
success?: boolean;
invitationLink?: string;
expiresAt?: string;
relativeName?: string;
error?: string;
};

const initialForm: FormData = {
full_name: "",
relationship: "",
email: "",
phone: "",
notes: "",
};

export default function FamilyMembersPage() {
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

const [familyId, setFamilyId] = useState<number | null>(null);
const [familyName, setFamilyName] = useState("My Family");
const [userRole, setUserRole] = useState("");

const [relatives, setRelatives] = useState<FamilyRelative[]>([]);
const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

const [processingRequestId, setProcessingRequestId] =
useState<number | null>(null);

const [search, setSearch] = useState("");
const [relationshipFilter, setRelationshipFilter] = useState("All");

const [showAddForm, setShowAddForm] = useState(false);
const [form, setForm] = useState<FormData>(initialForm);

const [showInviteDialog, setShowInviteDialog] = useState(false);
const [inviteName, setInviteName] = useState("");
const [inviteRelationship, setInviteRelationship] = useState("");
const [inviteEmail, setInviteEmail] = useState("");

const [inviting, setInviting] = useState(false);
const [inviteLink, setInviteLink] = useState("");
const [inviteMessage, setInviteMessage] = useState("");
const [inviteExpiry, setInviteExpiry] = useState("");
const [copied, setCopied] = useState(false);

const [pageMessage, setPageMessage] = useState("");
const [pageMessageIsError, setPageMessageIsError] = useState(false);

const canInvite = userRole === "owner" || userRole === "admin";

const loadFamilyData = useCallback(async () => {
setLoading(true);
setPageMessage("");

try {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
throw new Error("Please log in to view your family members.");
}

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError) throw profileError;

if (!profile) {
throw new Error("Your profile could not be found.");
}

const params = new URLSearchParams(window.location.search);
const requestedFamilyId = params.get("family_id");

let membershipQuery = supabase
.from("family_members")
.select("family_id, role")
.eq("profile_id", profile.id)
.eq("status", "active")
.eq("is_active", true);

if (requestedFamilyId) {
membershipQuery = membershipQuery.eq(
"family_id",
Number(requestedFamilyId)
);
}

const { data: membership, error: membershipError } =
await membershipQuery.limit(1).maybeSingle();

if (membershipError) throw membershipError;

if (!membership) {
setFamilyId(null);
setUserRole("");
setRelatives([]);
setPendingRequests([]);

throw new Error(
"You do not have active access to this family. Please create or join a family first."
);
}

const currentFamilyId = Number(membership.family_id);

setFamilyId(currentFamilyId);
setUserRole(membership.role || "");

const { data: family, error: familyError } = await supabase
.from("families")
.select("id, name")
.eq("id", currentFamilyId)
.maybeSingle();

if (familyError) throw familyError;

setFamilyName(family?.name || "My Family");

const { data: relativesData, error: relativesError } = await supabase
.from("family_relatives")
.select(
"id, family_id, full_name, relationship, email, phone, notes, created_at, profile_id"
)
.eq("family_id", currentFamilyId)
.order("created_at", { ascending: false });

if (relativesError) throw relativesError;

setRelatives((relativesData || []) as FamilyRelative[]);

if (membership.role === "owner") {
const {
data: { session },
error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session) {
throw new Error("Your session has expired. Please log in again.");
}

const pendingResponse = await fetch(
`/api/family-members/pending?familyId=${currentFamilyId}`,
{
headers: {
Authorization: `Bearer ${session.access_token}`,
},
cache: "no-store",
}
);

const contentType =
pendingResponse.headers.get("content-type") || "";

if (!contentType.includes("application/json")) {
throw new Error(
"The pending requests API returned a webpage instead of JSON. Please check app/api/family-members/pending/route.ts."
);
}

const pendingResult = await pendingResponse.json();

if (!pendingResponse.ok || !pendingResult.success) {
throw new Error(
pendingResult.error || "Unable to load pending requests."
);
}

setPendingRequests(
Array.isArray(pendingResult.requests)
? pendingResult.requests
: []
);
} else {
setPendingRequests([]);
}
} catch (error) {
setPageMessage(
error instanceof Error
? error.message
: "Unable to load family members."
);
setPageMessageIsError(true);
} finally {
setLoading(false);
}
}, []);

useEffect(() => {
void loadFamilyData();
}, [loadFamilyData]);

const relationships = useMemo(() => {
const unique = Array.from(
new Set(
relatives
.map((relative) => relative.relationship)
.filter((value): value is string => Boolean(value))
)
);

return ["All", ...unique];
}, [relatives]);

const filteredRelatives = useMemo(() => {
return relatives.filter((relative) => {
const searchText = search.toLowerCase();

const matchesSearch =
relative.full_name.toLowerCase().includes(searchText) ||
(relative.email || "").toLowerCase().includes(searchText) ||
(relative.relationship || "").toLowerCase().includes(searchText);

const matchesRelationship =
relationshipFilter === "All" ||
relative.relationship === relationshipFilter;

return matchesSearch && matchesRelationship;
});
}, [relatives, search, relationshipFilter]);

async function handleAddRelative(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (!familyId) {
setPageMessage("No active family was found.");
setPageMessageIsError(true);
return;
}

if (!form.full_name.trim() || !form.relationship.trim()) {
setPageMessage("Please enter the person's name and relationship.");
setPageMessageIsError(true);
return;
}

setSaving(true);
setPageMessage("");

try {
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
throw new Error("Please log in again.");
}

const { error } = await supabase.from("family_relatives").insert({
family_id: familyId,
full_name: form.full_name.trim(),
relationship: form.relationship.trim(),
email: form.email.trim() || null,
phone: form.phone.trim() || null,
notes: form.notes.trim() || null,
created_by: user.id,
});

if (error) throw error;

setForm(initialForm);
setShowAddForm(false);
setPageMessage("Family member added successfully.");
setPageMessageIsError(false);

await loadFamilyData();
} catch (error) {
setPageMessage(
error instanceof Error
? error.message
: "Unable to add this family member."
);
setPageMessageIsError(true);
} finally {
setSaving(false);
}
}

function openInvitationDialog() {
setInviteName("");
setInviteRelationship("");
setInviteEmail("");
setInviteLink("");
setInviteMessage("");
setInviteExpiry("");
setCopied(false);
setShowInviteDialog(true);
}

async function handleCreateInvitation(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (!familyId) {
setInviteMessage("No active family was found.");
return;
}

if (!inviteName.trim() || !inviteRelationship.trim()) {
setInviteMessage("Please enter the person's name and relationship.");
return;
}

setInviting(true);
setInviteMessage("");
setInviteLink("");
setCopied(false);

try {
const {
data: { session },
error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session) {
throw new Error("Your session has expired. Please log in again.");
}

const response = await fetch("/api/family-invitations", {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${session.access_token}`,
},
body: JSON.stringify({
familyId,
fullName: inviteName.trim(),
relationship: inviteRelationship.trim(),
email: inviteEmail.trim() || null,
}),
});

const contentType = response.headers.get("content-type") || "";

if (!contentType.includes("application/json")) {
throw new Error(
"The invitation API returned a webpage instead of JSON. Check app/api/family-invitations/route.ts."
);
}

const result = (await response.json()) as InvitationResponse;

if (!response.ok || !result.success || !result.invitationLink) {
throw new Error(
result.error || "Could not create the invitation."
);
}

setInviteLink(result.invitationLink);
setInviteExpiry(result.expiresAt || "");
setInviteMessage(
`Invitation for ${result.relativeName || inviteName} created successfully.`
);

await loadFamilyData();
} catch (error) {
setInviteMessage(
error instanceof Error
? error.message
: "Something went wrong. Please try again."
);
} finally {
setInviting(false);
}
}

async function copyInvitationLink() {
if (!inviteLink) return;

try {
await navigator.clipboard.writeText(inviteLink);
setCopied(true);
setInviteMessage("Invitation link copied successfully.");
} catch {
setInviteMessage(
"Copying failed. Please select the link and copy it manually."
);
}
}

async function shareInvitationLink() {
if (!inviteLink) return;

try {
if (navigator.share) {
await navigator.share({
title: "Join my family on Legacy Family",
text: `I've invited you to join ${familyName} on Legacy Family.`,
url: inviteLink,
});
} else {
await copyInvitationLink();
}
} catch (error) {
if (error instanceof Error && error.name === "AbortError") {
return;
}

setInviteMessage("Unable to share the invitation link.");
}
}

async function handleMembershipDecision(
membershipId: number,
action: "approve" | "reject"
) {
if (action === "reject") {
const confirmed = window.confirm(
"Are you sure you want to reject this family membership request?"
);

if (!confirmed) return;
}

setProcessingRequestId(membershipId);
setPageMessage("");

try {
const {
data: { session },
error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session) {
throw new Error("Your session has expired. Please log in again.");
}

const response = await fetch("/api/family-members/approve", {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${session.access_token}`,
},
body: JSON.stringify({
membershipId,
action,
}),
});

const contentType = response.headers.get("content-type") || "";

if (!contentType.includes("application/json")) {
throw new Error(
"The membership approval API returned an unexpected webpage."
);
}

const result = await response.json();

if (!response.ok || !result.success) {
throw new Error(
result.error || "Unable to process this membership request."
);
}

setPageMessage(
action === "approve"
? "Family membership approved successfully."
: "Family membership request rejected."
);

setPageMessageIsError(false);

await loadFamilyData();
} catch (error) {
setPageMessage(
error instanceof Error
? error.message
: "Something went wrong while processing the request."
);
setPageMessageIsError(true);
} finally {
setProcessingRequestId(null);
}
}

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-50">
<div className="flex items-center gap-3 rounded-2xl bg-white p-6 shadow-sm">
<Loader2 className="animate-spin text-blue-600" />
<span className="text-sm text-slate-600">
Loading family members...
</span>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-slate-50 p-4 md:p-8">
<div className="mx-auto max-w-7xl">
{/* PAGE HEADER */}

<div className="mb-8">
<div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
<Link href="/dashboard" className="hover:text-blue-600">
Dashboard
</Link>
<span>/</span>
<span>Family Members</span>
</div>

<h1 className="text-3xl font-bold text-slate-900">
Family Members
</h1>

<p className="mt-2 text-slate-500">
Manage the people who make your family special.
</p>
</div>

{pageMessage && (
<div
className={`mb-6 rounded-xl border p-4 text-sm ${
pageMessageIsError
? "border-red-200 bg-red-50 text-red-700"
: "border-green-200 bg-green-50 text-green-800"
}`}
>
{pageMessage}
</div>
)}

{/* SEPARATE ACTIONS */}

<section className="mb-8 grid gap-6 lg:grid-cols-2">
{/* ADD FAMILY MEMBER */}

<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<div className="flex items-center gap-3">
<div className="rounded-xl bg-blue-50 p-3 text-blue-600">
<UserPlus size={25} />
</div>

<div>
<h2 className="text-xl font-bold text-slate-900">
Add Family Member
</h2>
<p className="text-sm text-slate-500">
Record someone in your family directory.
</p>
</div>
</div>

{!showAddForm ? (
<button
type="button"
onClick={() => setShowAddForm(true)}
disabled={!familyId}
className="mt-6 w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
>
Add a Relative
</button>
) : (
<form
onSubmit={handleAddRelative}
className="mt-6 space-y-4"
>
<div>
<label className="mb-1 block text-sm font-medium">
Full Name *
</label>
<input
required
value={form.full_name}
onChange={(event) =>
setForm({
...form,
full_name: event.target.value,
})
}
placeholder="Enter full name"
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
/>
</div>

<div>
<label className="mb-1 block text-sm font-medium">
Relationship *
</label>
<input
required
value={form.relationship}
onChange={(event) =>
setForm({
...form,
relationship: event.target.value,
})
}
placeholder="e.g. Mother, Uncle, Cousin"
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
/>
</div>

<div>
<label className="mb-1 block text-sm font-medium">
Email (optional)
</label>
<input
type="email"
value={form.email}
onChange={(event) =>
setForm({
...form,
email: event.target.value,
})
}
placeholder="Email address"
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
/>
</div>

<div>
<label className="mb-1 block text-sm font-medium">
Phone Number
</label>
<input
value={form.phone}
onChange={(event) =>
setForm({
...form,
phone: event.target.value,
})
}
placeholder="Phone number"
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
/>
</div>

<div>
<label className="mb-1 block text-sm font-medium">
Notes
</label>
<textarea
rows={3}
value={form.notes}
onChange={(event) =>
setForm({
...form,
notes: event.target.value,
})
}
placeholder="Additional information..."
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
/>
</div>

<div className="flex gap-3">
<button
type="submit"
disabled={saving}
className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
>
{saving && (
<Loader2 size={18} className="animate-spin" />
)}
{saving ? "Saving..." : "Save Family Member"}
</button>

<button
type="button"
onClick={() => {
setShowAddForm(false);
setForm(initialForm);
}}
className="rounded-xl border border-slate-200 px-4 py-3"
>
Cancel
</button>
</div>
</form>
)}
</div>

{/* INVITE SOMEONE NEW */}

<div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
<div className="flex items-center gap-3">
<div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
<Mail size={25} />
</div>

<div>
<h2 className="text-xl font-bold text-slate-900">
Invite Someone New
</h2>
<p className="text-sm text-slate-500">
Create their family record and send them an invitation.
</p>
</div>
</div>

<p className="mt-5 text-sm leading-6 text-slate-600">
Enter the person's details. They can register or log in
through the invitation link. You do not need their email
address to generate the link.
</p>

<button
type="button"
onClick={openInvitationDialog}
disabled={!familyId || !canInvite}
className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17352b] px-5 py-3 font-semibold text-white hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-50"
>
<UserPlus size={19} />
Create Invitation
</button>

{!canInvite && (
<p className="mt-3 text-xs text-amber-700">
Only family owners and admins can generate invitations.
</p>
)}
</div>
</section>

{/* PENDING REQUESTS */}

{userRole === "owner" && (
<section className="mb-8 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2">
<ShieldCheck className="text-amber-600" size={23} />
<h2 className="text-xl font-bold">Pending Requests</h2>

{pendingRequests.length > 0 && (
<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
{pendingRequests.length}
</span>
)}
</div>

<button
type="button"
onClick={() => void loadFamilyData()}
className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
>
<RefreshCw size={16} />
Refresh
</button>
</div>

<p className="mb-5 text-sm text-slate-500">
Review people requesting to join {familyName}.
</p>

{pendingRequests.length === 0 ? (
<div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
<UserCheck
size={34}
className="mx-auto mb-3 text-slate-300"
/>
<p className="font-semibold text-slate-700">
No pending requests
</p>
<p className="mt-1 text-sm text-slate-500">
New membership requests will appear here.
</p>
</div>
) : (
<div className="space-y-3">
{pendingRequests.map((request) => {
const displayName =
request.relative?.full_name ||
request.profile?.full_name ||
"New family member";

const relationship =
request.relative?.relationship || "";

return (
<div
key={request.id}
className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
>
<div className="min-w-0">
<div className="flex items-center gap-3">
{request.profile?.avatar_url ? (
<img
src={request.profile.avatar_url}
alt={displayName}
className="h-12 w-12 shrink-0 rounded-full object-cover"
/>
) : (
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
<Users size={21} />
</div>
)}

<div className="min-w-0">
<p className="truncate font-semibold text-slate-900">
{displayName}
</p>

{relationship && (
<p className="text-sm text-blue-600">
{relationship}
</p>
)}

<p className="text-xs text-slate-500">
Family membership request
</p>
</div>
</div>

<p className="mt-2 text-xs text-slate-400">
Requested{" "}
{new Date(request.created_at).toLocaleDateString()}
</p>
</div>

<div className="flex shrink-0 gap-2">
<button
type="button"
onClick={() =>
handleMembershipDecision(request.id, "approve")
}
disabled={processingRequestId !== null}
className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
>
{processingRequestId === request.id ? (
<Loader2
size={16}
className="animate-spin"
/>
) : (
<UserCheck size={16} />
)}
Approve
</button>

<button
type="button"
onClick={() =>
handleMembershipDecision(request.id, "reject")
}
disabled={processingRequestId !== null}
className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
>
<UserX size={16} />
Reject
</button>
</div>
</div>
);
})}
</div>
)}
</section>
)}

{/* DIRECTORY STATISTICS */}

<section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
<div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
<div className="mb-4 w-fit rounded-xl bg-blue-50 p-3 text-blue-600">
<Users size={23} />
</div>
<p className="text-3xl font-bold">{relatives.length}</p>
<p className="mt-1 text-sm text-slate-500">
Family relatives
</p>
</div>

<div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
<div className="mb-4 w-fit rounded-xl bg-pink-50 p-3 text-pink-600">
<Heart size={23} />
</div>
<p className="text-3xl font-bold">
{relationships.length - 1}
</p>
<p className="mt-1 text-sm text-slate-500">
Relationship categories
</p>
</div>

<div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
<div className="mb-4 w-fit rounded-xl bg-green-50 p-3 text-green-600">
<TreeDeciduous size={23} />
</div>
<p className="truncate text-xl font-bold">{familyName}</p>
<p className="mt-1 text-sm text-slate-500">
Your family workspace
</p>
</div>
</section>

{/* FAMILY DIRECTORY */}

<section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
<div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
<div>
<h2 className="text-xl font-bold">Family Directory</h2>
<p className="mt-1 text-sm text-slate-500">
View your existing family relatives.
</p>
</div>

<Link
href={`/dashboard/family-tree?family_id=${familyId}`}
className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
>
View Family Tree
<ArrowRight size={17} />
</Link>
</div>

<div className="mb-6 flex flex-col gap-3 md:flex-row">
<div className="relative flex-1">
<Search
size={19}
className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
/>
<input
type="text"
value={search}
onChange={(event) => setSearch(event.target.value)}
placeholder="Search by name, email or relationship..."
className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500"
/>
</div>

<select
value={relationshipFilter}
onChange={(event) =>
setRelationshipFilter(event.target.value)
}
className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
>
{relationships.map((relationship) => (
<option key={relationship} value={relationship}>
{relationship === "All"
? "All Relationships"
: relationship}
</option>
))}
</select>
</div>

{filteredRelatives.length === 0 ? (
<div className="rounded-2xl border border-dashed border-slate-200 px-6 py-16 text-center">
<BookUser
size={42}
className="mx-auto mb-4 text-slate-300"
/>
<h3 className="text-lg font-semibold">
{relatives.length === 0
? "Your family directory is waiting"
: "No matching family members"}
</h3>
<p className="mt-2 text-sm text-slate-500">
Add relatives or change your search.
</p>
</div>
) : (
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
{filteredRelatives.map((relative) => (
<article
key={relative.id}
className="rounded-2xl border border-slate-100 p-5 transition hover:border-blue-200 hover:shadow-md"
>
<div className="mb-4 flex items-center gap-3">
<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
<Users size={22} />
</div>

<div className="min-w-0">
<h3 className="truncate font-bold">
{relative.full_name}
</h3>
<p className="text-sm text-blue-600">
{relative.relationship || "Family relative"}
</p>
</div>
</div>

{relative.email && (
<div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
<Mail size={15} />
<span className="truncate">{relative.email}</span>
</div>
)}

{relative.phone && (
<div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
<Phone size={15} />
<span>{relative.phone}</span>
</div>
)}

{relative.notes && (
<p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
{relative.notes}
</p>
)}

<div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
<CalendarDays size={14} />
Added{" "}
{new Date(relative.created_at).toLocaleDateString()}
</div>

{relative.profile_id && (
<div className="mt-3 flex items-center gap-2 text-sm font-medium text-green-700">
<Check size={16} />
Connected account
</div>
)}
</article>
))}
</div>
)}
</section>
</div>

{/* INVITATION MODAL */}

{showInviteDialog && (
<div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
<div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
<div className="mb-6 flex items-start justify-between">
<div>
<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
<Mail size={24} />
</div>

<h2 className="text-xl font-bold">
Invite Someone New
</h2>

<p className="mt-2 text-sm text-slate-500">
Create a new family-tree record and invite them to{" "}
{familyName}.
</p>
</div>

<button
type="button"
onClick={() => setShowInviteDialog(false)}
className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
>
<X size={21} />
</button>
</div>

{!inviteLink ? (
<form onSubmit={handleCreateInvitation}>
<div className="space-y-4">
<div>
<label className="mb-2 block text-sm font-medium">
Full Name *
</label>
<input
required
value={inviteName}
onChange={(event) =>
setInviteName(event.target.value)
}
placeholder="Enter their full name"
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label className="mb-2 block text-sm font-medium">
Relationship to your family *
</label>
<input
required
value={inviteRelationship}
onChange={(event) =>
setInviteRelationship(event.target.value)
}
placeholder="e.g. Cousin, Aunt, Uncle"
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label className="mb-2 block text-sm font-medium">
Email address (optional)
</label>
<input
type="email"
value={inviteEmail}
onChange={(event) =>
setInviteEmail(event.target.value)
}
placeholder="Leave empty if they don't have email"
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>
</div>

<p className="my-5 text-xs leading-5 text-slate-500">
You can share the generated link through WhatsApp,
SMS or any messaging application.
</p>

{inviteMessage && (
<div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
{inviteMessage}
</div>
)}

<button
type="submit"
disabled={inviting}
className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17352b] py-3 font-semibold text-white hover:bg-[#21483b] disabled:opacity-60"
>
{inviting && (
<Loader2 size={18} className="animate-spin" />
)}
{inviting
? "Creating Invitation..."
: "Generate Invitation Link"}
</button>
</form>
) : (
<div>
<div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
<div className="flex items-center gap-2 font-semibold text-green-800">
<Check size={19} />
Invitation link created!
</div>

<p className="mt-1 text-sm text-green-700">
{inviteMessage}
</p>
</div>

<label className="mb-2 block text-sm font-semibold">
Your Invitation Link
</label>

<div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
<LinkIcon
size={18}
className="shrink-0 text-slate-400"
/>
<input
readOnly
value={inviteLink}
onFocus={(event) => event.target.select()}
className="min-w-0 flex-1 bg-transparent text-sm outline-none"
/>
</div>

<button
type="button"
onClick={copyInvitationLink}
className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 font-semibold text-white"
>
{copied ? <Check size={19} /> : <Copy size={19} />}
{copied ? "Link Copied!" : "Copy Invitation Link"}
</button>

<button
type="button"
onClick={shareInvitationLink}
className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white py-3 font-semibold text-emerald-800 hover:bg-emerald-50"
>
<Share2 size={19} />
Share Invitation
</button>

{inviteExpiry && (
<p className="mt-4 text-center text-xs text-slate-400">
Expires: {new Date(inviteExpiry).toLocaleString()}
</p>
)}

<button
type="button"
onClick={() => setShowInviteDialog(false)}
className="mt-5 w-full rounded-xl border border-slate-200 py-3 font-semibold text-slate-600 hover:bg-slate-50"
>
Done
</button>
</div>
)}
</div>
</div>
)}
</main>
);
}
