"use client";

import { useState } from "react";
import Link from "next/link";

type Story = {
id: number;
title: string;
category: string;
content: string;
createdAt: string;
};

export default function StoriesPage() {
const [stories, setStories] = useState<Story[]>([]);
const [title, setTitle] = useState("");
const [category, setCategory] = useState("Family History");
const [content, setContent] = useState("");
const [showForm, setShowForm] = useState(false);
const [message, setMessage] = useState("");

function handleSaveStory(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setMessage("");

if (!title.trim() || !content.trim()) {
setMessage("Please enter a story title and story content.");
return;
}

const newStory: Story = {
id: Date.now(),
title: title.trim(),
category,
content: content.trim(),
createdAt: new Date().toLocaleDateString(),
};

setStories((previousStories) => [newStory, ...previousStories]);
setTitle("");
setContent("");
setCategory("Family History");
setShowForm(false);
setMessage("Your story has been added to this page.");
}

return (
<main className="min-h-screen bg-[#f7f5ef] px-5 py-8 text-[#1f2937] sm:px-8">
<div className="mx-auto max-w-5xl">
<Link
href="/dashboard"
className="text-sm font-medium text-gray-600 hover:text-emerald-800"
>
← Back to dashboard
</Link>

<header className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-800">
LEGACY · CONNETFAM
</p>

<h1 className="mt-3 text-3xl font-bold sm:text-4xl">
Family Stories 📖
</h1>

<p className="mt-3 max-w-2xl text-gray-600">
Preserve the stories, lessons, experiences, and traditions
that make your family unique.
</p>
</div>

<button
type="button"
onClick={() => {
setShowForm(!showForm);
setMessage("");
}}
className="rounded-full bg-[#17352b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#21483b]"
>
{showForm ? "Cancel" : "+ Add a story"}
</button>
</header>

{message && (
<div
role="status"
className="mt-6 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-800"
>
{message}
</div>
)}

{showForm && (
<section className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
<h2 className="text-xl font-bold">Capture a family story</h2>

<p className="mt-2 text-sm text-gray-500">
Record a memory that future generations can read.
</p>

<form onSubmit={handleSaveStory} className="mt-6 space-y-5">
<div>
<label
htmlFor="storyTitle"
className="mb-2 block text-sm font-semibold"
>
Story title
</label>

<input
id="storyTitle"
type="text"
value={title}
onChange={(event) => setTitle(event.target.value)}
placeholder="e.g. How our family began"
maxLength={150}
required
className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-700"
/>
</div>

<div>
<label
htmlFor="storyCategory"
className="mb-2 block text-sm font-semibold"
>
Category
</label>

<select
id="storyCategory"
value={category}
onChange={(event) => setCategory(event.target.value)}
className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-700"
>
<option>Family History</option>
<option>Childhood Memories</option>
<option>Family Traditions</option>
<option>Life Lessons</option>
<option>Achievements</option>
<option>Other</option>
</select>
</div>

<div>
<label
htmlFor="storyContent"
className="mb-2 block text-sm font-semibold"
>
Your story
</label>

<textarea
id="storyContent"
value={content}
onChange={(event) => setContent(event.target.value)}
placeholder="Write your family story here..."
rows={7}
maxLength={20000}
required
className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-700"
/>
</div>

<button
type="submit"
className="w-full rounded-full bg-[#17352b] px-6 py-3 font-semibold text-white hover:bg-[#21483b]"
>
Save story
</button>
</form>
</section>
)}

<section className="mt-10">
<div className="mb-5 flex items-center justify-between">
<h2 className="text-xl font-bold">Your family stories</h2>

<span className="rounded-full bg-white px-4 py-2 text-sm text-gray-600">
{stories.length} {stories.length === 1 ? "story" : "stories"}
</span>
</div>

{stories.length === 0 ? (
<div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 px-6 py-16 text-center">
<div className="text-5xl">📚</div>

<h3 className="mt-5 text-lg font-bold">
Your family story collection starts here
</h3>

<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
Every family has stories worth preserving. Add your first
story and begin creating a legacy for future generations.
</p>

<button
type="button"
onClick={() => setShowForm(true)}
className="mt-6 rounded-full bg-[#17352b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#21483b]"
>
Write your first story
</button>
</div>
) : (
<div className="grid gap-5 md:grid-cols-2">
{stories.map((story) => (
<article
key={story.id}
className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
>
<span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
{story.category}
</span>

<h3 className="mt-4 text-xl font-bold">{story.title}</h3>

<p className="mt-2 text-xs text-gray-500">
Added {story.createdAt}
</p>

<p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
{story.content}
</p>
</article>
))}
</div>
)}
</section>

<p className="mt-10 text-center text-xs leading-5 text-gray-500">
Your family&apos;s history deserves to be preserved for generations.
</p>
</div>
</main>
);
}