"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EventRow = {
  id: string; event_name: string; event_type: string | null; event_date: string;
  venue: string | null; expected_guest_count: number | null; final_guest_count: number | null; status: string;
  quoted_amount: number | null; agreed_amount: number; advance_percentage: number; agreed_advance_amount: number; date_locked: boolean; booking_approval_status: string; customer_id: string | null; caterer_id: string;
};
type Activity = { id: string; activity_type: string; description: string; created_at: string };
type FunctionRow = { id:string; function_name:string; function_date:string; venue:string|null; expected_guest_count:number|null; menu_notes:string|null };
type ExpenseRow = {id:string;expense_type:string;amount:number;expense_date:string;expense_status:string;vendor_name:string|null;notes:string|null};
const statusLabels: Record<string,string> = {
  enquiry:"Enquiry", quotation_in_progress:"Quotation in progress", tentative:"Tentative",
  confirmed:"Confirmed", preparation:"Preparation", completed:"Completed", closed:"Closed", cancelled:"Cancelled"
};
const money = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);

export default function EventDetailPage() {
  const params = useParams<{id:string}>();
  const router = useRouter();
  const [event,setEvent] = useState<EventRow|null>(null);
  const [canManageBooking,setCanManageBooking] = useState(false);
  const [customer,setCustomer] = useState("");
  const [phone,setPhone] = useState("");
  const [name,setName] = useState("");
  const [type,setType] = useState("Other");
  const [date,setDate] = useState("");
  const [venue,setVenue] = useState("");
  const [guests,setGuests] = useState("");
  const [amount,setAmount] = useState("");
  const [agreedAmount,setAgreedAmount] = useState("");
  const [advancePercentage,setAdvancePercentage] = useState("20");
  const [dateLocked,setDateLocked] = useState(false);
  const [approvalStatus,setApprovalStatus] = useState("pending");
  const [status,setStatus] = useState("enquiry");
  const [activity,setActivity] = useState<Activity[]>([]);
  const [functions,setFunctions] = useState<FunctionRow[]>([]);
  const [expenses,setExpenses] = useState<ExpenseRow[]>([]);
  const [expenseAmount,setExpenseAmount] = useState("");
  const [expenseType,setExpenseType] = useState("ingredients");
  const [expenseStatus,setExpenseStatus] = useState("actual");
  const [expenseDate,setExpenseDate] = useState(new Date().toISOString().slice(0,10));
  const [expenseVendor,setExpenseVendor] = useState("");
  const [expenseNotes,setExpenseNotes] = useState("");
  const [functionName,setFunctionName] = useState("");
  const [functionDate,setFunctionDate] = useState("");
  const [functionVenue,setFunctionVenue] = useState("");
  const [functionGuests,setFunctionGuests] = useState("");
  const [functionMenu,setFunctionMenu] = useState("");
  const [cancellationReason,setCancellationReason] = useState(""); 
  const [finalGuests,setFinalGuests] = useState(""); 
  const [leftoversNotes,setLeftoversNotes] = useState(""); 
  const [wastageNotes,setWastageNotes] = useState(""); 
  const [closureNotes,setClosureNotes] = useState(""); 
  const [closeout,setCloseout] = useState<any>(null); 
  const [allocatedReceipts,setAllocatedReceipts] = useState(0); 
  const [actualExpenseTotal,setActualExpenseTotal] = useState(0);
  const [staffMembers,setStaffMembers] = useState<{user_id:string;full_name:string|null}[]>([]);
  const [assignedStaff,setAssignedStaff] = useState<{user_id:string;full_name:string|null}[]>([]);
  const [staffToAssign,setStaffToAssign] = useState("");
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");
  const [draftReady,setDraftReady] = useState(false);
  const [draftState,setDraftState] = useState<"saved"|"saving"|"error"|"">("");

  async function loadEvent() {
    const s = createClient();
    const {data:{user}} = await s.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const {data:membership} = await s.from("caterer_memberships").select("caterer_id,role").eq("user_id",user.id).limit(1).maybeSingle();
    if (!membership) { router.replace("/setup"); return; }
    setCanManageBooking(["owner","manager"].includes(membership.role));
    const {data,error} = await s.from("events")
      .select("id,event_name,event_type,event_date,venue,expected_guest_count,final_guest_count,status,quoted_amount,agreed_amount,advance_percentage,agreed_advance_amount,date_locked,booking_approval_status,customer_id,caterer_id")
      .eq("id",params.id).eq("caterer_id",membership.caterer_id).single();
    if (error || !data) { setMessage("Event not found or you do not have access."); setLoading(false); return; }
    const row = data as EventRow;
    setEvent(row); setName(row.event_name); setType(row.event_type || "Other"); setDate(row.event_date);
    setVenue(row.venue || ""); setGuests(row.expected_guest_count == null ? "" : String(row.expected_guest_count)); setFinalGuests(row.final_guest_count==null?"":String(row.final_guest_count));
    setAmount(row.quoted_amount == null ? "" : String(row.quoted_amount)); setAgreedAmount(String(row.agreed_amount ?? "")); setAdvancePercentage(String(row.advance_percentage ?? 20)); setDateLocked(Boolean(row.date_locked)); setApprovalStatus(row.booking_approval_status || "pending"); setStatus(row.status);
    if (row.customer_id) {
      const {data:c} = await s.from("customers").select("full_name,phone").eq("id",row.customer_id).single();
      if (c) { setCustomer(c.full_name); setPhone(c.phone || ""); }
    }
    const {data:history} = await s.from("event_activity").select("id,activity_type,description,created_at")
      .eq("event_id",row.id).eq("caterer_id",membership.caterer_id).order("created_at",{ascending:false});
    setActivity((history || []) as Activity[]);
    const {data:functionRows}=await s.from("event_functions").select("id,function_name,function_date,venue,expected_guest_count,menu_notes").eq("booking_id",row.id).eq("caterer_id",membership.caterer_id).order("sort_order",{ascending:true}).order("function_date",{ascending:true});
    setFunctions((functionRows||[]) as FunctionRow[]);
    if(["owner","manager"].includes(membership.role)){const {data:expenseRows}=await s.from("event_expenses").select("id,expense_type,amount,expense_date,expense_status,vendor_name,notes").eq("event_id",row.id).eq("caterer_id",membership.caterer_id).order("expense_date",{ascending:false});setExpenses((expenseRows||[]) as ExpenseRow[]);}
    if(["owner","manager"].includes(membership.role)){
      const [{data:staffRows},{data:assignmentRows}]=await Promise.all([
       s.from("caterer_memberships").select("user_id").eq("caterer_id",membership.caterer_id).eq("role","staff"),
       s.from("event_assignments").select("user_id").eq("event_id",row.id).eq("caterer_id",membership.caterer_id)
      ]);
      const staffIds=[...new Set([...(staffRows||[]).map((x:any)=>x.user_id),...(assignmentRows||[]).map((x:any)=>x.user_id)])];
      const {data:profileRows}=staffIds.length?await s.from("profiles").select("id,full_name").in("id",staffIds):{data:[] as any[]};
      const names=new Map((profileRows||[]).map((p:any)=>[p.id,p.full_name]));
      setStaffMembers((staffRows||[]).map((x:any)=>({user_id:x.user_id,full_name:names.get(x.user_id)||null})));
      setAssignedStaff((assignmentRows||[]).map((x:any)=>({user_id:x.user_id,full_name:names.get(x.user_id)||null})));
    }
    if(["owner","manager"].includes(membership.role)){
      const [{data:receiptRows},{data:closeoutRow}]=await Promise.all([
       s.from("customer_payments").select("amount").eq("booking_id",row.id).eq("caterer_id",membership.caterer_id),
       s.from("event_closeouts").select("id,leftovers_notes,wastage_notes,closure_notes,closed_at").eq("event_id",row.id).eq("caterer_id",membership.caterer_id).maybeSingle()
      ]);
      setAllocatedReceipts((receiptRows||[]).reduce((sum,p)=>sum+Number(p.amount||0),0));
      const {data:actualRows}=await s.from("event_expenses").select("amount").eq("event_id",row.id).eq("caterer_id",membership.caterer_id).eq("expense_status","actual");
      setActualExpenseTotal((actualRows||[]).reduce((sum:number,p:{amount:number})=>sum+Number(p.amount||0),0));
      setCloseout(closeoutRow||null);
      if(closeoutRow){setLeftoversNotes(closeoutRow.leftovers_notes||"");setWastageNotes(closeoutRow.wastage_notes||"");setClosureNotes(closeoutRow.closure_notes||"");}
    }
    const {data:draftRow} = await s.from("event_form_drafts").select("payload").eq("event_id",row.id).eq("user_id",user.id).eq("draft_key","event-detail").maybeSingle();
    if(draftRow?.payload && typeof draftRow.payload==="object"){
      const d=draftRow.payload as Record<string,unknown>;
      if(typeof d.name==="string")setName(d.name);
      if(typeof d.type==="string")setType(d.type);
      if(typeof d.date==="string")setDate(d.date);
      if(typeof d.venue==="string")setVenue(d.venue);
      if(typeof d.guests==="string")setGuests(d.guests);
      if(typeof d.amount==="string")setAmount(d.amount);
      if(typeof d.agreedAmount==="string")setAgreedAmount(d.agreedAmount);
      if(typeof d.advancePercentage==="string")setAdvancePercentage(d.advancePercentage);
      if(typeof d.dateLocked==="boolean")setDateLocked(d.dateLocked);
      if(typeof d.status==="string")setStatus(d.status);
      if(typeof d.expenseAmount==="string")setExpenseAmount(d.expenseAmount);
      if(typeof d.expenseType==="string")setExpenseType(d.expenseType);
      if(typeof d.expenseStatus==="string")setExpenseStatus(d.expenseStatus);
      if(typeof d.expenseDate==="string")setExpenseDate(d.expenseDate);
      if(typeof d.expenseVendor==="string")setExpenseVendor(d.expenseVendor);
      if(typeof d.expenseNotes==="string")setExpenseNotes(d.expenseNotes);
      if(typeof d.functionName==="string")setFunctionName(d.functionName);
      if(typeof d.functionDate==="string")setFunctionDate(d.functionDate);
      if(typeof d.functionVenue==="string")setFunctionVenue(d.functionVenue);
      if(typeof d.functionGuests==="string")setFunctionGuests(d.functionGuests);
      if(typeof d.functionMenu==="string")setFunctionMenu(d.functionMenu);
      if(typeof d.cancellationReason==="string")setCancellationReason(d.cancellationReason);
      if(typeof d.finalGuests==="string")setFinalGuests(d.finalGuests);
      if(typeof d.leftoversNotes==="string")setLeftoversNotes(d.leftoversNotes);
      if(typeof d.wastageNotes==="string")setWastageNotes(d.wastageNotes);
      if(typeof d.closureNotes==="string")setClosureNotes(d.closureNotes);
      setMessage("Recovered your unsaved changes from the last session.");
    }
    setDraftReady(true);
    setLoading(false);
  }

  useEffect(() => { void loadEvent(); }, [params.id,router]);

  useEffect(() => {
    if(!draftReady || !event) return;
    setDraftState("saving");
    const timer=window.setTimeout(async()=>{
      const s=createClient();
      const {data:{user}}=await s.auth.getUser();
      if(!user){setDraftState("error");return;}
      const payload={name,type,date,venue,guests,amount,agreedAmount,advancePercentage,dateLocked,status,expenseAmount,expenseType,expenseStatus,expenseDate,expenseVendor,expenseNotes,functionName,functionDate,functionVenue,functionGuests,functionMenu,cancellationReason,finalGuests,leftoversNotes,wastageNotes,closureNotes};
      const {error}=await s.from("event_form_drafts").upsert({caterer_id:event.caterer_id,event_id:event.id,user_id:user.id,draft_key:"event-detail",payload,updated_at:new Date().toISOString()},{onConflict:"event_id,user_id,draft_key"});
      setDraftState(error?"error":"saved");
    },900);
    return ()=>window.clearTimeout(timer);
  },[draftReady,event,name,type,date,venue,guests,amount,agreedAmount,advancePercentage,dateLocked,status,expenseAmount,expenseType,expenseStatus,expenseDate,expenseVendor,expenseNotes,functionName,functionDate,functionVenue,functionGuests,functionMenu,cancellationReason,finalGuests,leftoversNotes,wastageNotes,closureNotes]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event) return;
    const guestCount = Number(guests);
    const quotedAmount = amount.trim() === "" ? 0 : Number(amount);
    if (!name.trim() || !date || !Number.isInteger(guestCount) || guestCount < 1 || !Number.isFinite(quotedAmount) || quotedAmount < 0) {
      setMessage("Check the event name, date, guest count and quoted amount.");
      return;
    }
    setBusy(true); setMessage("");
    const s = createClient();
    const {data:{user}} = await s.auth.getUser();
    const changes = {
      event_name:name.trim(), event_type:type, event_date:date, venue:venue.trim() || null,
      expected_guest_count:guestCount, quoted_amount:quotedAmount, agreed_amount:agreedAmount.trim()===""?0:Number(agreedAmount), advance_percentage:Number(advancePercentage), date_locked:dateLocked, status
    };
    const {error} = await s.from("events").update(changes).eq("id",event.id).eq("caterer_id",event.caterer_id);
    if (error) { setBusy(false); setMessage(error.message); return; }
    const changedFields = Object.entries(changes).filter(([key,value]) => {
      const old = (event as unknown as Record<string,unknown>)[key];
      return String(old ?? "") !== String(value ?? "");
    }).map(([key]) => key.replaceAll("_"," "));
    if (changedFields.length) {
      const {error:activityError} = await s.from("event_activity").insert({
        caterer_id:event.caterer_id,event_id:event.id,actor_id:user?.id,
        activity_type:"event_updated",description:"Updated event details: "+changedFields.join(", ")+".",
        metadata:{changed_fields:changedFields}
      });
      if (activityError) setMessage("Event saved, but its activity history could not be updated: "+activityError.message);
      else setMessage("Event details saved.");
    } else setMessage("No changes to save.");
    setEvent({...event,...changes});
    const {data:history} = await s.from("event_activity").select("id,activity_type,description,created_at")
      .eq("event_id",event.id).eq("caterer_id",event.caterer_id).order("created_at",{ascending:false});
    setActivity((history || []) as Activity[]);
    setBusy(false);
  }

  if (loading || !event) return <main className="auth-shell"><section className="auth-card"><Link className="back-link" href="/events">← Events</Link><h1>Event details</h1><p>{message || "Loading event…"}</p></section></main>;

  return <main className="auth-shell"><section className="auth-card event-card">
    <Link className="back-link" href="/events">← Events</Link>
    <div className="events-title-row"><Link className="text-button" href={"/events/"+event.id+"/menu"}>Plan menu →</Link>{canManageBooking&&<Link className="text-button" href={"/events/"+event.id+"/quotations"}>Create quotation →</Link>}</div>
    <div className="eyebrow">EVENT RECORD · EDIT</div><h1>{event.event_name}</h1><p className="draft-indicator" aria-live="polite">{draftState==="saving"?"Saving your progress…":draftState==="saved"?"Draft saved · You can safely return later":draftState==="error"?"Draft could not sync · Keep this page open and retry":" "}</p>
    <p>{customer || "Customer not linked"}{phone ? " · "+phone : ""}</p>
    <div className="event-facts">
      <div><span>CUSTOMER</span><strong>{customer || "—"}</strong><small>{phone}</small></div>
      <div><span>EXPECTED GUESTS</span><strong>{event.expected_guest_count ?? "—"}</strong></div>
      {canManageBooking&&<div><span>QUOTED AMOUNT</span><strong>{money(event.quoted_amount)}</strong></div>}
      <div><span>VENUE</span><strong>{event.venue || "—"}</strong></div>
    </div>
    <details className="event-accordion" name="event-sections" open><summary>Event details <span className="accordion-chevron">⌄</span></summary><div className="accordion-content"><form className="auth-form" onSubmit={save}>
      <label>Event name<input required value={name} onChange={e=>setName(e.target.value)} /></label>
      <div className="form-pair">
        <label>Event type<select value={type} onChange={e=>setType(e.target.value)}>{["Wedding","Reception","Corporate","Birthday","Religious","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Event date<input type="date" required value={date} onChange={e=>setDate(e.target.value)} /></label>
      </div>
      <label>Venue<input value={venue} onChange={e=>setVenue(e.target.value)} /></label>
      <div className="form-pair">
        <label>Expected guests<input type="number" min="1" step="1" required value={guests} onChange={e=>setGuests(e.target.value)} /></label>
        {canManageBooking&&<label>Quoted amount (₹)<input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} /></label>}
      </div>
      {canManageBooking&&<><div className="form-pair"><label>Agreed booking amount (₹)<input type="number" min="0" step="0.01" value={agreedAmount} onChange={e=>setAgreedAmount(e.target.value)} /></label><label>Advance percentage<input type="number" min="0" max="100" step="0.01" value={advancePercentage} onChange={e=>setAdvancePercentage(e.target.value)} /></label></div>
      {canManageBooking&&<label className="inline-check"><input type="checkbox" checked={dateLocked} onChange={e=>setDateLocked(e.target.checked)} /> Booking date is locked</label>}
      <p className="activity-empty">Required advance: {money(Math.round((Number(agreedAmount||0)*Number(advancePercentage||0)/100)*100)/100)} (default 20%)</p></>}
      <label>Event status<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statusLabels).filter(([value])=>canManageBooking?!["cancelled"].includes(value):["enquiry","quotation_in_progress","tentative","preparation","completed"].includes(value)).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save event changes"}</button>
    </form></div></details>
    {message && <p className="auth-message" role="status">{message}</p>}
    {canManageBooking&&<details className="event-accordion" name="event-sections"><summary>Workforce · Assigned staff<span className="accordion-chevron">⌄</span></summary><div className="accordion-content">
      {assignedStaff.length===0?<p className="activity-empty">No staff assigned to this event yet.</p>:<div className="activity-list">{assignedStaff.map(person=><article className="activity-item" key={person.user_id}><span className="activity-dot"/><div><p><strong>{person.full_name||"Staff member"}</strong></p><time>{person.user_id.slice(0,8)}</time></div><button type="button" className="text-button" disabled={busy} onClick={async()=>{setBusy(true);const {error}=await createClient().from("event_assignments").delete().eq("event_id",event.id).eq("user_id",person.user_id);setBusy(false);if(error){setMessage(error.message);return;}await loadEvent();}}>Remove</button></article>)}</div>}
      {staffMembers.filter(x=>!assignedStaff.some(a=>a.user_id===x.user_id)).length>0?<form className="auth-form" onSubmit={async e=>{e.preventDefault();if(!staffToAssign)return;setBusy(true);const {data:{user}}=await createClient().auth.getUser();const {error}=await createClient().from("event_assignments").insert({caterer_id:event.caterer_id,event_id:event.id,user_id:staffToAssign,assigned_by:user?.id});setBusy(false);if(error){setMessage(error.message);return;}setStaffToAssign("");await loadEvent();}}><label>Assign staff member<select required value={staffToAssign} onChange={e=>setStaffToAssign(e.target.value)}><option value="">Select a staff member</option>{staffMembers.filter(x=>!assignedStaff.some(a=>a.user_id===x.user_id)).map(x=><option key={x.user_id} value={x.user_id}>{x.full_name||"Staff member"} · {x.user_id.slice(0,8)}</option>)}</select></label><button className="primary-button" disabled={busy||!staffToAssign}>{busy?"Saving…":"Assign to event"}</button></form>:<p className="activity-empty">No unassigned staff accounts available. Add a staff membership first.</p>}
    </div></details>}
    {canManageBooking&&<details className="event-accordion" name="event-sections"><summary>Event costs · Expenses & profitability<span className="accordion-chevron">⌄</span></summary><div className="accordion-content">
      <div className="event-facts finance-facts"><div><span>ESTIMATED COST</span><strong>{money(expenses.filter(x=>x.expense_status==="estimated").reduce((s,x)=>s+Number(x.amount),0))}</strong></div><div><span>ACTUAL COST</span><strong>{money(expenses.filter(x=>x.expense_status==="actual").reduce((s,x)=>s+Number(x.amount),0))}</strong></div><div><span>PROJECTED PROFIT</span><strong>{Number(event.agreed_amount)>0?money(Number(event.agreed_amount)-expenses.filter(x=>x.expense_status==="estimated").reduce((s,x)=>s+Number(x.amount),0)):"—"}</strong></div><div><span>PROFIT VS AGREED AMOUNT</span><strong>{Number(event.agreed_amount)>0?money(Number(event.agreed_amount)-expenses.filter(x=>x.expense_status==="actual").reduce((s,x)=>s+Number(x.amount),0)):"—"}</strong></div></div>
      <p className="activity-empty">{Number(event.agreed_amount)>0?"Profit figures use the agreed booking amount. Final event profit is confirmed only after all revenue and costs are reconciled.":"Add the agreed booking amount when the customer accepts the quotation to calculate projected profit. The current quotation is not treated as confirmed revenue."}</p>
      {expenses.length>0&&<div className="activity-list">{expenses.map(x=><article className="activity-item" key={x.id}><span className="activity-dot"/><div><p><strong>{money(Number(x.amount))}</strong> · {x.expense_type} · {x.expense_status}</p><time>{new Date(x.expense_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}{x.vendor_name?" · "+x.vendor_name:""}{x.notes?" · "+x.notes:""}</time></div></article>)}</div>}
      <form className="auth-form" onSubmit={async e=>{e.preventDefault();const value=Number(expenseAmount);if(!event||!Number.isFinite(value)||value<0)return;setBusy(true);setMessage("");const s=createClient();const {data:{user}}=await s.auth.getUser();const {error}=await s.from("event_expenses").insert({caterer_id:event.caterer_id,event_id:event.id,expense_type:expenseType,amount:value,expense_date:expenseDate,expense_status:expenseStatus,vendor_name:expenseVendor.trim()||null,notes:expenseNotes.trim()||null,recorded_by:user?.id});setBusy(false);if(error){setMessage(error.message);return;}setExpenseAmount("");setExpenseVendor("");setExpenseNotes("");await loadEvent();}}>
       <div className="form-pair"><label>Amount (₹)<input type="number" min="0" step="0.01" required value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} /></label><label>Expense date<input type="date" required value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} /></label></div>
       <div className="form-pair"><label>Category<select value={expenseType} onChange={e=>setExpenseType(e.target.value)}><option value="ingredients">Ingredients / food</option><option value="labour">Labour</option><option value="transport">Transport</option><option value="equipment">Equipment / rental</option><option value="miscellaneous">Miscellaneous</option></select></label><label>Record as<select value={expenseStatus} onChange={e=>setExpenseStatus(e.target.value)}><option value="estimated">Estimate</option><option value="actual">Actual expense</option></select></label></div>
       <label>Vendor / payee (optional)<input value={expenseVendor} onChange={e=>setExpenseVendor(e.target.value)} /></label><label>Notes (optional)<input value={expenseNotes} onChange={e=>setExpenseNotes(e.target.value)} /></label>
       <button className="primary-button" disabled={busy}>{busy?"Saving…":"Add expense"}</button>
      </form>
    </div></details>}
    {canManageBooking&&<details className="event-accordion" name="event-sections"><summary>Event close-out · Final reconciliation<span className="accordion-chevron">⌄</span></summary><div className="accordion-content">
      <div className="event-facts">
       <div><span>AGREED REVENUE</span><strong>{Number(event.agreed_amount)>0?money(Number(event.agreed_amount)):"Not agreed"}</strong></div>
       <div><span>RECEIVED FOR THIS EVENT</span><strong>{money(allocatedReceipts)}</strong></div>
       <div><span>OUTSTANDING</span><strong>{Number(event.agreed_amount)>0?money(Math.max(0,Number(event.agreed_amount)-allocatedReceipts)):"—"}</strong></div>
       <div><span>ACTUAL EXPENSES</span><strong>{money(actualExpenseTotal)}</strong></div>
       <div><span>PROJECTED EVENT PROFIT</span><strong>{Number(event.agreed_amount)>0?money(Number(event.agreed_amount)-actualExpenseTotal):"—"}</strong></div>
      </div>
      <p className="activity-empty">Profit is calculated as agreed revenue less actual expenses. Outstanding collections are shown separately. This excludes any tax/accounting adjustments not recorded in the event ledger.</p>
      {closeout?<><p className="activity-empty">Closed on {new Date(closeout.closed_at).toLocaleString("en-IN")}</p><p><strong>Final guests:</strong> {event.final_guest_count??"—"}</p>{closeout.leftovers_notes&&<p><strong>Leftovers:</strong> {closeout.leftovers_notes}</p>}{closeout.wastage_notes&&<p><strong>Wastage:</strong> {closeout.wastage_notes}</p>}{closeout.closure_notes&&<p><strong>Closure notes:</strong> {closeout.closure_notes}</p>}</>:
      <form className="auth-form" onSubmit={async e=>{e.preventDefault();const count=Number(finalGuests);if(!Number.isInteger(count)||count<1){setMessage("Enter the final guest count.");return;}if(!window.confirm("Close this event? This records the final guest count and close-out notes."))return;setBusy(true);setMessage("");const s=createClient();const {error}=await s.rpc("close_event",{p_event_id:event.id,p_final_guest_count:count,p_leftovers_notes:leftoversNotes,p_wastage_notes:wastageNotes,p_closure_notes:closureNotes});setBusy(false);if(error){setMessage(error.message);return;}setStatus("closed");setEvent({...event,status:"closed",final_guest_count:count});setMessage("Event closed and reconciliation notes saved.");await loadEvent();}}>
       <label>Final guest count<input type="number" min="1" required value={finalGuests} onChange={e=>setFinalGuests(e.target.value)} placeholder={event.expected_guest_count?String(event.expected_guest_count):"Actual number served"}/></label>
       <label>Leftovers / food returned<textarea rows={2} value={leftoversNotes} onChange={e=>setLeftoversNotes(e.target.value)} placeholder="Record quantities or disposition, if known"/></label>
       <label>Food wastage<textarea rows={2} value={wastageNotes} onChange={e=>setWastageNotes(e.target.value)} placeholder="Record wastage details, quantities or cost if tracked"/></label>
       <label>Final closure notes<textarea rows={2} value={closureNotes} onChange={e=>setClosureNotes(e.target.value)} placeholder="Any final settlement or operational notes"/></label>
       <button className="primary-button" disabled={busy||status!=="completed"}>{busy?"Closing…":status==="completed"?"Close event & save reconciliation":"Mark event Completed before closing"}</button>
      </form>}
    </div></details>}
    <details className="event-accordion" name="event-sections"><summary>Function schedule<span className="accordion-chevron">⌄</span></summary><div className="accordion-content"><div className="events-title-row"><h2>Functions</h2><Link className="text-button" href={"/events/"+event.id+"/menu"}>Plan menus →</Link></div>
      {functions.length===0?<p className="activity-empty">No functions added yet.</p>:<div className="activity-list">{functions.map(fn=><article className="activity-item" key={fn.id}><span className="activity-dot"/><div><p><strong>{fn.function_name}</strong> · {new Date(fn.function_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p><time>{fn.expected_guest_count??"—"} guests{fn.venue?" · "+fn.venue:""}{fn.menu_notes?" · "+fn.menu_notes:""}</time></div></article>)}</div>}
      {canManageBooking&&<form className="auth-form" onSubmit={async e=>{e.preventDefault();if(!event||!functionName.trim()||!functionDate)return;setBusy(true);setMessage("");const s=createClient();const {data:{user}}=await s.auth.getUser();const {error}=await s.from("event_functions").insert({caterer_id:event.caterer_id,booking_id:event.id,function_name:functionName.trim(),function_date:functionDate,venue:functionVenue.trim()||null,expected_guest_count:functionGuests?Number(functionGuests):null,menu_notes:functionMenu.trim()||null,sort_order:functions.length});setBusy(false);if(error){setMessage(error.message);return;}await s.from("event_activity").insert({caterer_id:event.caterer_id,event_id:event.id,actor_id:user?.id,activity_type:"function_added",description:"Added function: "+functionName.trim()+".",metadata:{function_date:functionDate}});setFunctionName("");setFunctionDate("");setFunctionVenue("");setFunctionGuests("");setFunctionMenu("");await loadEvent();}}>
        <label>Function name<input required value={functionName} onChange={e=>setFunctionName(e.target.value)} placeholder="e.g. Haldi, Mehendi, Reception" /></label>
        <div className="form-pair"><label>Function date<input type="date" required value={functionDate} onChange={e=>setFunctionDate(e.target.value)} /></label><label>Expected guests<input type="number" min="1" value={functionGuests} onChange={e=>setFunctionGuests(e.target.value)} /></label></div>
        <label>Venue<input value={functionVenue} onChange={e=>setFunctionVenue(e.target.value)} /></label>
        <label>Menu notes<textarea rows={2} value={functionMenu} onChange={e=>setFunctionMenu(e.target.value)} placeholder="Function-specific menu and service notes" /></label>
        <button className="primary-button" disabled={busy}>{busy?"Adding…":"Add function"}</button>
      </form>}
    </div></details>
    {canManageBooking&&<details className="event-accordion" name="event-sections"><summary>Booking approval<span className="accordion-chevron">⌄</span></summary><div className="accordion-content"><h2>{approvalStatus==="approved"?"Booking approved":approvalStatus==="cancelled"?"Booking cancelled":"Awaiting approval"}</h2><p className="activity-empty">Approval requires a locked date and customer receipts meeting the calculated advance.</p><div className="booking-actions"><button type="button" className="primary-button" disabled={busy||approvalStatus==="approved"||!dateLocked||Number(agreedAmount)<=0} onClick={async()=>{setBusy(true);setMessage("");const s=createClient();const {error}=await s.rpc("approve_booking",{p_booking_id:event.id});setBusy(false);if(error){setMessage(error.message);return;}setApprovalStatus("approved");setStatus("confirmed");setMessage("Booking approved.");await loadEvent();}}>Approve booking</button>
      <div className="cancel-booking"><label>Cancellation reason (required to cancel)<textarea rows={2} value={cancellationReason} onChange={e=>setCancellationReason(e.target.value)} placeholder="Why is this booking being cancelled?" /></label>
      <button type="button" className="text-button" disabled={busy||approvalStatus==="cancelled"||!cancellationReason.trim()} onClick={async()=>{if(!window.confirm("Cancel this booking?"))return;setBusy(true);setMessage("");const s=createClient();const {error}=await s.rpc("cancel_booking",{p_booking_id:event.id,p_reason:cancellationReason.trim()});setBusy(false);if(error){setMessage(error.message);return;}setApprovalStatus("cancelled");setStatus("cancelled");setMessage("Booking cancelled. Payment history has been retained.");await loadEvent();}}>Cancel booking</button></div></div>
    </div></details>}
    <details className="event-accordion" name="event-sections"><summary>Event history<span className="accordion-chevron">⌄</span></summary><div className="accordion-content">
      {activity.length===0 ? <p className="activity-empty">No activity recorded yet.</p> :
        <div className="activity-list">{activity.map(item=><article className="activity-item" key={item.id}><span className="activity-dot"/><div><p>{item.description}</p><time>{new Date(item.created_at).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"})}</time></div></article>)}</div>}
    </div></details>
  </section></main>;
}
