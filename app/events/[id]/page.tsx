"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EventRow={id:string;event_name:string;event_type:string|null;event_date:string;venue:string|null;expected_guest_count:number|null;status:string;quoted_amount:number|null;customer_id:string|null;caterer_id:string};
type Activity={id:string;activity_type:string;description:string;created_at:string};

const statusLabels:Record<string,string>={enquiry:"Enquiry",quotation_in_progress:"Quotation in progress",tentative:"Tentative",confirmed:"Confirmed",preparation:"Preparation",completed:"Completed",closed:"Closed",cancelled:"Cancelled"};

export default function EventDetailPage(){
 const params=useParams<{id:string}>();const router=useRouter();
 const [event,setEvent]=useState<EventRow|null>(null);const [customer,setCustomer]=useState("");const [phone,setPhone]=useState("");
 const [status,setStatus]=useState("");const [activity,setActivity]=useState<Activity[]>([]);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 useEffect(()=>{const load=async()=>{
  const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/login");return;}
  const {data:membership}=await s.from("caterer_memberships").select("caterer_id").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership){router.replace("/setup");return;}
  const {data,error}=await s.from("events").select("id,event_name,event_type,event_date,venue,expected_guest_count,status,quoted_amount,customer_id,caterer_id").eq("id",params.id).eq("caterer_id",membership.caterer_id).single();
  if(error||!data){setMessage("Event not found or you do not have access.");return;}
  setEvent(data as EventRow);setStatus(data.status);
  if(data.customer_id){const {data:c}=await s.from("customers").select("full_name,phone").eq("id",data.customer_id).single();if(c){setCustomer(c.full_name);setPhone(c.phone||"");}}
  const {data:history}=await s.from("event_activity").select("id,activity_type,description,created_at").eq("event_id",data.id).eq("caterer_id",membership.caterer_id).order("created_at",{ascending:false});
  setActivity((history||[]) as Activity[]);
 };void load();},[params.id,router]);
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!event||status===event.status)return;
  setBusy(true);setMessage("");const s=createClient();const {data:{user}}=await s.auth.getUser();
  const previous=event.status;const {error}=await s.from("events").update({status}).eq("id",event.id).eq("caterer_id",event.caterer_id);
  if(error){setBusy(false);setMessage(error.message);return;}
  const description="Status changed from "+(statusLabels[previous]||previous)+" to "+(statusLabels[status]||status)+".";
  const {error:activityError}=await s.from("event_activity").insert({caterer_id:event.caterer_id,event_id:event.id,actor_id:user?.id,activity_type:"status_changed",description,metadata:{from:previous,to:status}});
  setBusy(false);setEvent({...event,status});
  if(activityError){setMessage("Event status saved, but the activity history could not be updated: "+activityError.message);return;}
  const {data:history}=await s.from("event_activity").select("id,activity_type,description,created_at").eq("event_id",event.id).eq("caterer_id",event.caterer_id).order("created_at",{ascending:false});
  setActivity((history||[]) as Activity[]);setMessage("Event status updated.");
 }
 if(!event)return <main className="auth-shell"><section className="auth-card"><Link className="back-link" href="/events">← Events</Link><h1>Event details</h1><p>{message||"Loading event…"}</p></section></main>;
 return <main className="auth-shell"><section className="auth-card event-card">
  <Link className="back-link" href="/events">← Events</Link><div className="eyebrow">EVENT RECORD</div><h1>{event.event_name}</h1>
  <p>{event.event_type||"Event"} · {new Date(event.event_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>
  <div className="event-facts"><div><span>CUSTOMER</span><strong>{customer||"—"}</strong><small>{phone}</small></div><div><span>EXPECTED GUESTS</span><strong>{event.expected_guest_count??"—"}</strong></div><div><span>QUOTED AMOUNT</span><strong>{event.quoted_amount==null?"—":new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(event.quoted_amount)}</strong></div><div><span>VENUE</span><strong>{event.venue||"—"}</strong></div></div>
  <form className="auth-form" onSubmit={save}><label>Event status<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><button className="primary-button" disabled={busy||status===event.status}>{busy?"Saving…":"Update event"}</button></form>
  {message&&<p className="auth-message" role="status">{message}</p>}
  <section className="activity-section"><div className="eyebrow">EVENT HISTORY</div><h2>Activity</h2>{activity.length===0?<p className="activity-empty">No activity recorded yet. Status changes will appear here.</p>:<div className="activity-list">{activity.map(item=><article className="activity-item" key={item.id}><span className="activity-dot"/><div><p>{item.description}</p><time>{new Date(item.created_at).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"})}</time></div></article>)}</div>}</section>
 </section></main>;
}
