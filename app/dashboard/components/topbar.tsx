"use client";

import { useState } from "react";
import Link from "next/link";
import {
Menu,
Bell,
ChevronDown,
UserRound,
Settings,
LogOut,
} from "lucide-react";

type TopbarProps = {
fullName: string;
email: string;
avatarUrl: string;
onMenuClick: () => void;
onSignOut: () => void;
};

export default function Topbar({
fullName,
email,
avatarUrl,
onMenuClick,
onSignOut,
}: TopbarProps) {
const [profileOpen, setProfileOpen] = useState(false);

const initials = fullName
? fullName
.split(" ")
.filter(Boolean)
.slice(0, 2)
.map((part) => part[0])
.join("")
.toUpperCase()
: "U";

return (
<header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-7 lg:px-9">

{/* LEFT */}
<div className="flex items-center gap-4">
<button
type="button"
onClick={onMenuClick}
aria-label="Open navigation menu"
className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
>
<Menu size={23} />
</button>

<div>
<p className="text-xs font-medium text-slate-400">
Welcome back
</p>

<h2 className="text-base font-bold text-slate-900 sm:text-lg">
{fullName || "Your Family Dashboard"}
</h2>
</div>
</div>

{/* RIGHT */}
<div className="flex items-center gap-3 sm:gap-5">

{/* NOTIFICATIONS */}
<Link
href="/dashboard/notifications"
aria-label="Open notifications"
title="Notifications"
className="relative rounded-xl p-2.5 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
>
<Bell size={20} />

<span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-600" />
</Link>

{/* PROFILE MENU */}
<div className="relative">
<button
type="button"
onClick={() => setProfileOpen(!profileOpen)}
aria-expanded={profileOpen}
aria-label="Open profile menu"
className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50 sm:gap-3"
>
<div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-emerald-100 text-sm font-bold text-emerald-800">
{avatarUrl ? (
<img
src={avatarUrl}
alt="Profile"
className="h-full w-full object-cover"
/>
) : (
initials
)}
</div>

<div className="hidden text-left sm:block">
<p className="max-w-36 truncate text-sm font-semibold text-slate-900">
{fullName || "My Account"}
</p>

<p className="max-w-36 truncate text-xs text-slate-500">
{email}
</p>
</div>

<ChevronDown
size={16}
className="hidden text-slate-400 sm:block"
/>
</button>

{profileOpen && (
<>
<button
type="button"
aria-label="Close profile menu"
className="fixed inset-0 z-40 cursor-default"
onClick={() => setProfileOpen(false)}
/>

<div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">

<div className="border-b border-slate-100 px-3 py-3">
<p className="truncate text-sm font-semibold text-slate-900">
{fullName || "My Account"}
</p>

<p className="mt-1 truncate text-xs text-slate-500">
{email}
</p>
</div>

<Link
href="/dashboard/settings"
onClick={() => setProfileOpen(false)}
className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-50"
>
<UserRound size={17} />
My Profile
</Link>

<Link
href="/dashboard/settings"
onClick={() => setProfileOpen(false)}
className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-50"
>
<Settings size={17} />
Account Settings
</Link>

<button
type="button"
onClick={() => {
setProfileOpen(false);
onSignOut();
}}
className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
>
<LogOut size={17} />
Sign Out
</button>

</div>
</>
)}
</div>
</div>
</header>
);
}
