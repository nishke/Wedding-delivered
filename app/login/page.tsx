"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
              },
            });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (mode === "signup" && !result.data.session) {
        setMessage(
          "This email may already have an account, or confirmation is pending. Switch to Sign in and use your existing password. If sign-in says the password is incorrect, use Forgot password."
        );
        return;
      }

      router.replace("/setup");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn't reach the authentication service. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="auth-brand" href="/">DHANDE’S <span>OPS</span></Link>
        <div className="eyebrow">CATERING OPERATIONS</div>
        <h1>{mode === "login" ? "Welcome back." : "Create your owner account."}</h1>
        <p>Sign in to manage your events, customers and collections.</p>
        <form onSubmit={submit} className="auth-form">
          <label>
            Email address
            <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button className="primary-button" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}
        >
          {mode === "login" ? "New here? Create an owner account" : "Already registered? Sign in"}
        </button>
      </section>
    </main>
  );
}
