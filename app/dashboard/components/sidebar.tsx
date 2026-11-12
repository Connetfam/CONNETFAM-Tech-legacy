"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
Home,
UsersRound,
GitBranch,
BookOpen,
Image,
CalendarDays,
Mic,
Compass,
Settings,
X,
Leaf,
ChevronRight,
Users,
} from "lucide-react";

type SidebarProps = {
mobileOpen?: boolean;
onClose?: () => void;
};

const navigationGroups = [
{
title: "PERSONAL",
items: [
{
label: "Home",
href: "/dashboard",
icon: Home,
},
],
},
{
title: "MY FAMILY",
items: [
{
label: "Family Spaces",
href: "/dashboard",
icon: Users,
},
{
label: "Family Tree",
href: "/dashboard/family-tree",
icon: GitBranch,
},
{
label: "Family Members",
href: "/dashboard/family-members",
icon: UsersRound,
},
],
},
{
title: "FAMILY HERITAGE",
items: [
{
label: "Stories",
href: "/dashboard/stories",
icon: BookOpen,
},
{
label: "Memories",
href: "/dashboard/memories",
icon: Leaf,
},
{
label: "Photos & Videos",
href: "/dashboard/media",
icon: Image,
},
{
label: "Voice Archives",
href: "/dashboard/voice-messages",
icon: Mic,
},
],
},
{
title: "FAMILY ACTIVITIES",
items: [
{
label: "Calendar & Events",
href: "/dashboard/calendar",
icon: CalendarDays,
},
],
},
];

export default function Sidebar({
mobileOpen = false,
onClose,
}: SidebarProps) {
const pathname = usePathname();

function closeMobile() {
onClose?.();
}

return (
<>
{mobileOpen && (
<button
type="button"
aria-label="Close navigation"
onClick={closeMobile}
className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
/>
)}

<aside
className={`
fixed inset-y-0 left-0 z-50 flex w-[270px]
flex-col border-r border-slate-200 bg-white
transition-transform duration-300
lg:sticky lg:top-0 lg:z-30 lg:h-screen
lg:translate-x-0
${
mobileOpen
? "translate-x-0"
: "-translate-x-full lg:translate-x-0"
}
`}
>
<div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-6">
<Link
href="/dashboard"
onClick={closeMobile}
className="flex items-center gap-3"
>
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white">
<Leaf size={22} />
</div>

<div>
<h1 className="text-lg font-bold tracking-tight text-slate-900">
Legacy Family
</h1>

<p className="text-[10px] font-medium tracking-wide text-slate-400">
A PRODUCT BY CONNETFAM
</p>
</div>
</Link>

<button
type="button"
onClick={closeMobile}
aria-label="Close sidebar"
className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
>
<X size={19} />
</button>
</div>

<nav className="flex-1 overflow-y-auto px-4 py-6">
{navigationGroups.map((group) => (
<div key={group.title} className="mb-7">
<p className="mb-3 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-400">
{group.title}
</p>

<div className="space-y-1">
{group.items.map((item) => {
const Icon = item.icon;

const active =
item.href === "/dashboard"
? pathname === "/dashboard"
: pathname === item.href ||
pathname.startsWith(`${item.href}/`);

return (
<Link
key={item.label}
href={item.href}
onClick={closeMobile}
className={`
group flex items-center gap-3
rounded-xl px-3 py-3 text-[13px]
font-medium transition-all
${
active
? "bg-emerald-50 text-emerald-800"
: "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
}
`}
>
<Icon
size={18}
strokeWidth={active ? 2.3 : 1.8}
/>

<span className="flex-1">{item.label}</span>

{active && <ChevronRight size={15} />}
</Link>
);
})}
</div>
</div>
))}

<div className="mb-7">
<p className="mb-3 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-400">
SOCIAL
</p>

<div className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-slate-400">
<Compass size={18} />

<span className="flex-1">Discover</span>

<span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-semibold">
SOON
</span>
</div>
</div>
</nav>

<div className="border-t border-slate-100 p-4">
<Link
href="/dashboard/settings"
onClick={closeMobile}
className={`
flex items-center gap-3 rounded-xl px-3 py-3
text-sm font-medium transition
${
pathname.startsWith("/dashboard/settings")
? "bg-emerald-50 text-emerald-800"
: "text-slate-600 hover:bg-slate-50"
}
`}
>
<Settings size={18} />
Settings
</Link>

<p className="mt-4 px-3 text-[10px] text-slate-400">
© 2026 Legacy Family
</p>
</div>
</aside>
</>
);
}
