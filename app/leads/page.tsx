"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Lead={id:string;contact_name:string|null;contact_phone:string|null;event_type:string|null;event_date:string|null;venue:string|null;expected_guest_count:number|null;source:string;status:string;review_status:string;message_text:string|null;created_at:string};
const reviewLabels:Record<string,string>={needs_review:"Needs review",reviewed:"Reviewed",converted:"Converted",dismissed:"Dismissed"};

export default function LeadsPage(){
 const router=useRouter();const [catererId,setCatererId]=useState("");const [leads,setLeads]=useState<Lead[]>([]);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [canConvert,setCanConvert]=useState(false);const [conversionDates,setConversionDates]=useState<Record<string,string>>({});
 const [query,setQuery]=useState("");const [showForm,setShowForm]=useState(false);
 const [name,setName]=useState("");const [phone,setPhone]=useState("");const [eventType,setEventType]=useState("Wedding");
 const [date,setDate]=useState("");const [venue,setVenue]=useState("");const [guests,setGuests]=useState("");
 const [source,setSource]=useState("whatsapp");const [details,setDetails]=useState("");
 async function load(){
  const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/login");return;}
  const {data:membership}=await s.from("caterer_memberships").select("caterer_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership){router.replace("/setup");return;}setCatererId(membership.caterer_id);setCanConvert(["owner","manager"].includes(membership.role));
  const {data,error}=await s.from("leads").select("id,contact_name,contact_phone,event_type,event_date,venue,expected_guest_count,source,status,review_status,message_text,created_at").eq("caterer_id",membership.caterer_id).order("created_at",{ascending:false});
  if(error)setMessage(error.message);else setLeads((data||[]) as Lead[]);setLoading(false);
 }
 useEffect(()=>{void load();},[router]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return leads.filter(l=>!q||[l.contact_name,l.contact_phone,l.event_type,l.venue,l.message_text].some(v=>v?.toLowerCase().includes(q)));},[leads,query]);
 async function createLead(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!catererId||!name.trim())return;setBusy(true);setMessage("");const s=createClient();
  const {error}=await s.from("leads").insert({caterer_id:catererId,contact_name:name.trim(),contact_phone:phone.trim()||null,event_type:eventType,event_date:date||null,venue:venue.trim()||null,expected_guest_count:guests?Number(guests):null,source,status:"new",review_status:"needs_review",message_text:details.trim()||null});
  setBusy(false);if(error){setMessage(error.message);return;}setName("");setPhone("");setDate("");setVenue("");setGuests("");setDetails("");setShowForm(false);setMessage("Enquiry captured.");await load();
 }
 async function convertLead(lead:Lead){
  const chosenDate=conversionDates[lead.id]||lead.event_date||null;
  if(!chosenDate){setMessage("Add an event date before converting this enquiry.");return;}
  setBusy(true);setMessage("");const s=createClient();
  const {data,error}=await s.rpc("convert_lead_to_event",{p_lead_id:lead.id,p_event_date:chosenDate});
  setBusy(false);if(error){setMessage(error.message);return;}
  router.push("/events/"+data);
 }
 async function setReview(id:string,value:string){
  const s=createClient();const {error}=await s.from("leads").update({review_status:value}).eq("id",id).eq("caterer_id",catererId);
  if(error){setMessage(error.message);return;}await load();
 }
 return <main className="auth-shell"><section className="auth-card event-card events-list-card">
  <Link className="back-link" href="/">← Workspace</Link><div className="eyebrow">WORKSPACE · ENQUIRY INBOX</div>
  <div className="events-title-row"><div><h1>Enquiries.</h1><p>Capture every incoming request before it gets lost.</p></div><button className="primary-button" type="button" onClick={()=>setShowForm(v=>!v)}>{showForm?"Close":"＋ Add enquiry"}</button></div>
  {showForm&&<section className="activity-section"><h2>New enquiry</h2><form className="auth-form" onSubmit={createLead}>
   <div className="form-pair"><label>Customer / contact name<input required value={name} onChange={e=>setName(e.target.value)} /></label><label>Phone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} /></label></div>
   <div className="form-pair"><label>Event type<select value={eventType} onChange={e=>setEventType(e.target.value)}>{["Wedding","Reception","Corporate","Birthday","Religious","Other"].map(v=><option key={v}>{v}</option>)}</select></label><label>Event date<input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label></div>
   <div className="form-pair"><label>Venue<input value={venue} onChange={e=>setVenue(e.target.value)} /></label><label>Expected guests<input type="number" min="1" value={guests} onChange={e=>setGuests(e.target.value)} /></label></div>
   <label>Received through<select value={source} onChange={e=>setSource(e.target.value)}><option value="whatsapp">WhatsApp</option><option value="phone">Phone call</option><option value="referral">Referral</option><option value="website">Website</option><option value="other">Other</option></select></label>
   <label>Enquiry details / original message<textarea rows={3} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Paste the customer's WhatsApp message or note the request" /></label>
   <button className="primary-button" disabled={busy}>{busy?"Saving…":"Save enquiry"}</button>
  </form></section>}
  <label className="customer-search"><span>SEARCH ENQUIRIES</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search contact, phone, event or venue" /></label>
  {loading?<p>Loading enquiries…</p>:filtered.length===0?<div className="events-empty"><h2>{leads.length?"No matching enquiries.":"No enquiries yet."}</h2><p>Capture a WhatsApp, phone or referral enquiry to get started.</p></div>:
   <div className="customer-directory">{filtered.map(lead=><article className="customer-directory-row" key={lead.id}>
    <div className="customer-avatar">{(lead.contact_name||"?").trim().charAt(0).toUpperCase()}</div>
    <div className="customer-directory-main"><strong>{lead.contact_name||"Unnamed contact"} · {lead.event_type||"Event"}</strong><span>{lead.contact_phone||"No phone"}{lead.event_date?" · "+new Date(lead.event_date+"T00:00:00").toLocaleDateString("en-IN"):""}{lead.venue?" · "+lead.venue:""}</span><small>{lead.expected_guest_count??"Guest count pending"} guests · {lead.source} · {reviewLabels[lead.review_status]||lead.review_status}</small>{lead.message_text&&<p>{lead.message_text}</p>}</div>
    <select aria-label={"Update review status for "+(lead.contact_name||"enquiry")} value={lead.review_status} onChange={e=>void setReview(lead.id,e.target.value)}><option value="needs_review">Needs review</option><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option></select>
    {canConvert&&lead.review_status!=="converted"&&lead.review_status!=="dismissed"&&<div className="lead-convert"><input aria-label="Event date for conversion" type="date" value={conversionDates[lead.id]??lead.event_date??""} onChange={e=>setConversionDates(p=>({...p,[lead.id]:e.target.value}))}/><button type="button" className="text-button" disabled={busy||!(conversionDates[lead.id]||lead.event_date)} onClick={()=>void convertLead(lead)}>Convert to event →</button></div>}
    {lead.review_status==="converted"&&<span className="tag green">Converted</span>}
   </article>)}</div>}
  {message&&<p className="auth-message" role="status">{message}</p>}
 </section></main>;
}
