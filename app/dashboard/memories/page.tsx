"use client";

import { useState } from "react";
import Link from "next/link";

type Memory = {
id: string;
title: string;
description: string;
date: string;
people: string;
};

export default function MemoriesPage() {
const [memories, setMemories] = useState<Memory[]>([]);
const [showForm, setShowForm] = useState(false);
const [search, setSearch] = useState("");
const [message, setMessage] = useState("");

const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
const [date, setDate] = useState("");
const [people, setPeople] = useState("");

function handleAddMemory(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (!title.trim() || !description.trim()) {
setMessage("Please enter a title and story.");
return;
}

const newMemory: Memory = {
id: crypto.randomUUID(),
title: title.trim(),
description: description.trim(),
date,
people: people.trim(),
};

setMemories((previous) => [newMemory, ...previous]);

setTitle("");
setDescription("");
setDate("");
setPeople("");
setShowForm(false);
setMessage("Memory added successfully!");
}

function handleDeleteMemory(id: string) {
const confirmed = window.confirm(
"Are you sure you want to delete this memory?"
);

if (!confirmed) return;

setMemories((previous) =>
previous.filter((memory) => memory.id !== id)
);

setMessage("Memory deleted successfully.");
}

const filteredMemories = memories.filter((memory) => {
const searchableText = [
memory.title,
memory.description,
memory.people,
]
.join(" ")
.toLowerCase();

return searchableText.includes(search.toLowerCase());
});

return (
<main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 sm:px-8">
<div className="mx-auto max-w-6xl">

{/* Navigation */}
<Link
href="/dashboard"
className="mb-6 inline-block text-sm font-medium text-emerald-700 hover:underline"
>
← Back to Dashboard
</Link>

{/* Header */}
<header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
<div>
<p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-700">
CONNETFAM
</p>

<h1 className="text-3xl font-bold sm:text-4xl">
Family Memories 🌳
</h1>

<p className="mt-3 max-w-xl text-gray-600">
Preserve the moments, stories, and experiences
that make your family special.
</p>
</div>

<button
type="button"
onClick={() => {
setShowForm((previous) => !previous);
setMessage("");
}}
className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
{showForm ? "Cancel" : "+ Add Memory"}
</button>
</header>

{/* Notification */}
{message && (
<div
role="status"
className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
>
{message}
</div>
)}

{/* Add Memory Form */}
{showForm && (
<section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
<h2 className="mb-6 text-xl font-bold">
Create a New Memory
</h2>

<form onSubmit={handleAddMemory} className="space-y-5">

<div>
<label
htmlFor="title"
className="mb-2 block text-sm font-semibold"
>
Memory Title *
</label>

<input
id="title"
type="text"
value={title}
onChange={(event) =>
setTitle(event.target.value)
}
placeholder="Grandma's 80th Birthday"
required
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="description"
className="mb-2 block text-sm font-semibold"
>
Your Story *
</label>

<textarea
id="description"
value={description}
onChange={(event) =>
setDescription(event.target.value)
}
placeholder="Tell your family's story..."
rows={6}
required
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="date"
className="mb-2 block text-sm font-semibold"
>
Date of Memory
</label>

<input
id="date"
type="date"
value={date}
onChange={(event) =>
setDate(event.target.value)
}
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="people"
className="mb-2 block text-sm font-semibold"
>
Family Members Involved
</label>

<input
id="people"
type="text"
value={people}
onChange={(event) =>
setPeople(event.target.value)
}
placeholder="Names of people in this memory"
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<button
type="submit"
className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 sm:w-auto"
>
Save Memory
</button>
</form>
</section>
)}

{/* Memory Search */}
<section className="mb-6">
<label
htmlFor="search"
className="mb-2 block text-sm font-semibold"
>
Search Family Memories
</label>

<input
id="search"
type="search"
value={search}
onChange={(event) =>
setSearch(event.target.value)
}
placeholder="Search by title, story, or family member..."
className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-600"
/>
</section>

{/* Memory Count */}
<section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
<p className="text-sm text-gray-500">
Memories created in this session
</p>

<p className="mt-2 text-3xl font-bold">
{memories.length}
</p>
</section>

{/* Memories List */}
<section>
<div className="mb-5 flex items-center justify-between gap-3">
<h2 className="text-xl font-bold">
Your Family Stories
</h2>

<span className="text-sm text-gray-500">
{filteredMemories.length} found
</span>
</div>

{filteredMemories.length === 0 ? (
<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center">
<div className="mb-4 text-5xl">📖</div>

<h3 className="text-lg font-bold">
{search
? "No memories found"
: "Your family's story starts here"}
</h3>

<p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
{search
? "Try searching with another word or family member's name."
: "Create your first memory and begin preserving your family's history for future generations."}
</p>

{!search && (
<button
type="button"
onClick={() => setShowForm(true)}
className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
Create First Memory
</button>
)}
</div>
) : (
<div className="grid gap-5 md:grid-cols-2">

{filteredMemories.map((memory) => (
<article
key={memory.id}
className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
>
<div className="mb-4 flex items-start justify-between gap-4">
<span className="text-3xl">📖</span>

<button
type="button"
onClick={() =>
handleDeleteMemory(memory.id)
}
className="text-sm font-medium text-red-600 hover:text-red-800"
>
Delete
</button>
</div>

<h3 className="break-words text-xl font-bold">
{memory.title}
</h3>

{memory.date && (
<p className="mt-3 text-sm text-gray-500">
📅{" "}
{new Date(
`${memory.date}T12:00:00`
).toLocaleDateString()}
</p>
)}

{memory.people && (
<p className="mt-2 break-words text-sm text-gray-600">
👨‍👩‍👧 {memory.people}
</p>
)}

<p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
{memory.description}
</p>
</article>
))}

</div>
)}
</section>

{/* Footer */}
<footer className="mt-12 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
Preserving your family's legacy, one memory at a time. 🌳
</footer>

</div>
</main>
);
}