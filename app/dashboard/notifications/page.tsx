"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
Bell,
ArrowLeft,
CheckCheck,
Loader2,
Inbox,
} from "lucide-react";

type NotificationItem = {
id: number;
type: string;
title: string;
message: string | null;
link: string | null;
is_read: boolean;
created_at: string;
};

export default function NotificationsPage() {
const [notifications, setNotifications] = useState<NotificationItem[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function loadNotifications() {
setLoading(true);
setError("");

try {
const { data: authData, error: authError } =
await supabase.auth.getUser();

if (authError || !authData.user) {
setError("Please sign in to view your notifications.");
return;
}

const { data, error: fetchError } = await supabase
.from("notifications")
.select("*")
.eq("user_id", authData.user.id)
.order("created_at", { ascending: false });

if (fetchError) {
throw fetchError;
}

setNotifications(data || []);
} catch (err) {
console.error("Notification error:", err);
setError(
err instanceof Error
? err.message
: "Unable to load notifications."
);
} finally {
setLoading(false);
}
}

async function markAsRead(id: number) {
const { error } = await supabase
.from("notifications")
.update({ is_read: true })
.eq("id", id);

if (error) {
setError(error.message);
return;
}

setNotifications((previous) =>
previous.map((item) =>
item.id === id
? { ...item, is_read: true }
: item
)
);
}

async function markAllAsRead() {
const unread = notifications.filter(
(item) => !item.is_read
);

if (unread.length === 0) return;

const { error } = await supabase
.from("notifications")
.update({ is_read: true })
.eq("is_read", false);

if (error) {
setError(error.message);
return;
}

setNotifications((previous) =>
previous.map((item) => ({
...item,
is_read: true,
}))
);
}

useEffect(() => {
loadNotifications();
}, []);

const unreadCount = notifications.filter(
(item) => !item.is_read
).length;

return (
<main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
<div className="mx-auto max-w-4xl">

<Link
href="/dashboard"
className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-700"
>
<ArrowLeft size={18} />
Back to Dashboard
</Link>

<div className="mb-8 flex items-center justify-between gap-4">
<div className="flex items-center gap-3">
<div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
<Bell size={25} />
</div>

<div>
<h1 className="text-2xl font-bold text-slate-900">
Notifications
</h1>

<p className="text-sm text-slate-500">
Your family updates and activities.
</p>
</div>
</div>

{unreadCount > 0 && (
<button
type="button"
onClick={markAllAsRead}
className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
>
<CheckCheck size={17} />
<span className="hidden sm:inline">
Mark all read
</span>
</button>
)}
</div>

<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

{loading ? (
<div className="flex flex-col items-center py-20 text-slate-500">
<Loader2
size={30}
className="mb-3 animate-spin text-emerald-600"
/>
Loading notifications...
</div>
) : error ? (
<div className="px-6 py-16 text-center">
<p className="text-sm text-red-600">{error}</p>

<button
type="button"
onClick={loadNotifications}
className="mt-4 rounded-xl bg-emerald-700 px-5 py-2 text-white"
>
Try again
</button>
</div>
) : notifications.length === 0 ? (
<div className="flex flex-col items-center px-6 py-20 text-center">
<Inbox
size={42}
className="mb-4 text-slate-300"
/>

<h2 className="text-lg font-bold text-slate-800">
You're all caught up!
</h2>

<p className="mt-2 text-sm text-slate-500">
Your family notifications will appear here.
</p>
</div>
) : (
<div className="divide-y divide-slate-100">
{notifications.map((item) => (
<div
key={item.id}
className={`flex gap-4 p-5 ${
!item.is_read ? "bg-emerald-50" : ""
}`}
>
<div className="h-fit rounded-xl bg-emerald-100 p-3 text-emerald-700">
<Bell size={20} />
</div>

<div className="min-w-0 flex-1">
<div className="flex flex-wrap items-center gap-2">
<h3 className="font-semibold text-slate-900">
{item.title}
</h3>

{!item.is_read && (
<span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
New
</span>
)}
</div>

{item.message && (
<p className="mt-2 text-sm text-slate-600">
{item.message}
</p>
)}

<p className="mt-2 text-xs text-slate-400">
{new Date(item.created_at).toLocaleString()}
</p>

<div className="mt-3 flex gap-4">
{item.link && (
<Link
href={item.link}
onClick={() => markAsRead(item.id)}
className="text-sm font-semibold text-emerald-700"
>
View details
</Link>
)}

{!item.is_read && (
<button
type="button"
onClick={() => markAsRead(item.id)}
className="text-sm text-slate-500 hover:text-emerald-700"
>
Mark as read
</button>
)}
</div>
</div>
</div>
))}
</div>
)}
</section>
</div>
</main>
);
}
