"use client";

import {
useEffect,
useState,
type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

import Sidebar from "./components/sidebar";
import Topbar from "./components/topbar";

type Profile = {
fullName: string;
email: string;
avatarUrl: string;
};

export default function DashboardLayout({
children,
}: {
children: ReactNode;
}) {
const router = useRouter();

const [profile, setProfile] = useState<Profile>({
fullName: "",
email: "",
avatarUrl: "",
});

const [loading, setLoading] = useState(true);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [error, setError] = useState("");

useEffect(() => {
let mounted = true;

async function loadUser() {
try {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError) throw authError;

if (!mounted) return;

if (!user) {
router.replace("/login");
return;
}

const metadata = user.user_metadata ?? {};

const fullName =
metadata.full_name ||
metadata.name ||
user.email?.split("@")[0] ||
"My Account";

const avatarUrl =
typeof metadata.avatar_url === "string"
? metadata.avatar_url
: "";

setProfile({
fullName,
email: user.email ?? "",
avatarUrl,
});

} catch (err) {
console.error(
"Dashboard authentication error:",
err
);

if (mounted) {
setError(
"Unable to load your account. Please try again."
);
}
} finally {
if (mounted) {
setLoading(false);
}
}
}

void loadUser();

const {
data: { subscription },
} = supabase.auth.onAuthStateChange(
(event, session) => {
if (!mounted) return;

if (event === "SIGNED_OUT" || !session) {
router.replace("/login");
}
}
);

return () => {
mounted = false;
subscription.unsubscribe();
};
}, [router]);

async function handleSignOut() {
const confirmed = window.confirm(
"Are you sure you want to sign out of Legacy Family?"
);

if (!confirmed) return;

try {
setError("");

const { error: signOutError } =
await supabase.auth.signOut();

if (signOutError) {
throw signOutError;
}

router.replace("/login");
router.refresh();

} catch (err) {
console.error("Sign out error:", err);

setError(
err instanceof Error
? err.message
: "Unable to sign out. Please try again."
);
}
}

if (loading) {
return (
<div className="flex min-h-screen items-center justify-center bg-slate-50">
<div className="text-center">
<div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

<p className="text-sm font-medium text-slate-500">
Loading Legacy Family...
</p>
</div>
</div>
);
}

return (
<div className="flex min-h-screen bg-[#f8faf9] text-slate-900">

<Sidebar
mobileOpen={mobileMenuOpen}
onClose={() => setMobileMenuOpen(false)}
/>

<div className="flex min-h-screen min-w-0 flex-1 flex-col">

<Topbar
fullName={profile.fullName}
email={profile.email}
avatarUrl={profile.avatarUrl}
onMenuClick={() =>
setMobileMenuOpen(true)
}
onSignOut={handleSignOut}
/>

{error && (
<div
role="alert"
className="mx-4 mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mx-7 lg:mx-9"
>
<span>{error}</span>

<button
type="button"
onClick={() => setError("")}
className="font-semibold hover:text-red-900"
aria-label="Dismiss error"
>
✕
</button>
</div>
)}

<main className="min-w-0 flex-1">
{children}
</main>

</div>
</div>
);
}
