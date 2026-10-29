import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
const url = new URL(request.url);
const code = url.searchParams.get("code");
const next = url.searchParams.get("next");

const destination =
next && next.startsWith("/") && !next.startsWith("//")
? next
: "/dashboard";

if (!code) {
return NextResponse.redirect(
new URL("/login?error=missing_code", url.origin)
);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
return NextResponse.redirect(
new URL("/login?error=configuration", url.origin)
);
}

const response = NextResponse.redirect(
new URL(destination, url.origin)
);

const supabase = createServerClient(supabaseUrl, supabaseKey, {
cookies: {
getAll() {
return request.cookies.getAll();
},
setAll(cookiesToSet) {
cookiesToSet.forEach(({ name, value, options }) => {
response.cookies.set(name, value, options);
});
},
},
});

const { error } =
await supabase.auth.exchangeCodeForSession(code);

if (error) {
return NextResponse.redirect(
new URL("/login?error=verification_failed", url.origin)
);
}

return response;
}