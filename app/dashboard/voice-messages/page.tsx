"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type VoiceMessage = {
id: string;
title: string;
description: string;
audioUrl: string;
duration: number;
createdAt: string;
};

export default function VoiceMessagesPage() {
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

const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const streamRef = useRef<MediaStream | null>(null);
const chunksRef = useRef<Blob[]>([]);
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const startTimeRef = useRef<number>(0);
const fileInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
return () => {
if (timerRef.current) clearInterval(timerRef.current);

streamRef.current?.getTracks().forEach((track) => track.stop());

if (audioPreview) URL.revokeObjectURL(audioPreview);

messages.forEach((message) => URL.revokeObjectURL(message.audioUrl));
};
// Cleanup when the page unmounts.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

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

async function startRecording() {
setError("");
setNotice("");
setRecordedBlob(null);
setElapsed(0);

if (
typeof navigator === "undefined" ||
!navigator.mediaDevices?.getUserMedia ||
typeof MediaRecorder === "undefined"
) {
setError(
"Voice recording is not supported by this browser. Try an updated browser on HTTPS or localhost."
);
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
Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
);

setAudioPreview(URL.createObjectURL(blob));
releaseMicrophone();
setRecording(false);
clearTimer();
};

recorder.onerror = () => {
setError("Recording failed. Please try again.");
setRecording(false);
releaseMicrophone();
clearTimer();
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
"We couldn't access your microphone. Allow microphone permission in your browser settings and try again."
);
}
}

function stopRecording() {
const recorder = mediaRecorderRef.current;

if (recorder && recorder.state !== "inactive") {
recorder.stop();
} else {
setRecording(false);
releaseMicrophone();
clearTimer();
}
}

function discardRecording() {
if (recording) stopRecording();

if (audioPreview) URL.revokeObjectURL(audioPreview);

setAudioPreview("");
setRecordedBlob(null);
setDuration(0);
setElapsed(0);
setTitle("");
setDescription("");
setError("");
setNotice("Recording discarded.");
}

function saveRecording() {
if (!recordedBlob) {
setError("Please record or upload an audio message first.");
return;
}

if (!title.trim()) {
setError("Please enter a title for your voice message.");
return;
}

setLoading(true);
setError("");

try {
const message: VoiceMessage = {
id: crypto.randomUUID(),
title: title.trim(),
description: description.trim(),
audioUrl: URL.createObjectURL(recordedBlob),
duration,
createdAt: new Date().toISOString(),
};

setMessages((current) => [...current, message]);

if (audioPreview) URL.revokeObjectURL(audioPreview);

setAudioPreview("");
setRecordedBlob(null);
setTitle("");
setDescription("");
setDuration(0);
setElapsed(0);

setNotice(
"Voice message added to this session. Upload it to secure storage to keep it across devices."
);
} catch {
setError("We couldn't save this recording. Please try again.");
} finally {
setLoading(false);
}
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
setError("Please choose an audio file smaller than 25 MB.");
event.target.value = "";
return;
}

if (audioPreview) URL.revokeObjectURL(audioPreview);

const url = URL.createObjectURL(file);

setAudioPreview(url);
setRecordedBlob(file);
setDuration(0);
setTitle((current) =>
current || file.name.replace(/\.[^/.]+$/, "")
);

setNotice("Audio selected. Listen to it before saving.");

event.target.value = "";
}

function deleteMessage(id: string) {
const confirmed = window.confirm(
"Delete this voice message from the current session?"
);

if (!confirmed) return;

setMessages((current) => {
const message = current.find((item) => item.id === id);

if (message) URL.revokeObjectURL(message.audioUrl);

return current.filter((item) => item.id !== id);
});

setNotice("Voice message removed from this session.");
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
of the people who matter most. Their voices can become part
of your family history.
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

<h2 className="text-xl font-bold">Record a Voice Message</h2>

<p className="mt-2 text-sm leading-6 text-slate-500">
Record a personal message, a family story, a birthday
greeting, or advice for future generations.
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

<div className="mt-6 flex flex-wrap justify-center gap-3">
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

<p className="mt-4 text-xs leading-5 text-slate-500">
Your browser will ask permission to use your microphone.
</p>
</div>

<div className="mb-6">
<div className="mb-3 flex items-center justify-between gap-3">
<h3 className="font-semibold">Or upload an audio file</h3>

<span className="text-xs text-slate-500">
Maximum 25 MB
</span>
</div>

<input
ref={fileInputRef}
type="file"
accept="audio/*"
onChange={uploadAudio}
className="block w-full cursor-pointer rounded-xl border border-slate-300 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-semibold file:text-emerald-800"
/>
</div>

{audioPreview && (
<div className="mb-6 rounded-xl border border-emerald-200 p-4">
<h3 className="mb-3 font-semibold">Listen before saving</h3>

<audio
key={audioPreview}
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
onChange={(e) => setTitle(e.target.value)}
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
onChange={(e) => setDescription(e.target.value)}
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
<h2 className="text-xl font-bold">Your Voice Collection</h2>

<p className="mt-2 text-sm leading-6 text-slate-500">
Recordings added during this session will appear here.
</p>
</div>

<div className="mb-6 rounded-xl bg-emerald-50 p-4">
<p className="text-sm text-emerald-900">
<strong>{messages.length}</strong>{" "}
{messages.length === 1 ? "message" : "messages"} in this
session
</p>
</div>

{messages.length === 0 ? (
<div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
<div className="mb-4 text-5xl">🎙️</div>

<h3 className="font-bold">No voice messages yet</h3>

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
{new Date(message.createdAt).toLocaleString()}
</p>
</div>

<button
type="button"
onClick={() => deleteMessage(message.id)}
className="shrink-0 text-sm font-medium text-red-700 hover:underline"
>
Delete
</button>
</div>

{message.description && (
<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
{message.description}
</p>
)}

<audio
controls
src={message.audioUrl}
className="mt-4 w-full"
/>
</article>
))}
</div>
)}
</section>
</div>

<div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
<h2 className="font-bold text-amber-950">
Important: Protecting family memories
</h2>

<p className="mt-2 text-sm leading-6 text-amber-900">
This is the initial recording interface. Messages currently
remain in browser memory and will not survive a page refresh.
The next stage is connecting Supabase Storage and the database
so recordings can be stored securely and associated with the
correct family. Family access controls must be configured
before sharing private recordings.
</p>
</div>

<footer className="mt-8 text-center text-sm text-slate-500">
Legacy Family — every voice has a story worth preserving. 🌳
</footer>
</div>
</main>
);
}
