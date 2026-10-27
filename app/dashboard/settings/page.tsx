"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type SettingsSection =
| "profile"
| "workspace"
| "family"
| "notifications"
| "privacy"
| "account";

type Preferences = {
emailNotifications: boolean;
familyUpdates: boolean;
birthdayReminders: boolean;
eventReminders: boolean;
storyUpdates: boolean;
privateProfile: boolean;
};

const defaultPreferences: Preferences = {
emailNotifications: true,
familyUpdates: true,
birthdayReminders: true,
eventReminders: true,
storyUpdates: true,
privateProfile: true,
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const sections: {
id: SettingsSection;
icon: string;
label: string;
description: string;
}[] = [
{
id: "profile",
icon: "👤",
label: "Profile",
description: "Your personal information",
},
{
id: "workspace",
icon: "🏡",
label: "Workspace",
description: "Your family workspace",
},
{
id: "family",
icon: "👨‍👩‍👧‍👦",
label: "Family Management",
description: "Membership and invitations",
},
{
id: "notifications",
icon: "🔔",
label: "Notifications",
description: "Your notification preferences",
},
{
id: "privacy",
icon: "🔒",
label: "Privacy & Security",
description: "Protect your family information",
},
{
id: "account",
icon: "⚙️",
label: "Account",
description: "Password and account access",
},
];

function Toggle({
checked,
onChange,
label,
description,
}: {
checked: boolean;
onChange: (value: boolean) => void;
label: string;
description: string;
}) {
return (
<div className="flex items-center justify-between gap-4 py-4">
<div>
<p className="font-medium text-slate-900">{label}</p>
<p className="mt-1 text-sm leading-5 text-slate-500">
{description}
</p>
</div>

<button
type="button"
role="switch"
aria-checked={checked}
aria-label={label}
onClick={() => onChange(!checked)}
className={`relative h-7 w-12 shrink-0 rounded-full transition ${
checked ? "bg-emerald-700" : "bg-slate-300"
}`}
>
<span
className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
checked ? "left-6" : "left-1"
}`}
/>
</button>
</div>
);
}

export default function SettingsPage() {
const [activeSection, setActiveSection] =
useState<SettingsSection>("profile");

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [uploadingAvatar, setUploadingAvatar] = useState(false);

const [message, setMessage] = useState("");
const [error, setError] = useState("");

const [userId, setUserId] = useState("");
const [email, setEmail] = useState("");
const [fullName, setFullName] = useState("");
const [avatarUrl, setAvatarUrl] = useState("");

const [workspaceName, setWorkspaceName] = useState("");
const [workspaceDescription, setWorkspaceDescription] = useState("");

const [preferences, setPreferences] =
useState<Preferences>(defaultPreferences);

const fileInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
let mounted = true;

async function loadSettings() {
try {
const { data, error: authError } =
await supabase.auth.getUser();

if (authError) throw authError;

if (!mounted) return;

const user = data.user;

if (user) {
setUserId(user.id);
setEmail(user.email ?? "");

const metadata = user.user_metadata ?? {};

const metadataName =
typeof metadata.full_name === "string"
? metadata.full_name
: typeof metadata.name === "string"
? metadata.name
: "";

setFullName(metadataName);

setAvatarUrl(
typeof metadata.avatar_url === "string"
? metadata.avatar_url
: ""
);
}

try {
const storedPreferences = localStorage.getItem(
"legacy-family-settings-preferences"
);

if (storedPreferences) {
setPreferences({
...defaultPreferences,
...JSON.parse(storedPreferences),
});
}

const storedWorkspace = localStorage.getItem(
"legacy-family-workspace-settings"
);

if (storedWorkspace) {
const workspace = JSON.parse(storedWorkspace);

setWorkspaceName(workspace.name ?? "");
setWorkspaceDescription(workspace.description ?? "");
}
} catch {
if (mounted) {
setError(
"Some locally saved settings could not be loaded."
);
}
}
} catch (err) {
console.error("Settings loading error:", err);

if (mounted) {
setError(
"We couldn't load your account details. Please refresh and try again."
);
}
} finally {
if (mounted) setLoading(false);
}
}

loadSettings();

return () => {
mounted = false;
};
}, []);

function updatePreference(
key: keyof Preferences,
value: boolean
) {
const updated = { ...preferences, [key]: value };

setPreferences(updated);

try {
localStorage.setItem(
"legacy-family-settings-preferences",
JSON.stringify(updated)
);

setMessage("Preference saved in this browser.");
setError("");
} catch {
setError("We couldn't save this preference in your browser.");
}
}

async function uploadProfilePicture(file?: File) {
setMessage("");
setError("");

if (!file) return;

if (!userId) {
setError("Please sign in before uploading a profile picture.");
return;
}

if (!ALLOWED_TYPES.includes(file.type)) {
setError("Choose a JPEG, PNG, or WebP image.");
return;
}

if (file.size > MAX_FILE_SIZE) {
setError("Your image must be 2 MB or smaller.");
return;
}

setUploadingAvatar(true);

try {
const extensionByType: Record<string, string> = {
"image/jpeg": "jpg",
"image/png": "png",
"image/webp": "webp",
};

const extension = extensionByType[file.type];

// Each user gets their own profile-picture path.
const filePath = `${userId}/avatar.${extension}`;

const { error: uploadError } = await supabase.storage
.from("avatars")
.upload(filePath, file, {
upsert: true,
contentType: file.type,
cacheControl: "3600",
});

if (uploadError) throw uploadError;

const { data: publicUrlData } = supabase.storage
.from("avatars")
.getPublicUrl(filePath);

const publicUrl = publicUrlData.publicUrl;

// Save the picture URL to the signed-in user's metadata.
const { error: updateError } = await supabase.auth.updateUser({
data: {
avatar_url: publicUrl,
},
});

if (updateError) throw updateError;

// Add a cache-busting value so the updated picture appears immediately.
setAvatarUrl(`${publicUrl}?t=${Date.now()}`);

setMessage("Your profile picture has been uploaded successfully.");
} catch (err) {
console.error("Profile picture upload error:", err);

setError(
err instanceof Error
? err.message
: "We couldn't upload your picture. Please try again."
);
} finally {
setUploadingAvatar(false);

if (fileInputRef.current) {
fileInputRef.current.value = "";
}
}
}

async function saveProfile(e: FormEvent<HTMLFormElement>) {
e.preventDefault();

setSaving(true);
setMessage("");
setError("");

try {
if (!userId) {
throw new Error("Please sign in before updating your profile.");
}

const { error: updateError } = await supabase.auth.updateUser({
data: {
full_name: fullName.trim(),
},
});

if (updateError) throw updateError;

setMessage("Your profile name has been updated.");
} catch (err) {
setError(
err instanceof Error
? err.message
: "We couldn't update your profile."
);
} finally {
setSaving(false);
}
}

function saveWorkspace(e: FormEvent<HTMLFormElement>) {
e.preventDefault();

setMessage("");
setError("");

try {
localStorage.setItem(
"legacy-family-workspace-settings",
JSON.stringify({
name: workspaceName.trim(),
description: workspaceDescription.trim(),
})
);

setMessage(
"Workspace settings saved in this browser. These fields are not yet connected to your Supabase family database."
);
} catch {
setError("We couldn't save your workspace settings.");
}
}

async function changePassword() {
setMessage("");
setError("");

if (!email) {
setError("We couldn't find your account email.");
return;
}

setSaving(true);

try {
const { error: resetError } =
await supabase.auth.resetPasswordForEmail(email, {
redirectTo: `${window.location.origin}/reset-password`,
});

if (resetError) throw resetError;

setMessage(
"If your email is registered, a password reset link will be sent. Follow the link to choose a new password."
);
} catch (err) {
setError(
err instanceof Error
? err.message
: "We couldn't request a password reset."
);
} finally {
setSaving(false);
}
}

async function signOut() {
const confirmed = window.confirm(
"Are you sure you want to sign out of Legacy Family?"
);

if (!confirmed) return;

setSaving(true);
setError("");

try {
const { error: signOutError } =
await supabase.auth.signOut();

if (signOutError) throw signOutError;

window.location.href = "/login";
} catch (err) {
setError(
err instanceof Error
? err.message
: "We couldn't sign you out."
);

setSaving(false);
}
}

function renderProfile() {
return (
<form onSubmit={saveProfile} className="space-y-6">
<div>
<h2 className="text-xl font-bold">Profile Settings</h2>
<p className="mt-1 text-sm text-slate-500">
Manage your personal information and profile picture.
</p>
</div>

<div className="flex flex-col gap-5 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center">
<div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-emerald-100 text-4xl">
{avatarUrl ? (
<img
src={avatarUrl}
alt="Your profile"
className="h-full w-full object-cover"
/>
) : (
<span aria-label="Default profile picture">👤</span>
)}
</div>

<div className="min-w-0 flex-1">
<p className="font-semibold">
{fullName || "Your profile"}
</p>

<p className="mt-1 break-all text-sm text-slate-500">
{email || "Email unavailable"}
</p>

<input
ref={fileInputRef}
type="file"
accept="image/jpeg,image/png,image/webp"
className="hidden"
aria-label="Choose a profile picture"
onChange={(e) => {
const file = e.target.files?.[0];
void uploadProfilePicture(file);
}}
/>

<button
type="button"
onClick={() => fileInputRef.current?.click()}
disabled={uploadingAvatar || loading || !userId}
className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{uploadingAvatar
? "Uploading picture..."
: avatarUrl
? "Change profile picture"
: "Upload profile picture"}
</button>

<p className="mt-2 text-xs leading-5 text-slate-500">
JPEG, PNG, or WebP. Maximum file size: 2 MB.
</p>
</div>
</div>

<div>
<label
htmlFor="fullName"
className="mb-2 block text-sm font-semibold"
>
Full name
</label>

<input
id="fullName"
value={fullName}
onChange={(e) => setFullName(e.target.value)}
placeholder="Enter your full name"
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="profileEmail"
className="mb-2 block text-sm font-semibold"
>
Email address
</label>

<input
id="profileEmail"
value={email}
readOnly
className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
/>

<p className="mt-2 text-xs text-slate-500">
Your email is managed by your authentication account.
</p>
</div>

<button
type="submit"
disabled={saving || loading || !userId}
className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
>
{saving ? "Saving..." : "Save Profile"}
</button>
</form>
);
}

function renderWorkspace() {
return (
<form onSubmit={saveWorkspace} className="space-y-6">
<div>
<h2 className="text-xl font-bold">Workspace Settings</h2>
<p className="mt-1 text-sm text-slate-500">
Personalise the space where your family preserves its history.
</p>
</div>

<div>
<label
htmlFor="workspaceName"
className="mb-2 block text-sm font-semibold"
>
Workspace name
</label>

<input
id="workspaceName"
value={workspaceName}
onChange={(e) => setWorkspaceName(e.target.value)}
placeholder="e.g. The Onyekwere Family"
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div>
<label
htmlFor="workspaceDescription"
className="mb-2 block text-sm font-semibold"
>
Family description
</label>

<textarea
id="workspaceDescription"
rows={4}
value={workspaceDescription}
onChange={(e) => setWorkspaceDescription(e.target.value)}
placeholder="Tell your family what this space is for..."
className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
/>
</div>

<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
These workspace fields are saved locally for now. They will
not rename the actual family record until connected to your
Supabase family database.
</div>

<button
type="submit"
className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
>
Save Workspace Settings
</button>
</form>
);
}

function renderFamily() {
return (
<div className="space-y-6">
<div>
<h2 className="text-xl font-bold">Family Management</h2>
<p className="mt-1 text-sm text-slate-500">
Manage access to your family workspace.
</p>
</div>

<div className="rounded-2xl border border-slate-200 p-5">
<div className="flex items-start gap-4">
<div className="text-3xl">🌳</div>

<div className="flex-1">
<h3 className="font-semibold">Family Members</h3>
<p className="mt-1 text-sm leading-6 text-slate-500">
View family members, maintain family relationships,
and manage your family records.
</p>

<Link
href="/dashboard/family-members"
className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
>
Open Family Members →
</Link>
</div>
</div>
</div>

<div className="rounded-2xl border border-slate-200 p-5">
<div className="flex items-start gap-4">
<div className="text-3xl">✉️</div>

<div className="flex-1">
<h3 className="font-semibold">Invite Family Members</h3>
<p className="mt-1 text-sm leading-6 text-slate-500">
Invitations require a secure backend workflow before
they can be sent.
</p>

<button
type="button"
disabled
className="mt-4 cursor-not-allowed rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
>
Invitations — coming soon
</button>
</div>
</div>
</div>

<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
Membership roles, invitations, and removing members must be
enforced by Supabase policies and server-side checks.
</div>
</div>
);
}

function renderNotifications() {
return (
<div>
<h2 className="text-xl font-bold">Notification Preferences</h2>

<p className="mt-1 text-sm text-slate-500">
Choose the types of updates you want to enable.
</p>

<div className="mt-6 divide-y divide-slate-200">
<Toggle
label="Email notifications"
description="General updates sent to your email."
checked={preferences.emailNotifications}
onChange={(value) =>
updatePreference("emailNotifications", value)
}
/>

<Toggle
label="Family updates"
description="Updates about activity in your family workspace."
checked={preferences.familyUpdates}
onChange={(value) =>
updatePreference("familyUpdates", value)
}
/>

<Toggle
label="Birthday reminders"
description="Preferences for reminders about family birthdays."
checked={preferences.birthdayReminders}
onChange={(value) =>
updatePreference("birthdayReminders", value)
}
/>

<Toggle
label="Event reminders"
description="Preferences for family meetings and gatherings."
checked={preferences.eventReminders}
onChange={(value) =>
updatePreference("eventReminders", value)
}
/>

<Toggle
label="Story and memory updates"
description="Updates when family stories or memories are added."
checked={preferences.storyUpdates}
onChange={(value) =>
updatePreference("storyUpdates", value)
}
/>
</div>

<p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
These switches save preferences in this browser. Actual emails,
scheduled reminders, and push notifications still need to be
implemented.
</p>
</div>
);
}

function renderPrivacy() {
return (
<div className="space-y-6">
<div>
<h2 className="text-xl font-bold">Privacy & Security</h2>
<p className="mt-1 text-sm text-slate-500">
Help protect your personal information and family memories.
</p>
</div>

<div className="rounded-2xl border border-slate-200 p-5">
<h3 className="font-semibold">Private profile preference</h3>

<Toggle
label="Prefer a private profile"
description="Save your preference for a private profile."
checked={preferences.privateProfile}
onChange={(value) =>
updatePreference("privateProfile", value)
}
/>

<p className="text-sm leading-6 text-amber-800">
This preference does not enforce access restrictions. Real
privacy must be enforced by authentication, database policies,
and storage permissions.
</p>
</div>

<div className="rounded-2xl border border-slate-200 p-5">
<div className="flex items-start gap-4">
<div className="text-2xl">🔑</div>

<div className="flex-1">
<h3 className="font-semibold">Change your password</h3>

<p className="mt-1 text-sm leading-6 text-slate-500">
Request a secure password reset link for your account.
</p>

<button
type="button"
onClick={changePassword}
disabled={saving || !email}
className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
>
{saving ? "Please wait..." : "Send Password Reset Link"}
</button>
</div>
</div>
</div>

<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
Do not store sensitive medical details or private family records
in browser-only settings. Those records need appropriate
database access policies and secure storage.
</div>
</div>
);
}

function renderAccount() {
return (
<div className="space-y-6">
<div>
<h2 className="text-xl font-bold">Account Settings</h2>
<p className="mt-1 text-sm text-slate-500">
Manage your sign-in and account access.
</p>
</div>

<div className="rounded-2xl border border-slate-200 p-5">
<h3 className="font-semibold">Signed-in account</h3>

<p className="mt-2 break-all text-sm text-slate-600">
{email || "No signed-in email detected"}
</p>

<p className="mt-2 text-xs text-slate-500">
Account ID: {userId || "Unavailable"}
</p>
</div>

<div className="rounded-2xl border border-slate-200 p-5">
<h3 className="font-semibold">Password</h3>

<p className="mt-1 text-sm leading-6 text-slate-500">
Use email verification to request a password reset.
</p>

<button
type="button"
onClick={changePassword}
disabled={saving || !email}
className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
>
Request Password Reset
</button>
</div>

<div className="rounded-2xl border border-red-200 p-5">
<h3 className="font-semibold text-red-800">Sign out</h3>

<p className="mt-1 text-sm leading-6 text-slate-500">
Sign out of your current Legacy Family account on this session.
</p>

<button
type="button"
onClick={signOut}
disabled={saving}
className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
>
{saving ? "Please wait..." : "Sign Out"}
</button>
</div>

<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
Permanent account deletion is not enabled here. Before adding
it, we need a secure deletion workflow that handles family
ownership, stored media, and account data appropriately.
</div>
</div>
);
}

function renderActiveSection() {
switch (activeSection) {
case "profile":
return renderProfile();
case "workspace":
return renderWorkspace();
case "family":
return renderFamily();
case "notifications":
return renderNotifications();
case "privacy":
return renderPrivacy();
case "account":
return renderAccount();
default:
return renderProfile();
}
}

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
<p className="text-slate-600">Loading your settings...</p>
</main>
);
}

return (
<main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
<div className="mx-auto max-w-7xl">
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
Settings ⚙️
</h1>

<p className="mt-3 max-w-2xl leading-7 text-slate-600">
Personalise your workspace, manage preferences, and control
your account.
</p>
</header>

{(message || error) && (
<div
role={error ? "alert" : "status"}
className={`mb-6 rounded-xl border p-4 text-sm ${
error
? "border-red-200 bg-red-50 text-red-800"
: "border-emerald-200 bg-emerald-50 text-emerald-900"
}`}
>
{error || message}
</div>
)}

<div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
<aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
<div className="px-3 py-3">
<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
Settings Menu
</p>
</div>

<nav className="space-y-1" aria-label="Settings sections">
{sections.map((section) => (
<button
key={section.id}
type="button"
onClick={() => {
setActiveSection(section.id);
setMessage("");
setError("");
}}
aria-current={
activeSection === section.id ? "page" : undefined
}
className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
activeSection === section.id
? "bg-emerald-50 text-emerald-900"
: "text-slate-600 hover:bg-slate-50"
}`}
>
<span className="text-xl">{section.icon}</span>

<span className="min-w-0 flex-1">
<span className="block text-sm font-semibold">
{section.label}
</span>

<span className="mt-1 block text-xs leading-5 text-slate-500">
{section.description}
</span>
</span>
</button>
))}
</nav>
</aside>

<section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
{renderActiveSection()}
</section>
</div>

<footer className="mt-8 text-center text-sm text-slate-500">
Legacy Family — your family, your stories, your legacy. 🌳
</footer>
</div>
</main>
);
}