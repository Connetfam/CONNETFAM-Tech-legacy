"use client";

import {
useCallback,
useEffect,
useMemo,
useState,
type FormEvent,
type ReactNode,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
ArrowLeft,
GitBranch,
Users,
Search,
Plus,
X,
UserRound,
ChevronDown,
ChevronUp,
RefreshCw,
Heart,
Network,
} from "lucide-react";

import { supabase } from "@/app/lib/supabase";
import FamilyTreeView from "./FamilyTreeView";

type Relative = {
id: number;
family_id: number;
full_name: string;
relationship: string;
email: string | null;
phone: string | null;
notes: string | null;
};

type FamilyRelationship = {
id: number;
family_id: number;
person_id: number;
related_person_id: number;
relationship_type: string;
notes: string | null;
};

const relationshipOptions = [
"Parent",
"Father",
"Mother",
"Child",
"Son",
"Daughter",
"Sibling",
"Brother",
"Sister",
"Spouse",
"Partner",
"Grandparent",
"Grandfather",
"Grandmother",
"Grandchild",
"Uncle",
"Aunt",
"Cousin",
"Nephew",
"Niece",
"Step-parent",
"Step-child",
"Adoptive parent",
"Adopted child",
"Other",
];

export default function FamilyTreePage() {
const router = useRouter();

const [familyId, setFamilyId] = useState<number | null>(null);
const [familyName, setFamilyName] = useState("");

const [relatives, setRelatives] = useState<Relative[]>([]);
const [relationships, setRelationships] = useState<
FamilyRelationship[]
>([]);

const [selectedPerson, setSelectedPerson] =
useState<Relative | null>(null);

const [search, setSearch] = useState("");

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");

const [showForm, setShowForm] = useState(false);
const [showConnections, setShowConnections] = useState(true);

const [personId, setPersonId] = useState("");
const [relatedPersonId, setRelatedPersonId] = useState("");
const [relationshipType, setRelationshipType] =
useState("Parent");
const [relationshipNotes, setRelationshipNotes] =
useState("");

const loadFamilyTree = useCallback(async () => {
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

const { data: profile, error: profileError } =
await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError) throw profileError;

if (!profile) {
throw new Error(
"Your user profile could not be found."
);
}

const params = new URLSearchParams(
window.location.search
);

const familyIdFromUrl =
params.get("family_id") || params.get("id");

let currentFamilyId: number;

if (familyIdFromUrl) {
currentFamilyId = Number(familyIdFromUrl);

if (
!Number.isSafeInteger(currentFamilyId) ||
currentFamilyId <= 0
) {
throw new Error("The family link is invalid.");
}

const {
data: membership,
error: membershipError,
} = await supabase
.from("family_members")
.select("id")
.eq("family_id", currentFamilyId)
.eq("profile_id", profile.id)
.eq("status", "active")
.eq("is_active", true)
.maybeSingle();

if (membershipError) throw membershipError;

if (!membership) {
throw new Error(
"You do not have access to this family space."
);
}
} else {
const {
data: membership,
error: membershipError,
} = await supabase
.from("family_members")
.select("family_id")
.eq("profile_id", profile.id)
.eq("status", "active")
.eq("is_active", true)
.order("joined_at", { ascending: true })
.limit(1)
.maybeSingle();

if (membershipError) throw membershipError;

if (!membership) {
throw new Error(
"You do not belong to an active family space yet."
);
}

currentFamilyId = Number(membership.family_id);
}

setFamilyId(currentFamilyId);

const { data: familyData, error: familyError } =
await supabase
.from("families")
.select("id, name")
.eq("id", currentFamilyId)
.maybeSingle();

if (familyError) throw familyError;

if (!familyData) {
throw new Error(
"This family space could not be found."
);
}

setFamilyName(familyData.name);

const {
data: relativeData,
error: relativeError,
} = await supabase
.from("family_relatives")
.select(
"id, family_id, full_name, relationship, email, phone, notes"
)
.eq("family_id", currentFamilyId)
.order("full_name", { ascending: true });

if (relativeError) throw relativeError;

const {
data: relationshipData,
error: relationshipError,
} = await supabase
.from("family_relationships")
.select(
"id, family_id, person_id, related_person_id, relationship_type, notes"
)
.eq("family_id", currentFamilyId);

if (relationshipError) throw relationshipError;

const people = (relativeData ?? []) as Relative[];

setRelatives(people);

setRelationships(
(relationshipData ?? []) as FamilyRelationship[]
);

setSelectedPerson((previous) => {
if (!people.length) return null;

return (
people.find(
(person) => person.id === previous?.id
) ?? people[0]
);
});
} catch (err) {
console.error("Family Tree loading error:", err);

setError(
err instanceof Error
? err.message
: "Unable to load your family tree."
);
} finally {
setLoading(false);
}
}, [router]);

useEffect(() => {
void loadFamilyTree();
}, [loadFamilyTree]);

const filteredRelatives = useMemo(() => {
return relatives.filter((person) =>
person.full_name
.toLowerCase()
.includes(search.toLowerCase())
);
}, [relatives, search]);

const selectedConnections = useMemo(() => {
if (!selectedPerson) return [];

return relationships
.filter(
(item) =>
item.person_id === selectedPerson.id ||
item.related_person_id === selectedPerson.id
)
.map((item) => {
const isFirstPerson =
item.person_id === selectedPerson.id;

const otherId = isFirstPerson
? item.related_person_id
: item.person_id;

const otherPerson = relatives.find(
(person) => person.id === otherId
);

return {
...item,
otherPerson,
displayType: isFirstPerson
? item.relationship_type
: reverseRelationship(
item.relationship_type
),
};
})
.filter((item) => item.otherPerson);
}, [selectedPerson, relationships, relatives]);

async function handleAddRelationship(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();

setError("");
setSuccess("");

if (!familyId) {
setError("No active family was selected.");
return;
}

if (!personId || !relatedPersonId) {
setError("Please select both family members.");
return;
}

if (personId === relatedPersonId) {
setError(
"A person cannot be connected to themselves."
);
return;
}

const firstPerson = relatives.find(
(person) => person.id === Number(personId)
);

const secondPerson = relatives.find(
(person) => person.id === Number(relatedPersonId)
);

if (
!firstPerson ||
!secondPerson ||
firstPerson.family_id !== familyId ||
secondPerson.family_id !== familyId
) {
setError(
"Both people must belong to this family."
);
return;
}

setSaving(true);

try {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
throw new Error("Please sign in again.");
}

const { error: insertError } = await supabase
.from("family_relationships")
.insert({
family_id: familyId,
person_id: Number(personId),
related_person_id: Number(relatedPersonId),
relationship_type:
relationshipType.toLowerCase(),
notes: relationshipNotes.trim() || null,
created_by: user.id,
});

if (insertError) throw insertError;

setSuccess(
"Family relationship added successfully."
);

setPersonId("");
setRelatedPersonId("");
setRelationshipType("Parent");
setRelationshipNotes("");
setShowForm(false);

await loadFamilyTree();
} catch (err) {
console.error("Add relationship error:", err);

setError(
err instanceof Error
? err.message
: "Unable to add this relationship."
);
} finally {
setSaving(false);
}
}

if (loading) {
return (
<main className="flex min-h-[70vh] items-center justify-center">
<div className="text-center">
<GitBranch
size={45}
className="mx-auto mb-4 text-emerald-700"
/>

<p className="text-sm text-slate-500">
Growing your family tree...
</p>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-[#f7f8f5] px-4 py-6 text-slate-900 sm:px-8">
<div className="mx-auto max-w-7xl">

<header className="mb-8 flex flex-wrap items-center justify-between gap-4">
<div>
<Link
href={
familyId
? `/dashboard/family-home?id=${familyId}`
: "/dashboard"
}
className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-800"
>
<ArrowLeft size={16} />
Back to Family Hub
</Link>

<div className="flex items-center gap-3">
<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
<GitBranch size={25} />
</div>

<div>
<p className="text-xs font-bold tracking-[0.2em] text-emerald-800">
LEGACY FAMILY
</p>

<h1 className="text-2xl font-bold sm:text-3xl">
Family Tree
</h1>
</div>
</div>

<p className="mt-3 text-sm text-slate-500">
{familyName
? `${familyName} · `
: ""}
Discover the people and connections that
make your family unique.
</p>
</div>

<button
type="button"
onClick={() => {
setShowForm((previous) => !previous);
setError("");
setSuccess("");
}}
disabled={!relatives.length}
className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
>
<Plus size={18} />
Add Relationship
</button>
</header>

{error && (
<div
role="alert"
className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
>
{error}
</div>
)}

{success && (
<div
role="status"
className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
>
{success}
</div>
)}

<section className="mb-7 grid gap-4 sm:grid-cols-3">
<SummaryCard
label="Family relatives"
value={relatives.length}
icon={<Users size={21} />}
/>

<SummaryCard
label="Recorded connections"
value={relationships.length}
icon={<Network size={21} />}
/>

<SummaryCard
label="Selected member"
value={
selectedPerson
? selectedPerson.full_name
: "None"
}
icon={<UserRound size={21} />}
/>
</section>

{showForm && (
<section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<div className="mb-5 flex items-center justify-between">
<div>
<h2 className="text-xl font-bold">
Connect Family Members
</h2>

<p className="mt-1 text-sm text-slate-500">
Connect two existing relatives in your
family tree.
</p>
</div>

<button
type="button"
onClick={() => setShowForm(false)}
aria-label="Close form"
className="rounded-lg p-2 hover:bg-slate-100"
>
<X size={20} />
</button>
</div>

<form
onSubmit={handleAddRelationship}
className="grid gap-5 sm:grid-cols-2"
>
<div>
<label
htmlFor="first-person"
className="mb-2 block text-sm font-semibold"
>
First family member
</label>

<select
id="first-person"
value={personId}
onChange={(event) =>
setPersonId(event.target.value)
}
required
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
>
<option value="">
Select a person
</option>

{relatives.map((person) => (
<option
key={person.id}
value={person.id}
>
{person.full_name}
</option>
))}
</select>
</div>

<div>
<label
htmlFor="relationship-type"
className="mb-2 block text-sm font-semibold"
>
Relationship of first person to second
</label>

<select
id="relationship-type"
value={relationshipType}
onChange={(event) =>
setRelationshipType(
event.target.value
)
}
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
>
{relationshipOptions.map((option) => (
<option
key={option}
value={option}
>
{option}
</option>
))}
</select>
</div>

<div>
<label
htmlFor="second-person"
className="mb-2 block text-sm font-semibold"
>
Second family member
</label>

<select
id="second-person"
value={relatedPersonId}
onChange={(event) =>
setRelatedPersonId(
event.target.value
)
}
required
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
>
<option value="">
Select a person
</option>

{relatives
.filter(
(person) =>
String(person.id) !== personId
)
.map((person) => (
<option
key={person.id}
value={person.id}
>
{person.full_name}
</option>
))}
</select>
</div>

<div>
<label
htmlFor="relationship-notes"
className="mb-2 block text-sm font-semibold"
>
Additional notes (optional)
</label>

<input
id="relationship-notes"
value={relationshipNotes}
onChange={(event) =>
setRelationshipNotes(
event.target.value
)
}
placeholder="Add details about this connection"
className="w-full rounded-xl border border-slate-300 px-4 py-3"
/>
</div>

<div className="flex flex-wrap gap-3 sm:col-span-2">
<button
type="submit"
disabled={saving}
className="rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
>
{saving
? "Saving..."
: "Save Relationship"}
</button>

<button
type="button"
onClick={() => setShowForm(false)}
className="rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50"
>
Cancel
</button>
</div>
</form>
</section>
)}

{!relatives.length ? (
<section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
<GitBranch size={32} />
</div>

<h2 className="text-2xl font-bold">
Your family tree starts here
</h2>

<p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
Add your parents, grandparents, siblings,
children and other relatives to your family
directory before connecting them here.
</p>

<Link
href={
familyId
? `/dashboard/family-members?family_id=${familyId}`
: "/dashboard/family-members"
}
className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900"
>
<Plus size={18} />
Add Family Members
</Link>
</section>
) : (
<>
<section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
<div className="flex flex-wrap items-center justify-between gap-4">
<div>
<h2 className="font-bold">
Explore your family
</h2>

<p className="mt-1 text-xs text-slate-500">
Search for someone in your family tree.
</p>
</div>

<button
type="button"
onClick={() => void loadFamilyTree()}
className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
title="Refresh family tree"
>
<RefreshCw size={17} />
</button>
</div>

<div className="relative mt-4">
<Search
size={18}
className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
/>

<input
value={search}
onChange={(event) =>
setSearch(event.target.value)
}
placeholder="Search family members..."
className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-emerald-700"
/>
</div>
</section>

<div className="grid gap-6 lg:grid-cols-[1fr_340px]">
<section className="min-w-0">
<FamilyTreeView
relatives={filteredRelatives}
relationships={relationships}
selectedPersonId={
selectedPerson?.id ?? null
}
onSelectPerson={(person) => {
setSelectedPerson(person);
setShowConnections(true);
}}
/>
</section>

<aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
{selectedPerson ? (
<>
<div className="mb-5 flex items-center justify-between">
<h2 className="text-lg font-bold">
Member Profile
</h2>

<Heart
size={19}
className="text-rose-400"
/>
</div>

<div className="mb-5 text-center">
<div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
<UserRound size={38} />
</div>

<h3 className="break-words text-xl font-bold">
{selectedPerson.full_name}
</h3>

<p className="mt-1 text-sm text-emerald-800">
{selectedPerson.relationship ||
"Family member"}
</p>
</div>

{selectedPerson.email && (
<div className="mb-3 break-all text-sm text-slate-600">
✉️ {selectedPerson.email}
</div>
)}

{selectedPerson.phone && (
<div className="mb-3 break-words text-sm text-slate-600">
☎️ {selectedPerson.phone}
</div>
)}

{selectedPerson.notes && (
<div className="mb-5 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
{selectedPerson.notes}
</div>
)}

<div className="border-t border-slate-100 pt-5">
<button
type="button"
onClick={() =>
setShowConnections(
(previous) => !previous
)
}
className="flex w-full items-center justify-between font-semibold"
>
Family Connections

{showConnections ? (
<ChevronUp size={18} />
) : (
<ChevronDown size={18} />
)}
</button>

{showConnections && (
<div className="mt-4 space-y-3">
{selectedConnections.length === 0 ? (
<p className="text-sm leading-6 text-slate-500">
No connections have been
recorded for this person yet.
</p>
) : (
selectedConnections.map(
(connection) => (
<button
key={connection.id}
type="button"
onClick={() => {
if (
connection.otherPerson
) {
setSelectedPerson(
connection.otherPerson
);
}
}}
className="w-full rounded-xl border border-slate-100 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
>
<p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
{connection.displayType}
</p>

<p className="mt-1 font-semibold">
{connection.otherPerson?.full_name}
</p>
</button>
)
)
)}
</div>
)}
</div>
</>
) : (
<p className="text-sm text-slate-500">
Select a family member to view their
profile.
</p>
)}
</aside>
</div>
</>
)}

<footer className="mt-10 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
Legacy Family · A product by ConnetFam
</footer>
</div>
</main>
);
}

function SummaryCard({
label,
value,
icon,
}: {
label: string;
value: string | number;
icon: ReactNode;
}) {
return (
<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
<div className="flex items-center justify-between">
<p className="text-sm text-slate-500">
{label}
</p>

<div className="rounded-xl bg-emerald-50 p-2 text-emerald-800">
{icon}
</div>
</div>

<p className="mt-3 break-words text-2xl font-bold">
{value}
</p>
</div>
);
}

function reverseRelationship(type: string) {
const relationships: Record<string, string> = {
parent: "Child",
father: "Son or daughter",
mother: "Son or daughter",
child: "Parent",
son: "Parent",
daughter: "Parent",
sibling: "Sibling",
brother: "Sibling",
sister: "Sibling",
spouse: "Spouse",
partner: "Partner",
grandparent: "Grandchild",
grandfather: "Grandchild",
grandmother: "Grandchild",
grandchild: "Grandparent",
"step-parent": "Step-child",
"step-child": "Step-parent",
"adoptive parent": "Adopted child",
"adopted child": "Adoptive parent",
};

return (
relationships[type.toLowerCase()] ||
"Related family member"
);
}
