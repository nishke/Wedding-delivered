"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EventItem = { id:string; event_name:string; event_type:string|null; event_date:string; venue:string|null; expected_guest_count:number|null; status:string; customer_id:string|null };
type CustomerItem = { id:string; full_name:string };
const statusLabels:Record<string,string>={enquiry:"Enquiry",quotation_in_progress:"Quotation in progress",tentative:"Tentative",confirmed:"Confirmed",preparation:"Preparation",completed:"Completed",closed:"Closed",cancelled:"Cancelled"};

export default function EventsPage(){
 const router=useRouter();
 const [events,setEvents]=useState<EventItem[]>([]);
 const [customers,setCustomers]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [query,setQuery]=useState("");
 const [statusFilter,setStatusFilter]=useState("all");
 const filteredEvents=useMemo(()=>events.filter(item=>{
  const term=query.trim().toLocaleLowerCase();
  const matchesQuery=!term || [item.event_name,item.event_type,item.venue,customers[item.customer_id||""]].some(value=>value?.toLocaleLowerCase().includes(term));
  return matchesQuery && (statusFilter==="all" || item.status===statusFilter);
 }),[events,customers,query,statusFilter]);
 useEffect(()=>{const load=async()=>{
  const s=createClient();const {data:{user}}=await s.auth.getUser();
  if(!user){router.replace("/login");return;}
  const {data:membership,error:membershipError}=await s.from("caterer_memberships").select("caterer_id").eq("user_id",user.id).limit(1).maybeSingle();
  if(membershipError||!membership){router.replace("/setup");return;}
  const {data,error}=await s.from("events").select("id,event_name,event_type,event_date,venue,expected_guest_count,status,customer_id").eq("caterer_id",membership.caterer_id).order("event_date",{ascending:true});
  if(error){setMessage("Could not load events: "+error.message);setLoading(false);return;}
  const rows=(data||[]) as EventItem[];setEvents(rows);
  const ids=[...new Set(rows.map(x=>x.customer_id).filter((id):id is string=>Boolean(id)))];
  if(ids.length){const {data:customerRows}=await s.from("customers").select("id,full_name").eq("caterer_id",membership.caterer_id).in("id",ids);const names:Record<string,string>={};(customerRows||[]).forEach((x:CustomerItem)=>{names[x.id]=x.full_name;});setCustomers(names);}
  setLoading(false);
 };void load();},[router]);
 return <main className="auth-shell"><section className="auth-card event-card events-list-card">
  <Link className="back-link" href="/">← Workspace</Link><div className="eyebrow">WORKSPACE · EVENTS</div>
  <div className="events-title-row"><div><h1>Events.</h1><p>Every enquiry and booking, in one place.</p></div><Link className="primary-button events-create-link" href="/events/new">＋ Create event</Link></div>
  {loading?<p>Loading events…</p>:message?<p className="auth-message" role="alert">{message}</p>:events.length===0?<div className="events-empty"><h2>No events yet.</h2><p>Create your first event to start tracking the work.</p><Link className="primary-button" href="/events/new">Create an event</Link></div>:
   <>
    <div className="event-filters">
     <label><span>SEARCH EVENTS</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search event, customer or venue" /></label>
     <label><span>STATUS</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
    </div>
    {filteredEvents.length===0?<div className="events-empty"><h2>No matching events.</h2><p>Try another search or status.</p></div>:<div className="events-list">{filteredEvents.map(item=><Link className="event-list-row" href={"/events/"+item.id} key={item.id}>
     <div className="event-list-date">{new Date(item.event_date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div>
     <div className="event-list-main"><strong>{item.event_name}</strong><span>{customers[item.customer_id||""]||"Customer not linked"} · {item.event_type||"Event"}{item.venue?" · "+item.venue:""}</span></div>
     <div className="event-list-meta"><span className={"event-status status-"+item.status}>{statusLabels[item.status]||item.status}</span><small>{item.expected_guest_count??"—"} guests</small></div><span className="event-list-arrow">→</span>
    </Link>)}</div>}
   </>}
 </section></main>;
}
