import Link from "next/link";

export default function Home() {
return (
<main className="min-h-screen bg-white flex items-center justify-center px-6">
<div className="w-full max-w-2xl text-center">
<p className="text-sm font-semibold tracking-[0.3em] text-gray-500 uppercase">
Legacy Family
</p>

<h1 className="mt-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
Your family&apos;s story.
<br />
Preserved for generations.
</h1>

<p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
Keep your family&apos;s stories, memories, photos, and important
moments together — across generations.
</p>

<div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
<Link
href="/signup"
className="rounded-xl bg-gray-900 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-gray-700"
>
Create an account
</Link>

<Link
href="/login"
className="rounded-xl border border-gray-300 px-7 py-3.5 text-base font-semibold text-gray-900 transition hover:bg-gray-50"
>
Log in
</Link>
</div>

<p className="mt-10 text-sm text-gray-500">
A private space for the people and memories that matter most.
</p>
</div>
</main>
);
}