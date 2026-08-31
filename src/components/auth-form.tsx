"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter(); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode === "signup" ? "signup" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const result = await response.json(); setPending(false);
    if (!response.ok) return setError(result.error ?? "Something went wrong.");
    router.push("/dashboard"); router.refresh();
  }
  const isSignup = mode === "signup";
  return <form onSubmit={submit} className="glass red-glow w-full max-w-md rounded-3xl p-7 sm:p-9">
    <div className="mb-8"><p className="mb-3 text-[11px] font-bold tracking-[.22em] text-[#ef233c] uppercase">Tradify access</p><h1 className="font-display text-3xl font-semibold tracking-tight">{isSignup ? "Start researching smarter." : "Welcome back."}</h1><p className="mt-3 text-sm leading-6 text-zinc-400">{isSignup ? "Create a local account to save conversations and continue your market research." : "Your research history is waiting for you."}</p></div>
    <label className="mb-4 block text-sm text-zinc-300">Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-[#ef233c]" /></label>
    <label className="mb-2 block text-sm text-zinc-300">Password<input name="password" type="password" required minLength={isSignup ? 8 : 1} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 8 characters" : "Your password"} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-[#ef233c]" /></label>
    {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    <button disabled={pending} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ef233c] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <>{isSignup ? "Create account" : "Log in"}<ArrowRight className="h-4 w-4" /></>}</button>
    <p className="mt-6 text-center text-sm text-zinc-500">{isSignup ? "Already have an account?" : "New to Tradify?"} <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-white hover:text-[#ef233c]">{isSignup ? "Log in" : "Create one"}</Link></p>
  </form>;
}
