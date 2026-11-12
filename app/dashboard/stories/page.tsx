"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type Story = {
id: number;
profile_id: number;
family_id: number | null;
title: string;
content: string;
story_type: string;
privacy_level: string;
created_at: string;
created_by: string;
updated_at: string;
status: string;
tags: string | null;
is_featured: boolean;
};

const categories = [
"Family History",
"Childhood Memories",
"Family Traditions",
"Life Lessons",
"Achievements",
"Other",
];

export default function StoriesPage() {
const router = useRouter();

const [familyId, setFamilyId] = useState<number | null>(null);
const [profileId, setProfileId] = useState<number | null>(null);
const [stories, setStories] = useState<Story[]>([]);

const [title, setTitle] = useState("");
const [category, setCategory] = useState("Family History");
const [content, setContent] = useState("");

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [showForm, setShowForm] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const loadStories = useCallback(async (selectedFamilyId: number) => {
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

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError) throw profileError;

if (!profile) {
throw new Error(
"Your user profile could not be found. Please contact support."
);
}

setProfileId(Number(profile.id));

const { data, error: storiesError } = await supabase
.from("stories")
.select(
"id, profile_id, family_id, title, content, story_type, privacy_level, created_at, created_by, updated_at, status, tags, is_featured"
)
.eq("family_id", selectedFamilyId)
.eq("is_archived", false)
.is("deleted_at", null)
.order("created_at", { ascending: false });

if (storiesError) throw storiesError;

setStories((data ?? []) as Story[]);
} catch (err) {
console.error("Stories loading error:", err);

setError(
err instanceof Error
? err.message
: "Unable to load your family stories."
);
} finally {
setLoading(false);
}
}, [router]);

useEffect(() => {
const params = new URLSearchParams(window.location.search);
const idFromUrl = params.get("family_id");

if (!idFromUrl) {
setError(
"No family workspace was selected. Return to Family Home and open Stories from there."
);
setLoading(false);
return;
}

const parsedId = Number(idFromUrl);

if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
setError("The family workspace link is invalid.");
setLoading(false);
return;
}

setFamilyId(parsedId);
void loadStories(parsedId);
}, [loadStories]);

async function handleSaveStory(event: FormEvent<HTMLFormElement>) {
event.preventDefault();

setMessage("");
setError("");

if (!familyId || !profileId) {
setError("Your family workspace or profile is not ready. Please reload.");
return;
}

if (!title.trim() || !content.trim()) {
setError("Please enter both a story title and story content.");
return;
}

setSaving(true);

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

const storyToSave = {
profile_id: profileId,
family_id: familyId,
title: title.trim(),
content: content.trim(),
story_type: category,
privacy_level: "family",
updated_at: new Date().toISOString(),
created_by: user.id,
view_count: 0,
like_count: 0,
comment_count: 0,
share_count: 0,
};

const { data, error: insertError } = await supabase
.from("stories")
.insert(storyToSave)
.select(
"id, profile_id, family_id, title, content, story_type, privacy_level, created_at, created_by, updated_at, status, tags, is_featured"
)
.single();

if (insertError) throw insertError;

setStories((previous) => [data as Story, ...previous]);

setTitle("");
setContent("");
setCategory("Family History");
setShowForm(false);

setMessage("Your family story has been saved successfully.");
} catch (err) {
console.error("Story saving error:", err);

setError(
err instanceof Error
? err.message
: "Your story could not be saved. Please try again."
);
} finally {
setSaving(false);
}
}

async function handleDeleteStory(storyId: number) {
const confirmed = window.confirm(
"Are you sure you want to delete this family story?"
);

if (!confirmed) return;

setMessage("");
setError("");

try {
const { error: deleteError } = await supabase
.from("stories")
.delete()
.eq("id", storyId)
.eq("family_id", familyId);

if (deleteError) throw deleteError;

setStories((previous) =>
previous.filter((story) => story.id !== storyId)
);

setMessage("The story has been deleted.");
} catch (err) {
console.error("Story deletion error:", err);

setError(
err instanceof Error
? err.message
: "The story could not be deleted."
);
}
}

return (
<main className="min-h-screen bg-[#f7f5ef] px-5 py-8 text-[#1f2937] sm:px-8">
<div className="mx-auto max-w-5xl">

<Link
href={
familyId
? `/dashboard/family-home?id=${familyId}`
: "/dashboard"
}
className="text-sm font-medium text-gray-600 hover:text-emerald-800"
>
← Back to Family Home
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
disabled={!familyId || loading}
onClick={() => {
setShowForm((previous) => !previous);
setMessage("");
setError("");
}}
className="rounded-full bg-[#17352b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-50"
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

{error && (
<div
role="alert"
className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
>
{error}
</div>
)}

{showForm && (
<section className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
<h2 className="text-xl font-bold">
Capture a family story
</h2>

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
{categories.map((item) => (
<option key={item} value={item}>
{item}
</option>
))}
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
rows={8}
maxLength={20000}
required
className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-700"
/>
</div>

<button
type="submit"
disabled={saving || loading || !profileId}
className="w-full rounded-full bg-[#17352b] px-6 py-3 font-semibold text-white transition hover:bg-[#21483b] disabled:cursor-not-allowed disabled:opacity-50"
>
{saving ? "Saving your story..." : "Save story"}
</button>

</form>
</section>
)}

<section className="mt-10">

<div className="mb-5 flex items-center justify-between gap-3">
<h2 className="text-xl font-bold">
Your family stories
</h2>

<span className="rounded-full bg-white px-4 py-2 text-sm text-gray-600">
{stories.length}{" "}
{stories.length === 1 ? "story" : "stories"}
</span>
</div>

{loading ? (
<div className="rounded-3xl bg-white px-6 py-16 text-center">
<p className="text-gray-600">
Loading your family stories...
</p>
</div>
) : stories.length === 0 ? (
<div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 px-6 py-16 text-center">
<div className="text-5xl">📚</div>

<h3 className="mt-5 text-lg font-bold">
Your family story collection starts here
</h3>

<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
Every family has stories worth preserving. Add your
first story and begin creating a legacy for future
generations.
</p>

<button
type="button"
onClick={() => {
setShowForm(true);
setMessage("");
setError("");
}}
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
<div className="flex items-start justify-between gap-3">
<span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
{story.story_type}
</span>

<button
type="button"
onClick={() => void handleDeleteStory(story.id)}
className="text-xs font-semibold text-red-600 hover:text-red-800"
>
Delete
</button>
</div>

<h3 className="mt-4 break-words text-xl font-bold">
{story.title}
</h3>

<p className="mt-2 text-xs text-gray-500">
Added{" "}
{new Date(story.created_at).toLocaleDateString()}
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
