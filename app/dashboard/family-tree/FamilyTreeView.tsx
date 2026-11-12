"use client";

import { useMemo } from "react";
import { GitBranch, UserRound } from "lucide-react";

export type TreeRelative = {
id: number;
family_id: number;
full_name: string;
relationship: string;
email: string | null;
phone: string | null;
notes: string | null;
};

export type TreeRelationship = {
id: number;
family_id: number;
person_id: number;
related_person_id: number;
relationship_type: string;
notes: string | null;
};

type Props = {
relatives: TreeRelative[];
relationships: TreeRelationship[];
selectedPersonId: number | null;
onSelectPerson: (person: TreeRelative) => void;
};

type Generation = {
level: number;
people: TreeRelative[];
};

const parentTypes = [
"parent",
"father",
"mother",
"step-parent",
"adoptive parent",
];

const childTypes = [
"child",
"son",
"daughter",
"step-child",
"adopted child",
];

function getParentChildDirection(
relationship: TreeRelationship
) {
const type = relationship.relationship_type.toLowerCase();

if (parentTypes.includes(type)) {
return {
parentId: relationship.person_id,
childId: relationship.related_person_id,
};
}

if (childTypes.includes(type)) {
return {
parentId: relationship.related_person_id,
childId: relationship.person_id,
};
}

return null;
}

function buildGenerations(
relatives: TreeRelative[],
relationships: TreeRelationship[]
): Generation[] {
if (!relatives.length) return [];

const validIds = new Set(relatives.map((person) => person.id));

const parentChildLinks = relationships
.map(getParentChildDirection)
.filter(
(
link
): link is { parentId: number; childId: number } =>
Boolean(
link &&
validIds.has(link.parentId) &&
validIds.has(link.childId) &&
link.parentId !== link.childId
)
);

const levels = new Map<number, number>();

// People without a recorded parent are starting points.
const childrenIds = new Set(
parentChildLinks.map((link) => link.childId)
);

const roots = relatives.filter(
(person) => !childrenIds.has(person.id)
);

roots.forEach((person) => levels.set(person.id, 0));

// Propagate generations through recorded parent-child links.
for (let pass = 0; pass < relatives.length; pass++) {
let changed = false;

for (const link of parentChildLinks) {
const parentLevel = levels.get(link.parentId);

if (parentLevel === undefined) continue;

const expectedLevel = parentLevel + 1;
const existingLevel = levels.get(link.childId);

if (
existingLevel === undefined ||
expectedLevel < existingLevel
) {
levels.set(link.childId, expectedLevel);
changed = true;
}
}

if (!changed) break;
}

// Include disconnected relatives without inventing relationships.
relatives.forEach((person) => {
if (!levels.has(person.id)) {
levels.set(person.id, 0);
}
});

const grouped = new Map<number, TreeRelative[]>();

relatives.forEach((person) => {
const level = levels.get(person.id) ?? 0;

if (!grouped.has(level)) {
grouped.set(level, []);
}

grouped.get(level)!.push(person);
});

return Array.from(grouped.entries())
.sort((a, b) => a[0] - b[0])
.map(([level, people]) => ({
level,
people: [...people].sort((a, b) =>
a.full_name.localeCompare(b.full_name)
),
}));
}

export default function FamilyTreeView({
relatives,
relationships,
selectedPersonId,
onSelectPerson,
}: Props) {
const generations = useMemo(
() => buildGenerations(relatives, relationships),
[relatives, relationships]
);

if (!relatives.length) {
return (
<div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
<GitBranch
size={40}
className="mx-auto mb-4 text-emerald-700"
/>

<h3 className="text-xl font-bold text-slate-900">
Your family tree is waiting
</h3>

<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
Add family members and record their relationships
to begin building your family history.
</p>
</div>
);
}

return (
<section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
<div className="border-b border-slate-100 p-5 sm:p-7">
<div className="flex flex-wrap items-center justify-between gap-3">
<div>
<div className="flex items-center gap-2">
<GitBranch className="text-emerald-700" size={22} />

<h2 className="text-xl font-bold text-slate-900">
Family Tree
</h2>
</div>

<p className="mt-2 text-sm text-slate-500">
Explore your family's generations and connections.
</p>
</div>

<div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
{relatives.length} family members
</div>
</div>
</div>

<div className="overflow-x-auto p-5 sm:p-8">
<div className="min-w-[600px]">
{generations.map((generation, index) => (
<div key={generation.level}>
<div className="mb-5 flex items-center justify-center">
<span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
Generation {index + 1}
</span>
</div>

<div className="flex flex-wrap items-start justify-center gap-5">
{generation.people.map((person) => {
const selected =
selectedPersonId === person.id;

const connectionCount =
relationships.filter(
(relationship) =>
relationship.person_id === person.id ||
relationship.related_person_id === person.id
).length;

return (
<button
key={person.id}
type="button"
onClick={() => onSelectPerson(person)}
className={`
group w-48 rounded-2xl border p-4 text-left
transition duration-200
hover:-translate-y-1 hover:shadow-md
${
selected
? "border-emerald-600 bg-emerald-50 shadow-md"
: "border-slate-200 bg-white hover:border-emerald-400"
}
`}
>
<div className="flex items-center gap-3">
<div
className={`
flex h-11 w-11 shrink-0 items-center justify-center rounded-full
${
selected
? "bg-emerald-700 text-white"
: "bg-emerald-100 text-emerald-800"
}
`}
>
<UserRound size={22} />
</div>

<div className="min-w-0">
<p className="break-words text-sm font-bold text-slate-900">
{person.full_name}
</p>

<p className="mt-1 text-xs text-slate-500">
{person.relationship || "Family member"}
</p>
</div>
</div>

<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
<span className="text-xs text-slate-500">
{connectionCount} connections
</span>

{selected && (
<span className="text-xs font-bold text-emerald-800">
Selected
</span>
)}
</div>
</button>
);
})}
</div>

{index < generations.length - 1 && (
<div className="flex h-16 items-center justify-center">
<div className="h-12 w-px bg-emerald-300" />
</div>
)}
</div>
))}
</div>
</div>

<div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
<p className="text-xs leading-5 text-slate-500">
Generations are organised using recorded parent-child
relationships. Relatives without recorded connections
appear in the starting generation until their
relationships are added.
</p>
</div>
</section>
);
}
