"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Quote={id:string;revision:number;pricing_model:string;guest_count:number|null;subtotal:number;discount_type:string;discount_value:number;discount_amount:number;concession_reason:string|null;gst_applicable:boolean;gst_rate:number;gst_inclusive:boolean;gst_amount:number;total_amount:number;status:string;created_at:string};
type Line={description:string;quantity:string;unit:string;unit_price:string};
type FunctionRow={id:string;function_name:string;function_date:string};
type MenuRow={item_name:string;quantity:number|null;serving_unit:string;unit_price:number|null};
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n);
const emptyLine=():Line=>({description:"",quantity:"1",unit:"unit",unit_price:"0"});

export default function EventQuotationsPage(){
 const params=useParams<{id:string}>();const router=useRouter();
 const [catererId,setCatererId]=useState("");const [role,setRole]=useState("");
 const [eventName,setEventName]=useState("");const [eventGuests,setEventGuests]=useState<number|null>(null);
 const [quotes,setQuotes]=useState<Quote[]>([]);const [selected,setSelected]=useState("");
 const [lines,setLines]=useState<Line[]>([emptyLine()]);
 const [functions,setFunctions]=useState<FunctionRow[]>([]);const [functionId,setFunctionId]=useState("");
 const [pricing,setPricing]=useState("fixed");const [guestCount,setGuestCount]=useState("");
 const [gstOn,setGstOn]=useState(false);const [gstRate,setGstRate]=useState("5");const [gstInclusive,setGstInclusive]=useState(false);
 const [discountType,setDiscountType]=useState("none");const [discountValue,setDiscountValue]=useState("0");const [concessionReason,setConcessionReason]=useState("");
 const [customerNotes,setCustomerNotes]=useState("");const [internalNotes,setInternalNotes]=useState("");
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const [draftReady,setDraftReady]=useState(false);const [draftState,setDraftState]=useState<"saved"|"saving"|"error"|"">("");
 const canManage=["owner","manager"].includes(role);
 const latestQuote=quotes[0];
 const canStartNewRevision=quotes.length===0||latestQuote?.status==="rejected";
 const lineSubtotal=useMemo(()=>lines.reduce((s,l)=>s+Math.max(0,Number(l.quantity)||0)*Math.max(0,Number(l.unit_price)||0),0),[lines]);
 const effectiveGuests=pricing==="per_plate"?Number(guestCount||eventGuests||0):1;
 const subtotal=lineSubtotal*effectiveGuests;
 const discountInput=Math.max(0,Number(discountValue)||0);
 const discountAmount=discountType==="percentage"?subtotal*Math.min(discountInput,100)/100:discountType==="fixed"?Math.min(discountInput,subtotal):0;
 const discountedSubtotal=Math.max(0,subtotal-discountAmount);
 const rate=Math.max(0,Math.min(100,Number(gstRate)||0));
 const gstAmount=!gstOn?0:gstInclusive?discountedSubtotal*rate/(100+rate):discountedSubtotal*rate/100;
 const total=!gstOn||gstInclusive?discountedSubtotal:discountedSubtotal+gstAmount;
 async function load(){
  const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/login");return;}
  const {data:m}=await s.from("caterer_memberships").select("caterer_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!m){router.replace("/setup");return;}setCatererId(m.caterer_id);setRole(m.role);
  const [{data:event},{data:q},{data:fn}]=await Promise.all([
   s.from("events").select("id,event_name,expected_guest_count,final_guest_count").eq("id",params.id).eq("caterer_id",m.caterer_id).maybeSingle(),
   s.from("event_quotations").select("id,revision,pricing_model,guest_count,subtotal,discount_type,discount_value,discount_amount,concession_reason,gst_applicable,gst_rate,gst_inclusive,gst_amount,total_amount,status,created_at").eq("event_id",params.id).eq("caterer_id",m.caterer_id).order("revision",{ascending:false}),
   s.from("event_functions").select("id,function_name,function_date").eq("booking_id",params.id).eq("caterer_id",m.caterer_id).order("sort_order")
  ]);
  if(!event){setMessage("Event not found or access denied.");setLoading(false);return;}
  setEventName(event.event_name);setEventGuests(event.final_guest_count??event.expected_guest_count??null);
  setQuotes((q||[]) as Quote[]);setFunctions((fn||[]) as FunctionRow[]);
  const {data:draftRow}=await s.from("event_form_drafts").select("payload").eq("event_id",params.id).eq("user_id",user.id).eq("draft_key","quotation-workbench").maybeSingle();
  if(draftRow?.payload&&typeof draftRow.payload==="object"){
   const d=draftRow.payload as Record<string,unknown>;
   if(Array.isArray(d.lines))setLines(d.lines.filter((x:any)=>x&&typeof x==="object").map((x:any)=>({description:String(x.description??""),quantity:String(x.quantity??"1"),unit:String(x.unit??"unit"),unit_price:String(x.unit_price??"0")})));
   if(typeof d.functionId==="string")setFunctionId(d.functionId);
   if(typeof d.pricing==="string")setPricing(d.pricing);
   if(typeof d.guestCount==="string")setGuestCount(d.guestCount);
   if(typeof d.gstOn==="boolean")setGstOn(d.gstOn);
   if(typeof d.gstRate==="string")setGstRate(d.gstRate);
   if(typeof d.gstInclusive==="boolean")setGstInclusive(d.gstInclusive);
   if(typeof d.discountType==="string")setDiscountType(d.discountType);
   if(typeof d.discountValue==="string")setDiscountValue(d.discountValue);
   if(typeof d.concessionReason==="string")setConcessionReason(d.concessionReason);
   if(typeof d.customerNotes==="string")setCustomerNotes(d.customerNotes);
   if(typeof d.internalNotes==="string")setInternalNotes(d.internalNotes);
   if(typeof d.selected==="string")setSelected(d.selected);
   setMessage("Recovered your unsaved quotation draft.");
  }
  setDraftReady(true);
  setLoading(false);
 }
 useEffect(()=>{void load();},[params.id,router]);
 useEffect(()=>{
  if(!draftReady||!canManage||!catererId)return;
  setDraftState("saving");
  const timer=window.setTimeout(async()=>{
   const s=createClient();const {data:{user}}=await s.auth.getUser();
   if(!user){setDraftState("error");return;}
   const payload={lines,pricing,guestCount,functionId,gstOn,gstRate,gstInclusive,discountType,discountValue,concessionReason,customerNotes,internalNotes,selected};
   const {error}=await s.from("event_form_drafts").upsert({caterer_id:catererId,event_id:params.id,user_id:user.id,draft_key:"quotation-workbench",payload,updated_at:new Date().toISOString()},{onConflict:"event_id,user_id,draft_key"});
   setDraftState(error?"error":"saved");
  },850);
  return()=>window.clearTimeout(timer);
 },[draftReady,canManage,catererId,params.id,lines,pricing,guestCount,functionId,gstOn,gstRate,gstInclusive,discountType,discountValue,concessionReason,customerNotes,internalNotes,selected]);
 function updateLine(index:number,key:keyof Line,value:string){
  setLines(prev=>prev.map((l,i)=>i===index?{...l,[key]:value}:l));
 }
 async function importMenu(){
  if(!functionId){setMessage("Choose a function first.");return;}
  const s=createClient();const {data,error}=await s.from("event_menu_items").select("item_name,quantity,serving_unit,unit_price").eq("event_function_id",functionId).eq("caterer_id",catererId).order("sort_order");
  if(error){setMessage(error.message);return;}
  if(!data?.length){setMessage("No menu items found for this function.");return;}
  setLines(data.map((x:MenuRow)=>({description:x.item_name,quantity:String(x.quantity??1),unit:x.serving_unit,unit_price:String(x.unit_price??0)})));
  setMessage(data.length+" menu items imported. Review quantities and prices before saving.");
 }
 async function saveQuote(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!canManage)return;
  const valid=lines.filter(l=>l.description.trim()&&l.quantity.trim()!==""&&l.unit_price.trim()!==""&&Number.isFinite(Number(l.quantity))&&Number(l.quantity)>=0&&Number.isFinite(Number(l.unit_price))&&Number(l.unit_price)>=0);
  if(!valid.length){setMessage("Add at least one valid quotation line.");return;}
  if(pricing==="per_plate"&&(!Number.isFinite(effectiveGuests)||effectiveGuests<1)){setMessage("Enter a guest count for per-plate pricing.");return;}
  if(gstOn&&(!Number.isFinite(Number(gstRate))||Number(gstRate)<0||Number(gstRate)>100)){setMessage("GST rate must be between 0 and 100.");return;}
  if(discountType==="percentage"&&(!Number.isFinite(discountInput)||discountInput<0||discountInput>100)){setMessage("Percentage discount must be between 0 and 100.");return;}
  if(discountType==="fixed"&&(!Number.isFinite(discountInput)||discountInput<0||discountInput>subtotal)){setMessage("Fixed discount cannot exceed the quotation subtotal.");return;}
  setBusy(true);setMessage("");const s=createClient();
  const nextRevision=(quotes.reduce((max,q)=>Math.max(max,q.revision),0)||0)+1;
  const {data:{user}}=await s.auth.getUser();
  const {data:quote,error}=await s.from("event_quotations").insert({
   caterer_id:catererId,event_id:params.id,revision:nextRevision,pricing_model:pricing,
   guest_count:pricing==="per_plate"?(guestCount?Number(guestCount):eventGuests):null,
   subtotal,discount_type:discountType,discount_value:discountType==="none"?0:discountInput,discount_amount:discountAmount,concession_reason:concessionReason.trim()||null,
   gst_applicable:gstOn,gst_rate:gstOn?rate:0,gst_inclusive:gstOn?gstInclusive:false,
   gst_amount:gstAmount,total_amount:total,status:"draft",
   customer_notes:customerNotes.trim()||null,internal_notes:internalNotes.trim()||null,created_by:user?.id
  }).select("id").single();
  if(error||!quote){setBusy(false);setMessage(error?.message||"Could not create quotation.");return;}
  const {error:itemError}=await s.from("event_quotation_items").insert(valid.map((l,i)=>({caterer_id:catererId,quotation_id:quote.id,description:l.description.trim(),quantity:Number(l.quantity),unit:l.unit.trim()||"unit",unit_price:Number(l.unit_price),sort_order:i})));
  setBusy(false);
  if(itemError){setMessage("Quotation draft saved, but line items could not be saved: "+itemError.message);return;}
  setMessage("Quotation revision "+nextRevision+" saved as draft.");
  setLines([emptyLine()]);setPricing("fixed");setGuestCount("");setFunctionId("");setGstOn(false);setGstRate("5");setGstInclusive(false);setDiscountType("none");setDiscountValue("0");setConcessionReason("");setCustomerNotes("");setInternalNotes("");setSelected("");
  const {data:{user:currentUser}}=await s.auth.getUser();
  if(currentUser)await s.from("event_form_drafts").delete().eq("event_id",params.id).eq("user_id",currentUser.id).eq("draft_key","quotation-workbench");
  setDraftState("saved");await load();
 }
 async function openQuote(q:Quote){
  const s=createClient();const {data,error}=await s.from("event_quotation_items").select("description,quantity,unit,unit_price").eq("quotation_id",q.id).eq("caterer_id",catererId).order("sort_order");
  if(error){setMessage(error.message);return;}
  setSelected(q.id);setLines((data||[]).map((x:any)=>({description:x.description,quantity:String(x.quantity),unit:x.unit,unit_price:String(x.unit_price)})));
  setPricing(q.pricing_model);setGuestCount(q.guest_count===null?"":String(q.guest_count));setGstOn(q.gst_applicable);setGstRate(String(q.gst_rate));setGstInclusive(q.gst_inclusive);setDiscountType(q.discount_type||"none");setDiscountValue(String(q.discount_value??0));setConcessionReason(q.concession_reason||"");
 }
 return <main className="auth-shell"><section className="auth-card event-card events-list-card">
  <Link className="back-link" href={"/events/"+params.id}>← Event details</Link><div className="eyebrow">EVENT FINANCE · QUOTATIONS</div>
  <div className="events-title-row"><div><h1>Quotations.</h1><p>{eventName} · Create clear, revision-controlled estimates for your customer.</p></div></div>
  {message&&<p className="auth-message" role="status">{message}</p>}
  {loading?<p>Loading quotations…</p>:<>
   <section className="activity-section"><h2>Previous revisions</h2>
    {quotes.length===0?<p className="activity-empty">No quotations created yet.</p>:<div className="activity-list">{quotes.map(q=><article className="activity-item" key={q.id}><span className="activity-dot"/><div><p><strong>Revision {q.revision}</strong> · {q.status.toUpperCase()}</p><time>{new Date(q.created_at).toLocaleDateString("en-IN")} · {money(Number(q.total_amount))}{q.discount_amount>0?" · Discount "+money(Number(q.discount_amount)):""}{q.gst_applicable?" · GST "+q.gst_rate+"%":" · No GST applied"}</time></div><button type="button" className="text-button" onClick={()=>void openQuote(q)}>View</button><Link className="text-button" href={"/events/"+params.id+"/quotations/"+q.id}>Print / PDF →</Link></article>)}</div>}
   </section>
   {canManage&&<>{!canStartNewRevision&&<section className="activity-section quote-revision-locked"><h2>New quotation locked</h2><p>{latestQuote?.status==="sent"?"The current quotation is still awaiting the customer’s response. Use its concession field for the first negotiation, or mark it rejected before starting another quotation.":latestQuote?.status==="accepted"?"A quotation has already been accepted. This event’s commercial offer is closed.":"The current quotation must be manually marked rejected before another revision can be created."}</p><button type="button" className="quote-secondary-button" disabled>＋ Create new quotation</button></section>}{canStartNewRevision&&<form className="auth-form activity-section" onSubmit={saveQuote}>
    <h2>Create new revision</h2>
    <p className="draft-indicator" aria-live="polite">{draftState==="saving"?"Saving your quotation progress…":draftState==="saved"?"Draft saved · You can safely return later":draftState==="error"?"Draft could not sync · Keep this page open and retry":" "}</p>
    <p className="activity-empty">Each save creates a new draft revision; earlier versions remain unchanged.</p>
    <label>Pricing model<select value={pricing} onChange={e=>setPricing(e.target.value)}><option value="fixed">Fixed event amount</option><option value="per_plate">Per plate</option></select></label>
    {pricing==="per_plate"&&<label>Guest count<input type="number" min="1" value={guestCount} onChange={e=>setGuestCount(e.target.value)} placeholder={eventGuests?String(eventGuests):"Enter guest count"} /></label>}
    <div className="events-title-row"><h2>Quotation items</h2><button type="button" className="text-button" onClick={()=>setLines(p=>[...p,emptyLine()])}>＋ Add line</button></div>
    {functions.length>0&&<div className="form-pair"><label>Import event menu<select value={functionId} onChange={e=>setFunctionId(e.target.value)}><option value="">Choose function</option>{functions.map(f=><option key={f.id} value={f.id}>{f.function_name}</option>)}</select></label><button type="button" className="text-button" onClick={()=>void importMenu()}>Import menu items</button></div>}
    {lines.map((l,i)=><div className="activity-section" key={i}>
     <label>Item description<input value={l.description} onChange={e=>updateLine(i,"description",e.target.value)} placeholder="Food, service, equipment, etc." /></label>
     <div className="form-pair"><label>Quantity<input type="text" inputMode="decimal" value={l.quantity} onChange={e=>updateLine(i,"quantity",e.target.value)} /></label><label>Unit<input value={l.unit} onChange={e=>updateLine(i,"unit",e.target.value)} /></label></div>
     <label>Unit price (₹)<input type="text" inputMode="decimal" value={l.unit_price} onChange={e=>updateLine(i,"unit_price",e.target.value)} /></label>
     <p className="activity-empty">Line total: {money((Number(l.quantity)||0)*(Number(l.unit_price)||0))}</p>
     {lines.length>1&&<button type="button" className="text-button" onClick={()=>setLines(p=>p.filter((_,j)=>j!==i))}>Remove line</button>}
    </div>)}
    <section className="activity-section"><h2>Discount / concession</h2>
     <label>Discount type<select value={discountType} onChange={e=>setDiscountType(e.target.value)}><option value="none">No discount</option><option value="percentage">Percentage discount</option><option value="fixed">Fixed amount discount</option></select></label>
     {discountType!=="none"&&<><label>{discountType==="percentage"?"Discount (%)":"Discount amount (₹)"}<input type="number" min="0" step="0.01" max={discountType==="percentage"?"100":undefined} value={discountValue} onChange={e=>setDiscountValue(e.target.value)}/></label><label>Internal concession reason (not shown to customer)<select value={concessionReason} onChange={e=>setConcessionReason(e.target.value)}><option value="">Select reason</option><option>Repeat customer</option><option>Friend / family / acquaintance</option><option>Negotiated price</option><option>Menu adjustment</option><option>Strategic concession</option><option>Other</option></select></label></>}
    </section>
    <section className="activity-section"><h2>Tax treatment</h2>
     <label className="checkbox-row"><input type="checkbox" checked={gstOn} onChange={e=>setGstOn(e.target.checked)} /> Apply GST to this quotation</label>
     {gstOn&&<><div className="form-pair"><label>GST rate (%)<input type="number" min="0" max="100" step="0.01" value={gstRate} onChange={e=>setGstRate(e.target.value)} /></label><label>Price treatment<select value={gstInclusive?"inclusive":"exclusive"} onChange={e=>setGstInclusive(e.target.value==="inclusive")}><option value="exclusive">GST added on top</option><option value="inclusive">GST included in listed prices</option></select></label></div><p className="activity-empty">Tax treatment must reflect the business's applicable GST obligations, not the payment method.</p></>}
    </section>
    <label>Customer-facing notes<textarea rows={2} value={customerNotes} onChange={e=>setCustomerNotes(e.target.value)} /></label>
    <label>Internal notes (not for customer)<textarea rows={2} value={internalNotes} onChange={e=>setInternalNotes(e.target.value)} /></label>
    <section className="activity-section"><h2>Quotation summary</h2>{pricing==="per_plate"&&<p>Per-plate rate: {money(lineSubtotal)} × {effectiveGuests} guests</p>}<p>Subtotal: {money(subtotal)}</p>{discountAmount>0&&<p>Discount: −{money(discountAmount)}</p>}<p>Amount after discount: {money(discountedSubtotal)}</p>{gstOn&&<p>GST ({rate}% {gstInclusive?"included":"extra"}): {money(gstAmount)}</p>}<h2>Total: {money(total)}</h2></section>
    <button className="primary-button" disabled={busy}>{busy?"Saving…":"Save quotation draft"}</button>
   </form>}</>}
   {selected&&<section className="activity-section"><h2>Viewing saved revision</h2><p className="activity-empty">Saved line items are loaded into the editor above for reference. Saving again creates a new revision.</p><button className="text-button" type="button" onClick={()=>setSelected("")}>Close view</button></section>}
  </>}
 </section></main>;
}
