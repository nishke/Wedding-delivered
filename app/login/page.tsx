"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [mode,setMode] = useState<"login"|"signup">("login");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password});
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === "signup" && !result.data.session) { setMessage("Check your email to confirm your account, then sign in."); return; }
    router.push("/setup"); router.refresh();
  }
  return <main className="auth-shell"><section className="auth-card"><Link className="auth-brand" href="/">DHANDE’S <span>OPS</span></Link><div className="eyebrow">CATERING OPERATIONS</div><h1>{mode === "login" ? "Welcome back." : "Create your owner account."}</h1><p>Sign in to manage your events, customers and collections.</p><form onSubmit={submit} className="auth-form"><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} /></label><button className="primary-button" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in":"Create account"}</button></form>{message&&<p className="auth-message" role="status">{message}</p>}<button className="text-button" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("");}}>{mode==="login"?"New here? Create an owner account":"Already registered? Sign in"}</button></section></main>;
}
