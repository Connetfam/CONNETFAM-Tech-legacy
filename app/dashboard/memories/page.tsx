"use client";

import {
Suspense,
useEffect,
useRef,
useState,
type ChangeEvent,
type FormEvent,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

const BUCKET = "memory-photos";
const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type MemoryPhoto = {
id: number;
storage_path: string;
file_name: string | null;
signedUrl?: string;
};

type Memory = {
id: number;
title: string;
description: string | null;
event_date: string | null;
tags: string | null;
created_at: string;
photos: MemoryPhoto[];
};

function MemoriesPageContent() {
const searchParams = useSearchParams();

const familyId = searchParams.get("family_id");

const fileInputRef = useRef<HTMLInputElement>(null);

const [memories, setMemories] = useState<Memory[]>([]);
const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
const [previews, setPreviews] = useState<string[]>([]);

const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
const [date, setDate] = useState("");
const [people, setPeople] = useState("");

const [search, setSearch] = useState("");
const [showForm, setShowForm] = useState(false);

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

const [message, setMessage] = useState("");
const [errorMessage, setErrorMessage] = useState("");

const [profileId, setProfileId] = useState<number | null>(null);
const [userId, setUserId] = useState<string | null>(null);

// --------------------------------------------------
// PHOTO PREVIEWS
// --------------------------------------------------

useEffect(() => {
const urls = selectedPhotos.map((file) =>
URL.createObjectURL(file)
);

setPreviews(urls);

return () => {
urls.forEach((url) => URL.revokeObjectURL(url));
};
}, [selectedPhotos]);

// --------------------------------------------------
// INITIALIZE PAGE
// --------------------------------------------------

useEffect(() => {
if (!familyId) {
setLoading(false);

setErrorMessage(
"No family was selected. Please open Memories from your Family Dashboard."
);

return;
}

const parsedFamilyId = Number(familyId);

if (
!Number.isSafeInteger(parsedFamilyId) ||
parsedFamilyId <= 0
) {
setLoading(false);

setErrorMessage("Invalid family ID.");

return;
}

void initializePage(parsedFamilyId);

// eslint-disable-next-line react-hooks/exhaustive-deps
}, [familyId]);

async function initializePage(selectedFamilyId: number) {
setLoading(true);
setErrorMessage("");

try {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError) throw authError;

if (!user) {
throw new Error(
"Please sign in to access family memories."
);
}

setUserId(user.id);

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

setProfileId(profile.id);

const { data: membership, error: membershipError } =
await supabase
.from("family_members")
.select("id")
.eq("family_id", selectedFamilyId)
.eq("profile_id", profile.id)
.eq("status", "active")
.eq("is_active", true)
.maybeSingle();

if (membershipError) throw membershipError;

if (!membership) {
throw new Error(
"You are not an active member of this family."
);
}

await loadMemories(selectedFamilyId);

} catch (error) {
console.error(
"MEMORIES INITIALIZATION ERROR:",
error
);

setErrorMessage(
error instanceof Error
? error.message
: "Unable to load family memories."
);

} finally {
setLoading(false);
}
}

// --------------------------------------------------
// LOAD MEMORIES AND PHOTOS
// --------------------------------------------------

async function loadMemories(selectedFamilyId: number) {
const { data, error } = await supabase
.from("memories")
.select(
"id, title, description, event_date, tags, created_at"
)
.eq("family_id", selectedFamilyId)
.is("deleted_at", null)
.eq("is_archived", false)
.order("created_at", { ascending: false });

if (error) throw error;

const loadedMemories: Memory[] = [];

for (const memory of data || []) {
const { data: mediaRows, error: mediaError } =
await supabase
.from("media")
.select("id, storage_path, file_name")
.eq("memory_id", memory.id)
.is("deleted_at", null)
.eq("status", "active");

if (mediaError) throw mediaError;

const photos: MemoryPhoto[] = [];

for (const photo of mediaRows || []) {
const { data: signedData, error: signedError } =
await supabase.storage
.from(BUCKET)
.createSignedUrl(photo.storage_path, 3600);

if (signedError) {
console.error(
"PHOTO URL ERROR:",
signedError
);
}

photos.push({
...photo,
signedUrl: signedData?.signedUrl,
});
}

loadedMemories.push({
...memory,
photos,
});
}

setMemories(loadedMemories);
}

// --------------------------------------------------
// RESET FORM
// --------------------------------------------------

function resetForm() {
setTitle("");
setDescription("");
setDate("");
setPeople("");

setSelectedPhotos([]);
setShowForm(false);

if (fileInputRef.current) {
fileInputRef.current.value = "";
}
}

// --------------------------------------------------
// PHOTO SELECTION
// --------------------------------------------------

function handlePhotoSelection(
event: ChangeEvent<HTMLInputElement>
) {
const files = Array.from(
event.target.files || []
);

if (
files.length + selectedPhotos.length >
MAX_PHOTOS
) {
setErrorMessage(
`You can upload a maximum of ${MAX_PHOTOS} photos per memory.`
);

event.target.value = "";
return;
}

for (const file of files) {
if (
![
"image/jpeg",
"image/png",
"image/webp",
].includes(file.type)
) {
setErrorMessage(
"Only JPG, PNG and WebP photos are supported."
);

event.target.value = "";
return;
}

if (file.size > MAX_FILE_SIZE) {
setErrorMessage(
`${file.name} is larger than the 5 MB limit.`
);

event.target.value = "";
return;
}
}

setErrorMessage("");

setSelectedPhotos((previous) => [
...previous,
...files,
]);

event.target.value = "";
}

function removeSelectedPhoto(index: number) {
setSelectedPhotos((previous) =>
previous.filter(
(_, photoIndex) => photoIndex !== index
)
);
}

// --------------------------------------------------
// CREATE MEMORY
// --------------------------------------------------

async function handleAddMemory(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (saving) return;

const selectedFamilyId = Number(familyId);

if (
!familyId ||
!Number.isSafeInteger(selectedFamilyId) ||
selectedFamilyId <= 0 ||
!profileId ||
!userId
) {
setErrorMessage(
"Your family account could not be verified. Refresh the page and try again."
);

return;
}

if (!title.trim() || !description.trim()) {
setErrorMessage(
"Please enter a memory title and your story."
);

return;
}

setSaving(true);
setMessage("");
setErrorMessage("");

let createdMemoryId: number | null = null;

const uploadedPaths: string[] = [];
const insertedMediaIds: number[] = [];

try {
const now = new Date().toISOString();

// CREATE MEMORY

const { data: newMemory, error: memoryError } =
await supabase
.from("memories")
.insert({
family_id: selectedFamilyId,
profile_id: profileId,

title: title.trim(),
description: description.trim(),

memory_type: "family",
privacy_level: "family",
visibility: "family",

event_date: date || null,
tags: people.trim() || null,

status: "active",

created_by: userId,
updated_by: userId,
updated_at: now,

view_count: 0,
like_count: 0,
comment_count: 0,
share_count: 0,

is_featured: false,
is_archived: false,
})
.select("id")
.single();

if (memoryError) throw memoryError;

if (!newMemory) {
throw new Error(
"The memory could not be created."
);
}

createdMemoryId = newMemory.id;

// UPLOAD PHOTOS

for (const photo of selectedPhotos) {
const safeFileName = photo.name.replace(
/[^a-zA-Z0-9._-]/g,
"_"
);

const storagePath =
`${selectedFamilyId}/${userId}/${crypto.randomUUID()}-${safeFileName}`;

const { error: uploadError } =
await supabase.storage
.from(BUCKET)
.upload(storagePath, photo, {
cacheControl: "3600",
upsert: false,
contentType: photo.type,
});

if (uploadError) throw uploadError;

uploadedPaths.push(storagePath);

// REGISTER PHOTO IN MEDIA TABLE

const { data: mediaRecord, error: mediaError } =
await supabase
.from("media")
.insert({
profile_id: profileId,
memory_id: createdMemoryId,

media_type: "image",
file_url: storagePath,

file_name: photo.name,
file_size: photo.size,
mime_type: photo.type,

uploaded_by: userId,
created_by: userId,

privacy_level: "family",
status: "active",

storage_path: storagePath,
updated_at: now,
})
.select("id")
.single();

if (mediaError) throw mediaError;

if (mediaRecord) {
insertedMediaIds.push(mediaRecord.id);
}
}

await loadMemories(selectedFamilyId);

resetForm();

setMessage(
"Your family memory and photos have been saved successfully!"
);

} catch (error) {
console.error(
"SAVE MEMORY ERROR:",
error
);

// CLEAN UP MEDIA RECORDS

if (insertedMediaIds.length > 0) {
const { error: cleanupError } =
await supabase
.from("media")
.delete()
.in("id", insertedMediaIds);

if (cleanupError) {
console.error(
"MEDIA CLEANUP ERROR:",
cleanupError
);
}
}

// CLEAN UP STORAGE FILES

if (uploadedPaths.length > 0) {
const { error: storageCleanupError } =
await supabase.storage
.from(BUCKET)
.remove(uploadedPaths);

if (storageCleanupError) {
console.error(
"STORAGE CLEANUP ERROR:",
storageCleanupError
);
}
}

// REMOVE INCOMPLETE MEMORY

if (createdMemoryId !== null) {
const { error: rollbackError } =
await supabase
.from("memories")
.delete()
.eq("id", createdMemoryId);

if (rollbackError) {
console.error(
"MEMORY ROLLBACK ERROR:",
rollbackError
);
}
}

setErrorMessage(
error instanceof Error
? error.message
: "Something went wrong while saving your memory."
);

} finally {
setSaving(false);
}
}

// --------------------------------------------------
// DELETE MEMORY
// --------------------------------------------------

async function handleDeleteMemory(memory: Memory) {
const confirmed = window.confirm(
`Delete "${memory.title}"? This will remove it from your family memories.`
);

if (!confirmed) return;

setErrorMessage("");
setMessage("");

try {
const now = new Date().toISOString();

// SOFT DELETE MEDIA

const { error: mediaError } = await supabase
.from("media")
.update({
deleted_at: now,
status: "deleted",
updated_at: now,
})
.eq("memory_id", memory.id);

if (mediaError) throw mediaError;

// SOFT DELETE MEMORY

const { error: deleteError } = await supabase
.from("memories")
.update({
deleted_at: now,
updated_at: now,
updated_by: userId,
})
.eq("id", memory.id);

if (deleteError) throw deleteError;

setMemories((previous) =>
previous.filter(
(item) => item.id !== memory.id
)
);

setMessage("Memory deleted successfully.");

} catch (error) {
console.error(
"DELETE MEMORY ERROR:",
error
);

setErrorMessage(
error instanceof Error
? error.message
: "Unable to delete this memory."
);
}
}

// --------------------------------------------------
// SEARCH
// --------------------------------------------------

const filteredMemories = memories.filter(
(memory) => {
const searchableText = [
memory.title,
memory.description || "",
memory.tags || "",
]
.join(" ")
.toLowerCase();

return searchableText.includes(
search.toLowerCase()
);
}
);

// --------------------------------------------------
// PAGE
// --------------------------------------------------

return (
<main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 sm:px-8">

<div className="mx-auto max-w-6xl">

<Link
href="/dashboard"
className="mb-6 inline-block text-sm font-medium text-emerald-700 hover:underline"
>
← Back to Dashboard
</Link>

{/* HEADER */}

<header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

<div>
<p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-700">
CONNETFAM
</p>

<h1 className="text-3xl font-bold sm:text-4xl">
Family Memories 🌳
</h1>

<p className="mt-3 max-w-xl text-gray-600">
Preserve the moments, stories, photographs,
and experiences that make your family special.
</p>
</div>

<button
type="button"
onClick={() => {
setShowForm((previous) => !previous);
setMessage("");
setErrorMessage("");
}}
className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
{showForm ? "Cancel" : "+ Add Memory"}
</button>

</header>

{/* SUCCESS MESSAGE */}

{message && (
<div
role="status"
className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
>
{message}
</div>
)}

{/* ERROR MESSAGE */}

{errorMessage && (
<div
role="alert"
className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
>
{errorMessage}
</div>
)}

{/* CREATE MEMORY FORM */}

{showForm && (
<section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">

<h2 className="mb-6 text-xl font-bold">
Create a New Memory
</h2>

<form
onSubmit={handleAddMemory}
className="space-y-5"
>

<div>
<label
htmlFor="memory-title"
className="mb-2 block text-sm font-semibold"
>
Memory Title *
</label>

<input
id="memory-title"
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
htmlFor="memory-description"
className="mb-2 block text-sm font-semibold"
>
Your Story *
</label>

<textarea
id="memory-description"
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
htmlFor="memory-date"
className="mb-2 block text-sm font-semibold"
>
Date of Memory
</label>

<input
id="memory-date"
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
htmlFor="memory-people"
className="mb-2 block text-sm font-semibold"
>
Family Members Involved
</label>

<input
id="memory-people"
type="text"
value={people}
onChange={(event) =>
setPeople(event.target.value)
}
placeholder="Names of people in this memory"
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

{/* PHOTOS */}

<div>
<label
htmlFor="memory-photos"
className="mb-2 block text-sm font-semibold"
>
Add Photographs
</label>

<p className="mb-3 text-xs text-gray-500">
Select up to {MAX_PHOTOS} photos.
JPG, PNG and WebP are supported.
Maximum 5 MB per photo.
</p>

<input
ref={fileInputRef}
id="memory-photos"
type="file"
accept="image/jpeg,image/png,image/webp"
multiple
onChange={handlePhotoSelection}
className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm"
/>

{previews.length > 0 && (
<div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">

{previews.map((preview, index) => (
<div
key={`${preview}-${index}`}
className="relative"
>
<img
src={preview}
alt={`Selected photo ${index + 1}`}
className="h-28 w-full rounded-xl object-cover"
/>

<button
type="button"
onClick={() =>
removeSelectedPhoto(index)
}
className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white"
>
Remove
</button>
</div>
))}

</div>
)}
</div>

<button
type="submit"
disabled={saving}
className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
>
{saving
? "Saving Memory..."
: "Save Memory"}
</button>

</form>
</section>
)}

{/* SEARCH */}

<section className="mb-6">

<label
htmlFor="memory-search"
className="mb-2 block text-sm font-semibold"
>
Search Family Memories
</label>

<input
id="memory-search"
type="search"
value={search}
onChange={(event) =>
setSearch(event.target.value)
}
placeholder="Search by title, story, or family member..."
className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-600"
/>

</section>

{/* MEMORY COUNT */}

<section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">

<p className="text-sm text-gray-500">
Family memories preserved
</p>

<p className="mt-2 text-3xl font-bold">
{memories.length}
</p>

</section>

{/* MEMORY LIST */}

<section>

<div className="mb-5 flex items-center justify-between gap-3">

<h2 className="text-xl font-bold">
Your Family Stories
</h2>

<span className="text-sm text-gray-500">
{filteredMemories.length} found
</span>

</div>

{loading ? (

<div className="rounded-2xl bg-white p-12 text-center text-gray-500">
Loading family memories...
</div>

) : filteredMemories.length === 0 ? (

<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center">

<div className="mb-4 text-5xl">
📖
</div>

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

<span className="text-3xl">
📖
</span>

<button
type="button"
onClick={() =>
handleDeleteMemory(memory)
}
className="text-sm font-medium text-red-600 hover:text-red-800"
>
Delete
</button>

</div>

<h3 className="break-words text-xl font-bold">
{memory.title}
</h3>

{memory.event_date && (
<p className="mt-3 text-sm text-gray-500">
📅{" "}
{new Date(
`${memory.event_date}T12:00:00`
).toLocaleDateString()}
</p>
)}

{memory.tags && (
<p className="mt-2 break-words text-sm text-gray-600">
👨‍👩‍👧 {memory.tags}
</p>
)}

<p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
{memory.description}
</p>

{/* SAVED PHOTOS */}

{memory.photos.length > 0 && (
<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">

{memory.photos.map((photo) => (

<div key={photo.id}>

{photo.signedUrl ? (

<img
src={photo.signedUrl}
alt={
photo.file_name ||
"Family memory photograph"
}
className="h-32 w-full rounded-xl object-cover"
/>

) : (

<div className="flex h-32 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-500">
Photo unavailable
</div>

)}

</div>

))}

</div>
)}

<p className="mt-5 border-t border-gray-100 pt-3 text-xs text-gray-400">
Added{" "}
{new Date(
memory.created_at
).toLocaleDateString()}
</p>

</article>

))}

</div>

)}

</section>

{/* FOOTER */}

<footer className="mt-12 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
Preserving your family's legacy, one memory at a time. 🌳
</footer>

</div>
</main>
);
}

// --------------------------------------------------
// PAGE EXPORT
// --------------------------------------------------

export default function MemoriesPage() {
return (
<Suspense
fallback={
<main className="min-h-screen bg-gray-50 p-8 text-center">
Loading Family Memories...
</main>
}
>
<MemoriesPageContent />
</Suspense>
);
}
