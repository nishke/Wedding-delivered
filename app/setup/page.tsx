"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupPage() {
 const router=useRouter(); const [name,setName]=useState("Dhande’s Millennium Catering"); const [phone,setPhone]=useState(""); const [address,setAddress]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
 useEffect(()=>{ const check=async()=>{const s=createClient();const {data}=await s.auth.getUser();if(!data.user){router.replace("/login");return;}const {data:existing}=await s.from("caterer_memberships").select("caterer_id").eq("user_id",data.user.id).limit(1).maybeSingle();if(existing)router.replace("/");};check();},[router]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage("");const s=createClient();const {data:{user},error:userError}=await s.auth.getUser();if(userError||!user){router.replace("/login");return;}const {error}=await s.rpc("create_caterer_workspace",{p_name:name,p_phone:phone||null,p_address:address||null});setBusy(false);if(error){setMessage(error.message);return;}router.push("/events/new");router.refresh();}
 return <main className="auth-shell"><section className="auth-card"><div className="eyebrow">FIRST-TIME SETUP</div><h1>Set up your business.</h1><p>This creates your private catering workspace. You can add more details later.</p><form className="auth-form" onSubmit={submit}><label>Business name<input required value={name} onChange={e=>setName(e.target.value)} /></label><label>Business phone <span className="optional">(optional)</span><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} /></label><label>Business address <span className="optional">(optional)</span><textarea rows={3} value={address} onChange={e=>setAddress(e.target.value)} /></label><button className="primary-button" disabled={busy}>{busy?"Saving workspace…":"Create workspace"}</button></form>{message&&<p className="auth-message" role="alert">{message}</p>}</section></main>;
}
