"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventCategory =
| "Birthday"
| "Anniversary"
| "Family Meeting"
| "Family Reunion"
| "Holiday"
| "Other";

type Recurrence = "none" | "weekly" | "monthly" | "yearly";

type FamilyEvent = {
id: string;
title: string;
category: EventCategory;
date: string;
time: string;
location: string;
description: string;
recurrence: Recurrence;
};

const categories: EventCategory[] = [
"Birthday",
"Anniversary",
"Family Meeting",
"Family Reunion",
"Holiday",
"Other",
];

const emptyForm = {
title: "",
category: "Family Meeting" as EventCategory,
date: "",
time: "12:00",
location: "",
description: "",
recurrence: "none" as Recurrence,
};

function dateToLocalString(date: Date) {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");

return `${year}-${month}-${day}`;
}

function getNextOccurrence(event: FamilyEvent): Date | null {
const [year, month, day] = event.date.split("-").map(Number);

if (!year || !month || !day) return null;

const today = new Date();
today.setHours(0, 0, 0, 0);

let occurrence = new Date(year, month - 1, day);

if (event.recurrence === "none") {
return occurrence >= today ? occurrence : null;
}

if (event.recurrence === "weekly") {
while (occurrence < today) {
occurrence.setDate(occurrence.getDate() + 7);
}

return occurrence;
}

if (event.recurrence === "monthly") {
while (occurrence < today) {
const originalDay = day;

occurrence.setDate(1);
occurrence.setMonth(occurrence.getMonth() + 1);

const lastDay = new Date(
occurrence.getFullYear(),
occurrence.getMonth() + 1,
0
).getDate();

occurrence.setDate(Math.min(originalDay, lastDay));
}

return occurrence;
}

if (event.recurrence === "yearly") {
while (occurrence < today) {
const nextYear = occurrence.getFullYear() + 1;
const lastDay = new Date(nextYear, month, 0).getDate();

occurrence = new Date(
nextYear,
month - 1,
Math.min(day, lastDay)
);
}

return occurrence;
}

return occurrence;
}

function formatDate(date: Date) {
return date.toLocaleDateString("en-GB", {
weekday: "short",
day: "numeric",
month: "short",
year: "numeric",
});
}

function formatTime(time: string) {
if (!time) return "Time not set";

const [hours, minutes] = time.split(":").map(Number);
const date = new Date();

date.setHours(hours, minutes, 0, 0);

return date.toLocaleTimeString("en-GB", {
hour: "numeric",
minute: "2-digit",
hour12: true,
});
}

function recurrenceLabel(recurrence: Recurrence) {
const labels: Record<Recurrence, string> = {
none: "One-time event",
weekly: "Repeats weekly",
monthly: "Repeats monthly",
yearly: "Repeats yearly",
};

return labels[recurrence];
}

function categoryIcon(category: EventCategory) {
const icons: Record<EventCategory, string> = {
Birthday: "🎂",
Anniversary: "💍",
"Family Meeting": "👨‍👩‍👧‍👦",
"Family Reunion": "🌳",
Holiday: "🎉",
Other: "📌",
};

return icons[category];
}

export default function FamilyCalendarPage() {
const [events, setEvents] = useState<FamilyEvent[]>([]);
const [form, setForm] = useState(emptyForm);
const [editingId, setEditingId] = useState<string | null>(null);
const [showForm, setShowForm] = useState(false);
const [search, setSearch] = useState("");
const [categoryFilter, setCategoryFilter] = useState("All");
const [view, setView] = useState<"upcoming" | "all">("upcoming");
const [message, setMessage] = useState("");

useEffect(() => {
try {
const saved = localStorage.getItem("legacy-family-calendar");

if (saved) {
setEvents(JSON.parse(saved) as FamilyEvent[]);
}
} catch {
setMessage("Saved events could not be loaded.");
}
}, []);

function saveEvents(updatedEvents: FamilyEvent[]) {
setEvents(updatedEvents);

try {
localStorage.setItem(
"legacy-family-calendar",
JSON.stringify(updatedEvents)
);
} catch {
setMessage(
"Changes are visible, but this browser could not save them locally."
);
}
}

function openNewEventForm() {
setForm(emptyForm);
setEditingId(null);
setShowForm(true);
setMessage("");
}

function openEditEventForm(event: FamilyEvent) {
setForm({
title: event.title,
category: event.category,
date: event.date,
time: event.time,
location: event.location,
description: event.description,
recurrence: event.recurrence,
});

setEditingId(event.id);
setShowForm(true);
setMessage("");
}

function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault();

if (!form.title.trim() || !form.date) {
setMessage("Please enter an event name and date.");
return;
}

const updatedEvent: FamilyEvent = {
...form,
title: form.title.trim(),
id: editingId ?? crypto.randomUUID(),
};

if (editingId) {
saveEvents(
events.map((event) =>
event.id === editingId ? updatedEvent : event
)
);

setMessage("Event updated successfully.");
} else {
saveEvents([...events, updatedEvent]);

setMessage("Event created successfully.");
}

setForm(emptyForm);
setEditingId(null);
setShowForm(false);
}

function deleteEvent(id: string) {
const confirmed = window.confirm(
"Are you sure you want to delete this event?"
);

if (!confirmed) return;

saveEvents(events.filter((event) => event.id !== id));
setMessage("Event deleted.");
}

const filteredEvents = useMemo(() => {
return events
.map((event) => ({
...event,
nextOccurrence: getNextOccurrence(event),
}))
.filter((event) => {
const matchesSearch =
event.title.toLowerCase().includes(search.toLowerCase()) ||
event.location.toLowerCase().includes(search.toLowerCase()) ||
event.description.toLowerCase().includes(search.toLowerCase());

const matchesCategory =
categoryFilter === "All" || event.category === categoryFilter;

const matchesView =
view === "all" || event.nextOccurrence !== null;

return matchesSearch && matchesCategory && matchesView;
})
.sort((a, b) => {
if (!a.nextOccurrence) return 1;
if (!b.nextOccurrence) return -1;

return a.nextOccurrence.getTime() - b.nextOccurrence.getTime();
});
}, [events, search, categoryFilter, view]);

const upcomingCount = events.filter(
(event) => getNextOccurrence(event) !== null
).length;

const today = dateToLocalString(new Date());

return (
<main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
<div className="mx-auto max-w-6xl">
<Link
href="/dashboard"
className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
>
← Back to Dashboard
</Link>

<header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
<div>
<p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-700">
Legacy Family
</p>

<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
Family Calendar 📅
</h1>

<p className="mt-2 max-w-2xl text-slate-600">
Keep important family dates, celebrations, and gatherings
together in one place.
</p>
</div>

<button
onClick={openNewEventForm}
className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
>
+ Create Event
</button>
</header>

{message && (
<div
role="status"
className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
>
{message}
</div>
)}

<section className="mb-8 grid gap-4 sm:grid-cols-3">
<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
<p className="text-sm text-slate-500">Total events</p>
<p className="mt-2 text-3xl font-bold">{events.length}</p>
<p className="mt-1 text-sm text-slate-500">
Saved in this browser
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
<p className="text-sm text-slate-500">Upcoming events</p>
<p className="mt-2 text-3xl font-bold">{upcomingCount}</p>
<p className="mt-1 text-sm text-slate-500">
Includes recurring events
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
<p className="text-sm text-slate-500">Today</p>
<p className="mt-2 text-xl font-bold">
{formatDate(new Date())}
</p>
<p className="mt-1 text-sm text-slate-500">
Make time for family.
</p>
</div>
</section>

{showForm && (
<section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
<div className="mb-6 flex items-center justify-between gap-4">
<div>
<h2 className="text-xl font-bold">
{editingId ? "Edit Event" : "Create Family Event"}
</h2>
<p className="mt-1 text-sm text-slate-500">
Add the details your family needs.
</p>
</div>

<button
type="button"
onClick={() => {
setShowForm(false);
setEditingId(null);
setForm(emptyForm);
}}
className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
>
Close
</button>
</div>

<form onSubmit={handleSubmit} className="space-y-5">
<div className="grid gap-5 sm:grid-cols-2">
<div>
<label
htmlFor="event-title"
className="mb-2 block text-sm font-semibold"
>
Event name *
</label>

<input
id="event-title"
required
value={form.title}
onChange={(e) =>
setForm({ ...form, title: e.target.value })
}
placeholder="e.g. Grandma's birthday"
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
/>
</div>

<div>
<label
htmlFor="event-category"
className="mb-2 block text-sm font-semibold"
>
Category
</label>

<select
id="event-category"
value={form.category}
onChange={(e) =>
setForm({
...form,
category: e.target.value as EventCategory,
})
}
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
>
{categories.map((category) => (
<option key={category} value={category}>
{category}
</option>
))}
</select>
</div>

<div>
<label
htmlFor="event-date"
className="mb-2 block text-sm font-semibold"
>
Date *
</label>

<input
id="event-date"
type="date"
required
value={form.date}
onChange={(e) =>
setForm({ ...form, date: e.target.value })
}
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="event-time"
className="mb-2 block text-sm font-semibold"
>
Time
</label>

<input
id="event-time"
type="time"
value={form.time}
onChange={(e) =>
setForm({ ...form, time: e.target.value })
}
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="event-location"
className="mb-2 block text-sm font-semibold"
>
Location
</label>

<input
id="event-location"
value={form.location}
onChange={(e) =>
setForm({ ...form, location: e.target.value })
}
placeholder="e.g. Family home"
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="event-recurrence"
className="mb-2 block text-sm font-semibold"
>
Repeat event
</label>

<select
id="event-recurrence"
value={form.recurrence}
onChange={(e) =>
setForm({
...form,
recurrence: e.target.value as Recurrence,
})
}
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
>
<option value="none">Does not repeat</option>
<option value="weekly">Every week</option>
<option value="monthly">Every month</option>
<option value="yearly">Every year</option>
</select>
</div>
</div>

<div>
<label
htmlFor="event-description"
className="mb-2 block text-sm font-semibold"
>
Description
</label>

<textarea
id="event-description"
rows={3}
value={form.description}
onChange={(e) =>
setForm({ ...form, description: e.target.value })
}
placeholder="Add details about the event..."
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div className="flex flex-col gap-3 sm:flex-row">
<button
type="submit"
className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
>
{editingId ? "Save Changes" : "Save Event"}
</button>

<button
type="button"
onClick={() => {
setShowForm(false);
setEditingId(null);
setForm(emptyForm);
}}
className="rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50"
>
Cancel
</button>
</div>
</form>
</section>
)}

<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
<div className="mb-6">
<h2 className="text-xl font-bold">Your Family Events</h2>
<p className="mt-1 text-sm text-slate-500">
Find celebrations and plan your next family gathering.
</p>
</div>

<div className="mb-6 flex flex-col gap-3 lg:flex-row">
<input
type="search"
value={search}
onChange={(e) => setSearch(e.target.value)}
placeholder="Search events, descriptions, or locations..."
className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>

<select
value={categoryFilter}
onChange={(e) => setCategoryFilter(e.target.value)}
aria-label="Filter events by category"
className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
>
<option value="All">All categories</option>

{categories.map((category) => (
<option key={category} value={category}>
{category}
</option>
))}
</select>
</div>

<div className="mb-6 flex gap-2 border-b border-slate-200 pb-4">
<button
onClick={() => setView("upcoming")}
className={`rounded-lg px-4 py-2 text-sm font-semibold ${
view === "upcoming"
? "bg-emerald-100 text-emerald-900"
: "text-slate-600 hover:bg-slate-100"
}`}
>
Upcoming
</button>

<button
onClick={() => setView("all")}
className={`rounded-lg px-4 py-2 text-sm font-semibold ${
view === "all"
? "bg-emerald-100 text-emerald-900"
: "text-slate-600 hover:bg-slate-100"
}`}
>
All Events
</button>
</div>

{filteredEvents.length === 0 ? (
<div className="rounded-2xl border border-dashed border-slate-300 px-5 py-14 text-center">
<div className="mb-4 text-5xl">📅</div>

<h3 className="text-lg font-bold">
{events.length === 0
? "Your family calendar starts here"
: "No matching events found"}
</h3>

<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
{events.length === 0
? "Create your first event to keep birthdays, anniversaries, and family gatherings organised."
: "Try a different search or category, or check your All Events tab."}
</p>

{events.length === 0 && (
<button
onClick={openNewEventForm}
className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
+ Create Your First Event
</button>
)}
</div>
) : (
<div className="space-y-4">
{filteredEvents.map((event) => (
<article
key={event.id}
className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 sm:p-5"
>
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
<div className="flex min-w-0 gap-4">
<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
{categoryIcon(event.category)}
</div>

<div className="min-w-0">
<h3 className="break-words text-lg font-bold">
{event.title}
</h3>

<p className="mt-1 text-sm font-medium text-emerald-800">
{event.category}
</p>

<div className="mt-3 space-y-2 text-sm text-slate-600">
<p>
📅{" "}
{event.nextOccurrence
? formatDate(event.nextOccurrence)
: `Original date: ${event.date}`}
</p>

<p>🕒 {formatTime(event.time)}</p>

{event.location && (
<p>📍 {event.location}</p>
)}

<p>🔁 {recurrenceLabel(event.recurrence)}</p>

{event.description && (
<p className="mt-3 whitespace-pre-wrap leading-6">
{event.description}
</p>
)}
</div>
</div>
</div>

<div className="flex shrink-0 gap-2 sm:flex-col">
<button
onClick={() => openEditEventForm(event)}
className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
>
Edit
</button>

<button
onClick={() => deleteEvent(event.id)}
className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
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

<footer className="mt-8 text-center text-sm text-slate-500">
<p>Legacy Family — preserving memories, one moment at a time. 🌳</p>
</footer>
</div>
</main>
);
}
