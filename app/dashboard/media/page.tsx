"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
ArrowLeft,
Camera,
Image as ImageIcon,
Video,
Upload,
Search,
Trash2,
X,
Loader2,
Play,
RefreshCw,
} from "lucide-react";

import { supabase } from "@/app/lib/supabase";

type MediaType = "image" | "video";

type MediaItem = {
id: number;
family_id: number;
profile_id: number;
memory_id: number | null;
media_type: MediaType;
file_url: string;
file_name: string | null;
file_size: number | null;
mime_type: string | null;
caption: string | null;
uploaded_by: string;
privacy_level: string;
status: string;
storage_path: string;
created_at: string;
signedUrl?: string;
};

export default function MediaPage() {
const router = useRouter();
const fileInputRef = useRef<HTMLInputElement>(null);

const [familyId, setFamilyId] = useState<number | null>(null);
const [profileId, setProfileId] = useState<number | null>(null);
const [userId, setUserId] = useState<string | null>(null);

const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
const [loading, setLoading] = useState(true);
const [uploading, setUploading] = useState(false);
const [deletingId, setDeletingId] = useState<number | null>(null);

const [search, setSearch] = useState("");
const [filter, setFilter] = useState<"all" | "image" | "video">("all");

const [showForm, setShowForm] = useState(false);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [caption, setCaption] = useState("");
const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

const [error, setError] = useState("");
const [message, setMessage] = useState("");

const loadMedia = useCallback(async () => {
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

setUserId(user.id);

const params = new URLSearchParams(window.location.search);
const requestedFamilyId = Number(params.get("family_id"));

if (
!Number.isSafeInteger(requestedFamilyId) ||
requestedFamilyId <= 0
) {
throw new Error(
"Family ID is missing. Open Media from your Family Space."
);
}

setFamilyId(requestedFamilyId);

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();

if (profileError) throw profileError;

if (!profile) {
throw new Error("Your profile could not be found.");
}

setProfileId(profile.id);

const { data: membership, error: membershipError } =
await supabase
.from("family_members")
.select("id")
.eq("family_id", requestedFamilyId)
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

const { data, error: mediaError } = await supabase
.from("media")
.select(
"id, family_id, profile_id, memory_id, media_type, file_url, file_name, file_size, mime_type, caption, uploaded_by, privacy_level, status, storage_path, created_at"
)
.eq("family_id", requestedFamilyId)
.is("memory_id", null)
.is("deleted_at", null)
.eq("status", "active")
.order("created_at", { ascending: false });

if (mediaError) throw mediaError;

const items = (data ?? []) as MediaItem[];

const itemsWithUrls = await Promise.all(
items.map(async (item) => {
const { data: signedData, error: signedError } =
await supabase.storage
.from("family-media")
.createSignedUrl(item.storage_path, 3600);

if (signedError) {
console.error("Signed URL error:", signedError);
return item;
}

return {
...item,
signedUrl: signedData.signedUrl,
};
})
);

setMediaItems(itemsWithUrls);
} catch (err) {
console.error("Media loading error:", err);

setError(
err instanceof Error
? err.message
: "Unable to load family media."
);
} finally {
setLoading(false);
}
}, [router]);

useEffect(() => {
void loadMedia();
}, [loadMedia]);

function handleFileChange(file: File | null) {
setError("");
setMessage("");

if (!file) {
setSelectedFile(null);
return;
}

const isImage = file.type.startsWith("image/");
const isVideo = file.type.startsWith("video/");

if (!isImage && !isVideo) {
setError("Please select an image or video.");
return;
}

if (file.size > 50 * 1024 * 1024) {
setError("The maximum file size is 50 MB.");
return;
}

setSelectedFile(file);
}

async function handleUpload(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

setError("");
setMessage("");

if (!selectedFile || !familyId || !profileId) {
setError("Please select a file and try again.");
return;
}

setUploading(true);

let uploadedPath: string | null = null;

try {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError) throw authError;
if (!user) throw new Error("Please log in again.");

const mediaType: MediaType = selectedFile.type.startsWith("image/")
? "image"
: "video";

const safeFileName = selectedFile.name.replace(
/[^a-zA-Z0-9._-]/g,
"_"
);

const storagePath =
`${familyId}/${user.id}/${crypto.randomUUID()}-${safeFileName}`;

const { error: storageError } = await supabase.storage
.from("family-media")
.upload(storagePath, selectedFile, {
contentType: selectedFile.type,
upsert: false,
});

if (storageError) throw storageError;

uploadedPath = storagePath;

const { data: insertedMedia, error: insertError } =
await supabase
.from("media")
.insert({
family_id: familyId,
profile_id: profileId,
memory_id: null,
media_type: mediaType,
file_url: storagePath,
file_name: selectedFile.name,
file_size: selectedFile.size,
mime_type: selectedFile.type,
caption: caption.trim() || null,
uploaded_by: user.id,
created_by: user.id,
privacy_level: "family",
status: "active",
storage_path: storagePath,
updated_at: new Date().toISOString(),
})
.select(
"id, family_id, profile_id, memory_id, media_type, file_url, file_name, file_size, mime_type, caption, uploaded_by, privacy_level, status, storage_path, created_at"
)
.single();

if (insertError) throw insertError;

const { data: signedData, error: signedError } =
await supabase.storage
.from("family-media")
.createSignedUrl(storagePath, 3600);

if (signedError) throw signedError;

setMediaItems((previous) => [
{
...(insertedMedia as MediaItem),
signedUrl: signedData.signedUrl,
},
...previous,
]);

setSelectedFile(null);
setCaption("");
setShowForm(false);

if (fileInputRef.current) {
fileInputRef.current.value = "";
}

setMessage("Your family media was uploaded successfully.");
} catch (err) {
console.error("Media upload error:", err);

if (uploadedPath) {
const { error: cleanupError } = await supabase.storage
.from("family-media")
.remove([uploadedPath]);

if (cleanupError) {
console.error("Upload cleanup error:", cleanupError);
}
}

setError(
err instanceof Error
? err.message
: "Unable to upload your media."
);
} finally {
setUploading(false);
}
}

async function handleDelete(item: MediaItem) {
if (!userId || item.uploaded_by !== userId) {
setError("You can only delete media that you uploaded.");
return;
}

const confirmed = window.confirm(
`Delete "${item.file_name || "this media"}"? This cannot be undone.`
);

if (!confirmed) return;

setDeletingId(item.id);
setError("");
setMessage("");

try {
// Delete the storage file first.
const { error: storageError } = await supabase.storage
.from("family-media")
.remove([item.storage_path]);

if (storageError) throw storageError;

// Only remove the database record after storage deletion succeeds.
const { error: databaseError } = await supabase
.from("media")
.delete()
.eq("id", item.id)
.eq("uploaded_by", userId);

if (databaseError) {
throw new Error(
"The file was deleted from storage, but its database record could not be removed. Please refresh and contact support."
);
}

setMediaItems((previous) =>
previous.filter((media) => media.id !== item.id)
);

if (selectedMedia?.id === item.id) {
setSelectedMedia(null);
}

setMessage("Media deleted successfully.");
} catch (err) {
console.error("Media deletion error:", err);

setError(
err instanceof Error
? err.message
: "Unable to delete this media."
);
} finally {
setDeletingId(null);
}
}

const filteredMedia = mediaItems.filter((item) => {
const searchText = [
item.file_name ?? "",
item.caption ?? "",
]
.join(" ")
.toLowerCase();

const matchesSearch = searchText.includes(search.toLowerCase());

const matchesFilter =
filter === "all" || item.media_type === filter;

return matchesSearch && matchesFilter;
});

const photos = mediaItems.filter(
(item) => item.media_type === "image"
).length;

const videos = mediaItems.filter(
(item) => item.media_type === "video"
).length;

return (
<main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
<div className="mx-auto max-w-7xl">
<Link
href={
familyId
? `/dashboard/family-home?id=${familyId}`
: "/dashboard"
}
className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline"
>
<ArrowLeft size={17} />
Back to Family Space
</Link>

<header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
<div>
<p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
CONNETFAM
</p>

<h1 className="text-3xl font-bold sm:text-4xl">
Family Media
</h1>

<p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
Keep your family photographs and videos together,
preserving precious moments for generations to come.
</p>
</div>

<div className="flex gap-3">
<button
type="button"
onClick={() => void loadMedia()}
disabled={loading}
aria-label="Refresh gallery"
className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
>
<RefreshCw size={19} />
</button>

<button
type="button"
onClick={() => {
setShowForm((previous) => !previous);
setError("");
setMessage("");
}}
className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
<Upload size={18} />
{showForm ? "Cancel" : "Add Media"}
</button>
</div>
</header>

{error && (
<div
role="alert"
className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
>
{error}
</div>
)}

{message && (
<div
role="status"
className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
>
{message}
</div>
)}

{showForm && (
<section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
<h2 className="mb-2 text-xl font-bold">
Upload Family Media
</h2>

<p className="mb-6 text-sm text-slate-500">
Your files will be saved securely in your family gallery.
</p>

<form onSubmit={handleUpload} className="space-y-5">
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
placeholder="Tell your family about this moment..."
rows={3}
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="media-file"
className="mb-2 block text-sm font-semibold"
>
Choose Photo or Video
</label>

<input
ref={fileInputRef}
id="media-file"
type="file"
accept="image/*,video/*"
required
onChange={(event) =>
handleFileChange(event.target.files?.[0] ?? null)
}
className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
/>

<p className="mt-2 text-xs text-slate-500">
Maximum file size: 50 MB.
</p>

{selectedFile && (
<p className="mt-3 break-all text-sm text-emerald-700">
Selected: {selectedFile.name}
</p>
)}
</div>

<button
type="submit"
disabled={uploading || !selectedFile}
className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{uploading ? (
<>
<Loader2 size={18} className="animate-spin" />
Uploading...
</>
) : (
<>
<Upload size={18} />
Upload to Family Gallery
</>
)}
</button>
</form>
</section>
)}

<section className="mb-8 grid gap-4 sm:grid-cols-3">
<div className="rounded-2xl border border-slate-200 bg-white p-5">
<p className="text-sm text-slate-500">Total Items</p>
<p className="mt-2 text-3xl font-bold">
{loading ? "—" : mediaItems.length}
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5">
<div className="flex items-center gap-2 text-slate-500">
<ImageIcon size={17} />
<p className="text-sm">Photos</p>
</div>
<p className="mt-2 text-3xl font-bold">
{loading ? "—" : photos}
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5">
<div className="flex items-center gap-2 text-slate-500">
<Video size={17} />
<p className="text-sm">Videos</p>
</div>
<p className="mt-2 text-3xl font-bold">
{loading ? "—" : videos}
</p>
</div>
</section>

<section className="mb-6 flex flex-col gap-4 sm:flex-row">
<div className="relative flex-1">
<Search
size={19}
className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
/>

<input
type="search"
value={search}
onChange={(event) => setSearch(event.target.value)}
placeholder="Search family photos and videos..."
className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-emerald-600"
/>
</div>

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
: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
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

<section>
<div className="mb-5 flex items-center justify-between">
<h2 className="text-xl font-bold">Family Gallery</h2>

<span className="text-sm text-slate-500">
{filteredMedia.length} items
</span>
</div>

{loading ? (
<div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
<Loader2
size={32}
className="animate-spin text-emerald-700"
/>
<p className="mt-4 text-sm text-slate-500">
Loading your family gallery...
</p>
</div>
) : filteredMedia.length === 0 ? (
<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
<Camera
size={45}
className="mx-auto text-slate-300"
/>

<h3 className="mt-5 text-lg font-bold">
{search || filter !== "all"
? "No matching media"
: "Your family gallery starts here"}
</h3>

<p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
{search || filter !== "all"
? "Try a different search or filter."
: "Upload your first family photo or video to begin preserving your memories."}
</p>

{!search && filter === "all" && (
<button
type="button"
onClick={() => setShowForm(true)}
className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
Upload Your First Media
</button>
)}
</div>
) : (
<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
{filteredMedia.map((item) => (
<article
key={item.id}
className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
>
<button
type="button"
onClick={() => setSelectedMedia(item)}
className="relative block h-56 w-full overflow-hidden bg-slate-100"
aria-label={`View ${item.file_name || "media"}`}
>
{item.signedUrl ? (
item.media_type === "image" ? (
// eslint-disable-next-line @next/next/no-img-element
<img
src={item.signedUrl}
alt={item.file_name || "Family photo"}
className="h-full w-full object-cover transition-transform hover:scale-105"
/>
) : (
<div className="flex h-full items-center justify-center bg-slate-900 text-white">
<Play size={45} />
</div>
)
) : (
<div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
<ImageIcon size={30} />
<span className="text-xs">
Preview unavailable
</span>
</div>
)}

{item.media_type === "video" && (
<span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
Video
</span>
)}
</button>

<div className="p-5">
<h3 className="break-words font-bold">
{item.file_name || "Family media"}
</h3>

{item.caption && (
<p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
{item.caption}
</p>
)}

<p className="mt-3 text-xs text-slate-400">
{new Date(item.created_at).toLocaleDateString()}
</p>

<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
<button
type="button"
onClick={() => setSelectedMedia(item)}
className="text-sm font-semibold text-emerald-700 hover:underline"
>
View Media
</button>

{item.uploaded_by === userId && (
<button
type="button"
onClick={() => void handleDelete(item)}
disabled={deletingId === item.id}
className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
>
{deletingId === item.id ? (
<Loader2
size={15}
className="animate-spin"
/>
) : (
<Trash2 size={15} />
)}
Delete
</button>
)}
</div>
</div>
</article>
))}
</div>
)}
</section>

{selectedMedia && (
<div
className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
onClick={() => setSelectedMedia(null)}
>
<div
role="dialog"
aria-modal="true"
aria-label={selectedMedia.file_name || "Media viewer"}
className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-4 sm:p-6"
onClick={(event) => event.stopPropagation()}
>
<div className="mb-4 flex items-start justify-between gap-4">
<div>
<h2 className="break-words text-xl font-bold">
{selectedMedia.file_name || "Family media"}
</h2>

{selectedMedia.caption && (
<p className="mt-2 text-sm text-slate-600">
{selectedMedia.caption}
</p>
)}
</div>

<button
type="button"
onClick={() => setSelectedMedia(null)}
className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100"
aria-label="Close media viewer"
>
<X size={20} />
</button>
</div>

{selectedMedia.signedUrl ? (
selectedMedia.media_type === "image" ? (
// eslint-disable-next-line @next/next/no-img-element
<img
src={selectedMedia.signedUrl}
alt={selectedMedia.file_name || "Family photo"}
className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain"
/>
) : (
<video
src={selectedMedia.signedUrl}
controls
playsInline
className="max-h-[70vh] w-full rounded-lg bg-black"
>
Your browser does not support video playback.
</video>
)
) : (
<p className="py-12 text-center text-sm text-red-600">
This media file could not be loaded.
</p>
)}
</div>
</div>
)}

<footer className="mt-12 border-t border-slate-200 py-6 text-center text-sm text-slate-500">
Every photo preserves a moment. Every video keeps a memory alive. 🌳
</footer>
</div>
</main>
);
}
