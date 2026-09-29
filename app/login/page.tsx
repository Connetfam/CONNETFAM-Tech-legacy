'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [message, setMessage] = useState('')
const [loading, setLoading] = useState(false)

async function handleLogin(e: React.FormEvent) {
e.preventDefault()
setLoading(true)
setMessage('')

const { error } = await supabase.auth.signInWithPassword({
email,
password,
})

if (error) {
setMessage(error.message)
} else {
setMessage('Login successful. Welcome to Legacy Family.')
}

setLoading(false)
}

return (
<main className="min-h-screen flex items-center justify-center px-6">
<div className="w-full max-w-md">
<h1 className="text-3xl font-bold mb-2">
Welcome back to Legacy Family
</h1>

<p className="text-gray-600 mb-8">
Log in to continue preserving your family&apos;s story.
</p>

<form onSubmit={handleLogin} className="space-y-5">
<div>
<label className="block mb-2 font-medium">
Email
</label>

<input
type="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
required
className="w-full border rounded-lg px-4 py-3"
placeholder="you@example.com"
/>
</div>

<div>
<label className="block mb-2 font-medium">
Password
</label>

<input
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
required
className="w-full border rounded-lg px-4 py-3"
placeholder="Your password"
/>
</div>

<button
type="submit"
disabled={loading}
className="w-full rounded-lg px-4 py-3 font-semibold bg-black text-white"
>
{loading ? 'Logging in...' : 'Log in'}
</button>

{message && (
<p className="text-sm mt-4">
{message}
</p>
)}
</form>
</div>
</main>
)
}