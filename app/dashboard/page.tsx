"use client";

import { useState } from "react";

const familyMembers = [
{
name: "Mama Grace",
role: "Great Grandmother",
year: "1938–2021",
emoji: "👵🏾",
story:
"She welcomed everyone into her home and made her kitchen a gathering place for the whole family.",
},
{
name: "Papa Daniel",
role: "Grandfather",
year: "1942–2018",
emoji: "👴🏿",
story:
"He believed every child should know where they came from and loved telling stories about the family.",
},
{
name: "Mama Ada",
role: "Mother",
year: "1970–",
emoji: "👩🏾",
story:
"She carried family traditions forward and made sure the next generation knew their history.",
},
{
name: "David",
role: "Present Generation",
year: "1999–",
emoji: "👨🏾",
story:
"A new generation carrying the memories, values and stories of those who came before.",
},
];

const stories = [
{
title: "The Woman Who Fed Everyone",
text: "There was always room at Mama Grace's table. Her home became a gathering place for the family.",
icon: "🍲",
},
{
title: "Where Our Family Began",
text: "Every family has a beginning. This is the story of the people and places that shaped ours.",
icon: "🌍",
},
{
title: "The Old Photograph",
text: "One photograph can hold generations of memories and remind us how quickly time moves.",
icon: "📷",
},
];

export default function DashboardPage() {
const [selectedMember, setSelectedMember] = useState(familyMembers[0]);
const [selectedStory, setSelectedStory] = useState<number | null>(null);

return (
<main className="min-h-screen bg-[#f7f4ee] text-[#29251f]">

{/* HEADER */}
<header className="border-b border-black/10 bg-[#f7f4ee]/90 px-6 py-5 backdrop-blur">
<div className="mx-auto flex max-w-7xl items-center justify-between">
<div>
<h1 className="text-2xl font-bold">Legacy Family</h1>
<p className="text-xs text-black/50">
Where every generation belongs.
</p>
</div>

<button className="rounded-full bg-[#29251f] px-5 py-2 text-sm text-white">
+ Add Memory
</button>
</div>
</header>

{/* HERO */}
<section className="px-6 py-20">
<div className="mx-auto max-w-7xl">

<p className="text-sm font-semibold uppercase tracking-[0.25em] text-black/40">
Your family's digital home
</p>

<h2 className="mt-4 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
Your story did not{" "}
<span className="italic text-black/50">begin with you.</span>
</h2>

<p className="mt-6 max-w-2xl text-lg leading-8 text-black/60">
Preserve the people, stories, memories and traditions that
connect your family from one generation to the next.
</p>

<button
onClick={() =>
document
.getElementById("family-tree")
?.scrollIntoView({ behavior: "smooth" })
}
className="mt-8 rounded-full bg-[#29251f] px-7 py-3 text-sm text-white transition hover:-translate-y-1"
>
Explore Family Tree
</button>

</div>
</section>

{/* FAMILY MEMBERS */}
<section className="px-6 pb-20">
<div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">

{familyMembers.map((member) => (
<button
key={member.name}
onClick={() => setSelectedMember(member)}
className={`rounded-3xl border p-6 text-left transition hover:-translate-y-2 ${
selectedMember.name === member.name
? "border-black/20 bg-white shadow-xl"
: "border-black/5 bg-white/50"
}`}
>
<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e9e1d5] text-4xl">
{member.emoji}
</div>

<p className="font-semibold">{member.name}</p>

<p className="mt-1 text-xs text-black/45">
{member.role}
</p>

<p className="mt-3 text-xs text-black/35">
{member.year}
</p>
</button>
))}

</div>
</section>

{/* FAMILY TREE */}
<section id="family-tree" className="bg-white px-6 py-20">
<div className="mx-auto max-w-7xl">

<p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/40">
Generations
</p>

<h3 className="mt-2 text-4xl font-bold">
The Family Tree
</h3>

<p className="mt-4 max-w-2xl text-black/50">
Every face represents a person. Every person has a story.
</p>

<div className="mt-10 rounded-[2rem] bg-[#29251f] p-8 text-white md:p-12">

<div className="mx-auto max-w-xs text-center">

<button
onClick={() => setSelectedMember(familyMembers[0])}
className="w-full rounded-3xl border border-white/10 bg-white/10 p-7 transition hover:bg-white/20"
>
<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-5xl">
👵🏾
</div>

<p className="mt-4 font-semibold">
Mama Grace
</p>

<p className="text-xs text-white/50">
Great Grandmother
</p>
</button>

</div>

<div className="mx-auto my-6 h-12 w-px bg-white/20" />

<div className="grid gap-4 md:grid-cols-3">

{familyMembers.slice(1).map((member) => (
<button
key={member.name}
onClick={() => setSelectedMember(member)}
className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center transition hover:-translate-y-2 hover:bg-white/20"
>
<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-4xl">
{member.emoji}
</div>

<p className="mt-4 font-semibold">
{member.name}
</p>

<p className="mt-1 text-xs text-white/50">
{member.role}
</p>
</button>
))}

</div>

</div>

{/* SELECTED MEMBER */}
<div className="mt-6 rounded-3xl bg-[#f7f4ee] p-7">

<div className="flex flex-col gap-5 md:flex-row md:items-center">

<div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#e7ded0] text-6xl">
{selectedMember.emoji}
</div>

<div>
<p className="text-xs uppercase tracking-widest text-black/40">
Family member
</p>

<h4 className="mt-1 text-2xl font-bold">
{selectedMember.name}
</h4>

<p className="text-sm text-black/45">
{selectedMember.role} · {selectedMember.year}
</p>

<p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">
{selectedMember.story}
</p>
</div>

</div>
</div>

</div>
</section>

{/* STORIES */}
<section className="px-6 py-20">
<div className="mx-auto max-w-7xl">

<p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/40">
Family Stories
</p>

<h3 className="mt-2 text-4xl font-bold">
Stories That Made Us
</h3>

<p className="mt-4 max-w-2xl text-black/50">
The most important part of a family tree isn't only the names.
It's the stories behind them.
</p>

<div className="mt-10 grid gap-6 md:grid-cols-3">

{stories.map((story, index) => (
<button
key={story.title}
onClick={() =>
setSelectedStory(
selectedStory === index ? null : index
)
}
className="overflow-hidden rounded-[2rem] border border-black/5 bg-white text-left shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
>

<div className="flex h-52 items-center justify-center bg-[#e9e1d5] text-8xl">
{story.icon}
</div>

<div className="p-7">

<h4 className="text-xl font-bold">
{story.title}
</h4>

<p className="mt-3 text-sm leading-6 text-black/55">
{story.text}
</p>

<p className="mt-6 text-sm font-semibold">
{selectedStory === index
? "Close story ↑"
: "Read story →"}
</p>

{selectedStory === index && (
<div className="mt-5 border-t border-black/10 pt-5 text-sm leading-7 text-black/60">
This space will eventually contain the complete
family story, photographs, dates and the family
member connected to the memory.
</div>
)}

</div>
</button>
))}

</div>

</div>
</section>

{/* MEMORY WALL */}
<section className="bg-[#e8e1d6] px-6 py-20">
<div className="mx-auto max-w-7xl">

<p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/40">
Memory Wall
</p>

<h3 className="mt-2 text-4xl font-bold">
Moments worth keeping.
</h3>

<div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">

<div className="flex h-64 items-center justify-center rounded-[2rem] bg-[#d2c5b2] text-7xl transition hover:scale-105">
📷
</div>

<div className="flex h-64 items-center justify-center rounded-[2rem] bg-[#d9cbb8] text-7xl transition hover:scale-105">
👨‍👩‍👧‍👦
</div>

<div className="flex h-64 items-center justify-center rounded-[2rem] bg-[#c8c4b7] text-7xl transition hover:scale-105">
🏡
</div>

<div className="flex h-64 items-center justify-center rounded-[2rem] bg-[#d6c6b5] text-7xl transition hover:scale-105">
❤️
</div>

</div>

</div>
</section>

{/* TIMELINE */}
<section className="px-6 py-20">
<div className="mx-auto max-w-5xl">

<div className="text-center">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/40">
Our Journey
</p>

<h3 className="mt-2 text-4xl font-bold">
A Story Across Time
</h3>
</div>

<div className="mt-12 space-y-6">

{[
["1938", "A new generation begins"],
["1970", "The family grows"],
["1999", "A new chapter"],
["2026", "Our story continues"],
].map(([year, title]) => (
<div
key={year}
className="rounded-3xl border border-black/5 bg-white p-7 shadow-sm"
>
<p className="text-sm font-bold text-black/40">
{year}
</p>

<h4 className="mt-2 text-xl font-bold">
{title}
</h4>
</div>
))}

</div>

</div>
</section>

{/* FOOTER */}
<footer className="bg-[#29251f] px-6 py-12 text-white">
<div className="mx-auto max-w-7xl">
<h4 className="text-xl font-bold">
Legacy Family
</h4>

<p className="mt-2 text-sm text-white/40">
Preserve the past. Connect the present. Inspire the future.
</p>
</div>
</footer>

</main>
);
}
