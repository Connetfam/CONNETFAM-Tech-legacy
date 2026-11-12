"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type VoiceMessage = {
id: number;
title: string;
description: string | null;
storage_path: string;
duration_seconds: number;
created_at: string;
uploaded_by: string;
audioUrl?: string;
};

export default function VoiceMessagesPage() {
const searchParams = useSearchParams();
const familyId = searchParams.get("family_id");

const [messages, setMessages] = useState<VoiceMessage[]>([]);
const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
const [recording, setRecording] = useState(false);
const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
const [audioPreview, setAudioPreview] = useState("");
const [duration, setDuration] = useState(0);
const [elapsed, setElapsed] = useState(0);
const [error, setError] = useState("");
const [notice, setNotice] = useState("");
const [loading, setLoading] = useState(false);
const [pageLoading, setPageLoading] = useState(true);
const [userId, setUserId] = useState("");
const [profileId, setProfileId] = useState<number | null>(null);

const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const streamRef = useRef<MediaStream | null>(null);
const chunksRef = useRef<Blob[]>([]);
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const startTimeRef = useRef<number>(0);

function formatDuration(seconds: number) {
const minutes = Math.floor(seconds / 60);
const remainingSeconds = seconds % 60;

return `${String(minutes).padStart(2, "0")}:${String(
remainingSeconds
).padStart(2, "0")}`;
}

function releaseMicrophone() {
streamRef.current?.getTracks().forEach((track) => track.stop());
streamRef.current = null;
}

function clearTimer() {
if (timerRef.current) {
clearInterval(timerRef.current);
timerRef.current = null;
}
}

const loadMessages = useCallback(async () => {
if (!familyId) {
setError("Family ID is missing. Open Voice Messages from your family workspace.");
setPageLoading(false);
return;
}

setPageLoading(true);
setError("");

try {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
throw new Error("Please log in to access voice messages.");
}

setUserId(user.id);

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id")
.eq("user_id", user.id)
.single();

if (profileError || !profile) {
throw new Error("Your user profile could not be found.");
}

setProfileId(profile.id);

const { data: membership, error: membershipError } = await supabase
.from("family_members")
.select("family_id")
.eq("profile_id", profile.id)
.eq("family_id", Number(familyId))
.eq("status", "active")
.eq("is_active", true)
.maybeSingle();

if (membershipError || !membership) {
throw new Error("You are not an active member of this family.");
}

const { data, error: messagesError } = await supabase
.from("voice_messages")
.select("*")
.eq("family_id", Number(familyId))
.order("created_at", { ascending: false });

if (messagesError) throw messagesError;

const messagesWithUrls = await Promise.all(
(data || []).map(async (message: VoiceMessage) => {
const { data: signedData, error: signedError } =
await supabase.storage
.from("voice-messages")
.createSignedUrl(message.storage_path, 3600);

if (signedError) {
console.error("Audio URL error:", signedError);
}

return {
...message,
audioUrl: signedData?.signedUrl || "",
};
})
);

setMessages(messagesWithUrls);
} catch (err) {
setError(
err instanceof Error
? err.message
: "Unable to load voice messages."
);
} finally {
setPageLoading(false);
}
}, [familyId]);

useEffect(() => {
loadMessages();
}, [loadMessages]);

useEffect(() => {
return () => {
clearTimer();
releaseMicrophone();

if (audioPreview) {
URL.revokeObjectURL(audioPreview);
}
};
}, [audioPreview]);

async function startRecording() {
setError("");
setNotice("");
setRecordedBlob(null);
setElapsed(0);

if (
!navigator.mediaDevices?.getUserMedia ||
typeof MediaRecorder === "undefined"
) {
setError("Recording is not supported by this browser.");
return;
}

try {
const stream = await navigator.mediaDevices.getUserMedia({
audio: true,
});

streamRef.current = stream;
chunksRef.current = [];

const supportedTypes = [
"audio/webm;codecs=opus",
"audio/webm",
"audio/mp4",
];

const mimeType = supportedTypes.find((type) =>
MediaRecorder.isTypeSupported(type)
);

const recorder = mimeType
? new MediaRecorder(stream, { mimeType })
: new MediaRecorder(stream);

mediaRecorderRef.current = recorder;
startTimeRef.current = Date.now();

recorder.ondataavailable = (event) => {
if (event.data.size > 0) {
chunksRef.current.push(event.data);
}
};

recorder.onstop = () => {
const blob = new Blob(chunksRef.current, {
type: recorder.mimeType || "audio/webm",
});

setRecordedBlob(blob);

setDuration(
Math.max(
1,
Math.round((Date.now() - startTimeRef.current) / 1000)
)
);

setAudioPreview(URL.createObjectURL(blob));

releaseMicrophone();
clearTimer();
setRecording(false);
};

recorder.onerror = () => {
setError("Recording failed. Please try again.");
releaseMicrophone();
clearTimer();
setRecording(false);
};

recorder.start();
setRecording(true);

timerRef.current = setInterval(() => {
setElapsed(
Math.floor((Date.now() - startTimeRef.current) / 1000)
);
}, 1000);
} catch {
setError(
"Microphone access was denied. Please allow microphone permission."
);
}
}

function stopRecording() {
const recorder = mediaRecorderRef.current;

if (recorder && recorder.state !== "inactive") {
recorder.stop();
}
}

function discardRecording() {
if (recording) {
stopRecording();
}

if (audioPreview) {
URL.revokeObjectURL(audioPreview);
}

setAudioPreview("");
setRecordedBlob(null);
setDuration(0);
setElapsed(0);
setTitle("");
setDescription("");
setNotice("Recording discarded.");
setError("");
}

function uploadAudio(event: React.ChangeEvent<HTMLInputElement>) {
const file = event.target.files?.[0];

if (!file) return;

setError("");
setNotice("");

if (!file.type.startsWith("audio/")) {
setError("Please select an audio file.");
event.target.value = "";
return;
}

if (file.size > 25 * 1024 * 1024) {
setError("Please select an audio file smaller than 25 MB.");
event.target.value = "";
return;
}

if (audioPreview) {
URL.revokeObjectURL(audioPreview);
}

setRecordedBlob(file);
setAudioPreview(URL.createObjectURL(file));
setDuration(0);

setTitle((current) =>
current || file.name.replace(/\.[^/.]+$/, "")
);

setNotice("Audio selected. Listen before saving.");
event.target.value = "";
}

async function saveRecording() {
if (!recordedBlob) {
setError("Please record or upload an audio message first.");
return;
}

if (!title.trim()) {
setError("Please enter a title for your voice message.");
return;
}

if (!familyId || !userId || !profileId) {
setError("Your family or profile information is missing.");
return;
}

setLoading(true);
setError("");
setNotice("");

let storagePath = "";

try {
const mimeType = (
recordedBlob.type || "audio/webm"
).split(";")[0];

const extension =
mimeType === "audio/mp4"
? "mp4"
: mimeType === "audio/mpeg"
? "mp3"
: mimeType === "audio/ogg"
? "ogg"
: mimeType === "audio/wav"
? "wav"
: mimeType === "audio/aac"
? "aac"
: "webm";

const fileName = `${crypto.randomUUID()}.${extension}`;

storagePath = `${familyId}/${userId}/${fileName}`;

const { error: uploadError } = await supabase.storage
.from("voice-messages")
.upload(storagePath, recordedBlob, {
contentType: mimeType,
upsert: false,
});

if (uploadError) throw uploadError;

const { error: insertError } = await supabase
.from("voice_messages")
.insert({
family_id: Number(familyId),
profile_id: profileId,
uploaded_by: userId,
title: title.trim(),
description: description.trim() || null,
storage_path: storagePath,
duration_seconds: duration,
mime_type: mimeType,
file_size: recordedBlob.size,
});

if (insertError) {
await supabase.storage
.from("voice-messages")
.remove([storagePath]);

throw insertError;
}

if (audioPreview) {
URL.revokeObjectURL(audioPreview);
}

setAudioPreview("");
setRecordedBlob(null);
setTitle("");
setDescription("");
setDuration(0);
setElapsed(0);

setNotice("Your voice message has been saved successfully.");

await loadMessages();
} catch (err) {
setError(
err instanceof Error
? err.message
: "We couldn't save your voice message."
);
} finally {
setLoading(false);
}
}

async function deleteMessage(message: VoiceMessage) {
const confirmed = window.confirm(
"Are you sure you want to permanently delete this voice message?"
);

if (!confirmed) return;

setError("");
setNotice("");

try {
const { error: databaseError } = await supabase
.from("voice_messages")
.delete()
.eq("id", message.id)
.eq("uploaded_by", userId);

if (databaseError) throw databaseError;

const { error: storageError } = await supabase.storage
.from("voice-messages")
.remove([message.storage_path]);

if (storageError) {
setNotice(
"The message record was deleted, but its audio file could not be removed."
);
} else {
setNotice("Voice message permanently deleted.");
}

await loadMessages();
} catch (err) {
setError(
err instanceof Error
? err.message
: "Unable to delete this voice message."
);
}
}

return (
<main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
<div className="mx-auto max-w-6xl">
<Link
href="/dashboard"
className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
>
← Back to Dashboard
</Link>

<header className="mb-8">
<p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-700">
Legacy Family
</p>

<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
Voice Messages 🎙️
</h1>

<p className="mt-3 max-w-2xl leading-7 text-slate-600">
Preserve the voices, stories, advice, laughter, and memories
of the people who matter most.
</p>
</header>

{error && (
<div
role="alert"
className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
>
{error}
</div>
)}

{notice && (
<div
role="status"
className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
>
{notice}
</div>
)}

<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
<div className="mb-6">
<div className="mb-3 text-4xl">🎧</div>
<h2 className="text-xl font-bold">
Record a Voice Message
</h2>
<p className="mt-2 text-sm leading-6 text-slate-500">
Record a family story, birthday greeting, or advice
for future generations.
</p>
</div>

<div className="mb-6 rounded-2xl bg-slate-50 p-6 text-center">
<div
className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-4xl ${
recording
? "animate-pulse bg-red-100"
: "bg-emerald-100"
}`}
>
{recording ? "🔴" : "🎙️"}
</div>

<p className="text-3xl font-bold tabular-nums">
{formatDuration(recording ? elapsed : duration)}
</p>

<p className="mt-2 text-sm text-slate-500">
{recording
? "Recording in progress..."
: recordedBlob
? "Recording ready for review"
: "Ready to record"}
</p>

<div className="mt-6 flex justify-center gap-3">
{!recording ? (
<button
type="button"
onClick={startRecording}
className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
● Start Recording
</button>
) : (
<button
type="button"
onClick={stopRecording}
className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
>
■ Stop Recording
</button>
)}
</div>

<p className="mt-4 text-xs text-slate-500">
Allow microphone permission when requested.
</p>
</div>

<div className="mb-6">
<h3 className="mb-3 font-semibold">
Or upload an audio file
</h3>

<input
type="file"
accept="audio/*"
onChange={uploadAudio}
className="block w-full cursor-pointer rounded-xl border border-slate-300 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-semibold file:text-emerald-800"
/>
<p className="mt-2 text-xs text-slate-500">
Maximum file size: 25 MB.
</p>
</div>

{audioPreview && (
<div className="mb-6 rounded-xl border border-emerald-200 p-4">
<h3 className="mb-3 font-semibold">
Listen before saving
</h3>

<audio
controls
src={audioPreview}
className="w-full"
/>

<button
type="button"
onClick={discardRecording}
className="mt-3 text-sm font-medium text-red-700 hover:underline"
>
Discard recording
</button>
</div>
)}

<div className="space-y-4">
<div>
<label
htmlFor="voice-title"
className="mb-2 block text-sm font-semibold"
>
Message title *
</label>

<input
id="voice-title"
value={title}
onChange={(event) => setTitle(event.target.value)}
placeholder="e.g. Grandpa's childhood story"
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="voice-description"
className="mb-2 block text-sm font-semibold"
>
Description
</label>

<textarea
id="voice-description"
rows={3}
value={description}
onChange={(event) =>
setDescription(event.target.value)
}
placeholder="What is this message about?"
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<button
type="button"
onClick={saveRecording}
disabled={!recordedBlob || recording || loading}
className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
>
{loading ? "Saving..." : "Save Voice Message"}
</button>
</div>
</section>

<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
<div className="mb-6">
<h2 className="text-xl font-bold">
Your Voice Collection
</h2>

<p className="mt-2 text-sm leading-6 text-slate-500">
Family recordings saved securely in your workspace.
</p>
</div>

<div className="mb-6 rounded-xl bg-emerald-50 p-4">
<p className="text-sm text-emerald-900">
<strong>{messages.length}</strong>{" "}
{messages.length === 1 ? "message" : "messages"} saved
</p>
</div>

{pageLoading ? (
<p className="py-10 text-center text-sm text-slate-500">
Loading your voice collection...
</p>
) : messages.length === 0 ? (
<div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
<div className="mb-4 text-5xl">🎙️</div>

<h3 className="font-bold">
No voice messages yet
</h3>

<p className="mt-2 text-sm leading-6 text-slate-500">
Your first recording could preserve a memory your
family will treasure for generations.
</p>
</div>
) : (
<div className="space-y-4">
{messages.map((message) => (
<article
key={message.id}
className="rounded-xl border border-slate-200 p-4"
>
<div className="flex items-start justify-between gap-3">
<div className="min-w-0">
<h3 className="break-words font-bold">
{message.title}
</h3>

<p className="mt-1 text-xs text-slate-500">
{new Date(
message.created_at
).toLocaleString()}
</p>
</div>

{message.uploaded_by === userId && (
<button
type="button"
onClick={() => deleteMessage(message)}
className="shrink-0 text-sm font-medium text-red-700 hover:underline"
>
Delete
</button>
)}
</div>

{message.description && (
<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
{message.description}
</p>
)}

{message.audioUrl ? (
<audio
controls
src={message.audioUrl}
className="mt-4 w-full"
/>
) : (
<p className="mt-4 text-sm text-red-600">
Audio could not be loaded. Try refreshing.
</p>
)}

<p className="mt-2 text-xs text-slate-400">
Duration:{" "}
{formatDuration(message.duration_seconds || 0)}
</p>
</article>
))}
</div>
)}
</section>
</div>

<div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
<h2 className="font-bold text-emerald-950">
Preserving family voices
</h2>

<p className="mt-2 text-sm leading-6 text-emerald-900">
Your recordings are stored in private family storage.
Only authenticated members with active family membership
can access the collection.
</p>
</div>

<footer className="mt-8 text-center text-sm text-slate-500">
Legacy Family — every voice has a story worth preserving. 🌳
</footer>
</div>
</main>
);
}
