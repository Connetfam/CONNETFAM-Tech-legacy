"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type MediaItem = {
id: string;
title: string;
caption: string;
type: "image" | "video";
url: string;
fileName: string;
date: string;
};

export default function MediaPage() {
const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
const [search, setSearch] = useState("");
const [filter, setFilter] = useState<"all" | "image" | "video">(
"all"
);
const [showForm, setShowForm] = useState(false);
const [title, setTitle] = useState("");
const [caption, setCaption] = useState("");
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [message, setMessage] = useState("");
const [error, setError] = useState("");
const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(
null
);
const [loading, setLoading] = useState(false);

const fileInputRef = useRef<HTMLInputElement>(null);

function handleFileChange(file: File | null) {
setError("");
setSelectedFile(null);

if (!file) return;

const isImage = file.type.startsWith("image/");
const isVideo = file.type.startsWith("video/");

if (!isImage && !isVideo) {
setError("Please select an image or video file.");
if (fileInputRef.current) {
fileInputRef.current.value = "";
}
return;
}

// Keep individual uploads manageable during MVP testing.
const maxSize = 50 * 1024 * 1024;

if (file.size > maxSize) {
setError("The maximum file size is 50 MB.");
if (fileInputRef.current) {
fileInputRef.current.value = "";
}
return;
}

setSelectedFile(file);
}

function handleUpload(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setMessage("");
setError("");

if (!selectedFile) {
setError("Please choose a photo or video first.");
return;
}

if (!title.trim()) {
setError("Please enter a title.");
return;
}

setLoading(true);

try {
const mediaType = selectedFile.type.startsWith("image/")
? "image"
: "video";

const mediaUrl = URL.createObjectURL(selectedFile);

const newMedia: MediaItem = {
id: crypto.randomUUID(),
title: title.trim(),
caption: caption.trim(),
type: mediaType,
url: mediaUrl,
fileName: selectedFile.name,
date: new Date().toISOString(),
};

setMediaItems((previous) => [newMedia, ...previous]);
setTitle("");
setCaption("");
setSelectedFile(null);
setShowForm(false);

if (fileInputRef.current) {
fileInputRef.current.value = "";
}

setMessage(
"Media added to the gallery. This temporary upload is available only in the current session."
);
} catch {
setError("Unable to display this file. Please try another one.");
} finally {
setLoading(false);
}
}

function handleDelete(id: string) {
const confirmed = window.confirm(
"Are you sure you want to remove this media item?"
);

if (!confirmed) return;

const item = mediaItems.find((media) => media.id === id);

if (item) {
URL.revokeObjectURL(item.url);
}

setMediaItems((previous) =>
previous.filter((media) => media.id !== id)
);

if (selectedMedia?.id === id) {
setSelectedMedia(null);
}

setMessage("Media removed from the current gallery.");
}

const filteredMedia = mediaItems.filter((item) => {
const matchesSearch = `${item.title} ${item.caption} ${item.fileName}`
.toLowerCase()
.includes(search.toLowerCase());

const matchesFilter = filter === "all" || item.type === filter;

return matchesSearch && matchesFilter;
});

return (
<main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 sm:px-8">
<div className="mx-auto max-w-7xl">
{/* Header */}
<Link
href="/dashboard"
className="mb-6 inline-block text-sm font-medium text-emerald-700 hover:underline"
>
← Back to Dashboard
</Link>

<header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
<div>
<p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-700">
CONNETFAM
</p>

<h1 className="text-3xl font-bold sm:text-4xl">
Family Media 📸
</h1>

<p className="mt-3 max-w-xl text-gray-600">
Keep your family photographs and videos together,
preserving precious moments for generations to come.
</p>
</div>

<button
type="button"
onClick={() => {
setShowForm((previous) => !previous);
setMessage("");
setError("");
}}
className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
{showForm ? "Cancel" : "+ Add Media"}
</button>
</header>

{/* Feedback */}
{message && (
<div
role="status"
className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
>
{message}
</div>
)}

{error && (
<div
role="alert"
className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
>
{error}
</div>
)}

{/* Upload Form */}
{showForm && (
<section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
<h2 className="mb-6 text-xl font-bold">
Add a Family Photo or Video
</h2>

<form onSubmit={handleUpload} className="space-y-5">
<div>
<label
htmlFor="media-title"
className="mb-2 block text-sm font-semibold"
>
Title *
</label>

<input
id="media-title"
type="text"
value={title}
onChange={(event) => setTitle(event.target.value)}
placeholder="e.g. Family reunion 2026"
required
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="media-caption"
className="mb-2 block text-sm font-semibold"
>
Caption or Description
</label>

<textarea
id="media-caption"
value={caption}
onChange={(event) => setCaption(event.target.value)}
placeholder="Tell us about this special moment..."
rows={3}
className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="media-file"
className="mb-2 block text-sm font-semibold"
>
Choose Photo or Video *
</label>

<input
ref={fileInputRef}
id="media-file"
type="file"
accept="image/*,video/*"
onChange={(event) =>
handleFileChange(event.target.files?.[0] ?? null)
}
required
className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm"
/>

<p className="mt-2 text-xs text-gray-500">
Images and videos up to 50 MB per file.
</p>

{selectedFile && (
<p className="mt-3 break-all text-sm text-emerald-700">
Selected: {selectedFile.name}
</p>
)}
</div>

<button
type="submit"
disabled={loading}
className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
>
{loading ? "Adding media..." : "Add to Gallery"}
</button>
</form>
</section>
)}

{/* Statistics */}
<section className="mb-8 grid gap-4 sm:grid-cols-3">
<div className="rounded-2xl border border-gray-200 bg-white p-5">
<p className="text-sm text-gray-500">Total Items</p>
<p className="mt-2 text-3xl font-bold">{mediaItems.length}</p>
</div>

<div className="rounded-2xl border border-gray-200 bg-white p-5">
<p className="text-sm text-gray-500">Photos</p>
<p className="mt-2 text-3xl font-bold">
{mediaItems.filter((item) => item.type === "image").length}
</p>
</div>

<div className="rounded-2xl border border-gray-200 bg-white p-5">
<p className="text-sm text-gray-500">Videos</p>
<p className="mt-2 text-3xl font-bold">
{mediaItems.filter((item) => item.type === "video").length}
</p>
</div>
</section>

{/* Search and Filters */}
<section className="mb-6 flex flex-col gap-4 sm:flex-row">
<input
type="search"
aria-label="Search family media"
value={search}
onChange={(event) => setSearch(event.target.value)}
placeholder="Search photos and videos..."
className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-600"
/>

<div className="flex gap-2">
{(["all", "image", "video"] as const).map((value) => (
<button
key={value}
type="button"
onClick={() => setFilter(value)}
aria-pressed={filter === value}
className={`rounded-xl px-4 py-3 text-sm font-medium ${
filter === value
? "bg-emerald-700 text-white"
: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
}`}
>
{value === "all"
? "All"
: value === "image"
? "Photos"
: "Videos"}
</button>
))}
</div>
</section>

{/* Gallery */}
<section>
<h2 className="mb-5 text-xl font-bold">Family Gallery</h2>

{filteredMedia.length === 0 ? (
<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center">
<div className="mb-4 text-5xl">🖼️</div>

<h3 className="text-lg font-bold">
{search || filter !== "all"
? "No matching media"
: "Your family gallery starts here"}
</h3>

<p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
{search || filter !== "all"
? "Try another search or filter."
: "Add your first family photo or video to begin building your collection."}
</p>

{!search && filter === "all" && (
<button
type="button"
onClick={() => setShowForm(true)}
className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
+ Upload Your First Media
</button>
)}
</div>
) : (
<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
{filteredMedia.map((item) => (
<article
key={item.id}
className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
>
<button
type="button"
onClick={() => setSelectedMedia(item)}
className="block w-full bg-gray-100 text-left"
aria-label={`View ${item.title}`}
>
{item.type === "image" ? (
// eslint-disable-next-line @next/next/no-img-element
<img
src={item.url}
alt={item.title}
className="h-56 w-full object-cover"
/>
) : (
<div className="flex h-56 items-center justify-center bg-gray-900 text-5xl text-white">
▶️
<span className="sr-only">Play video</span>
</div>
)}
</button>

<div className="p-5">
<div className="mb-2 flex items-start justify-between gap-3">
<h3 className="break-words font-bold">{item.title}</h3>

<span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
{item.type === "image" ? "Photo" : "Video"}
</span>
</div>

{item.caption && (
<p className="mb-3 whitespace-pre-wrap break-words text-sm text-gray-600">
{item.caption}
</p>
)}

<p className="mb-4 break-all text-xs text-gray-400">
{item.fileName}
</p>

<div className="flex items-center justify-between gap-3">
<button
type="button"
onClick={() => setSelectedMedia(item)}
className="text-sm font-semibold text-emerald-700 hover:underline"
>
View {item.type === "image" ? "Photo" : "Video"}
</button>

<button
type="button"
onClick={() => handleDelete(item.id)}
className="text-sm font-medium text-red-600 hover:underline"
>
Delete
</button>
</div>
</div>
</article>
))}
</div>
)}
</section>

{/* Media Viewer */}
{selectedMedia && (
<div
className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
onClick={() => setSelectedMedia(null)}
>
<div
role="dialog"
aria-modal="true"
aria-label={selectedMedia.title}
className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 sm:p-6"
onClick={(event) => event.stopPropagation()}
>
<div className="mb-4 flex items-start justify-between gap-4">
<div>
<h2 className="text-xl font-bold">
{selectedMedia.title}
</h2>
{selectedMedia.caption && (
<p className="mt-2 text-sm text-gray-600">
{selectedMedia.caption}
</p>
)}
</div>

<button
type="button"
onClick={() => setSelectedMedia(null)}
className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium"
>
Close
</button>
</div>

{selectedMedia.type === "image" ? (
// eslint-disable-next-line @next/next/no-img-element
<img
src={selectedMedia.url}
alt={selectedMedia.title}
className="mx-auto max-h-[65vh] w-auto max-w-full rounded-lg object-contain"
/>
) : (
<video
src={selectedMedia.url}
controls
playsInline
className="max-h-[65vh] w-full rounded-lg bg-black"
>
Your browser does not support video playback.
</video>
)}
</div>
</div>
)}

<footer className="mt-12 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
Every photo preserves a moment. Every video keeps a memory alive. 🌳
</footer>
</div>
</main>
);
}