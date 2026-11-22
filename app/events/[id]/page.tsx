"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EventRow = {
  id: string; event_name: string; event_type: string | null; event_date: string;
  venue: string | null; expected_guest_count: number | null; status: string;
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
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");

  async function loadEvent() {
    const s = createClient();
    const {data:{user}} = await s.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const {data:membership} = await s.from("caterer_memberships").select("caterer_id,role").eq("user_id",user.id).limit(1).maybeSingle();
    if (!membership) { router.replace("/setup"); return; }
    setCanManageBooking(["owner","manager"].includes(membership.role));
    const {data,error} = await s.from("events")
      .select("id,event_name,event_type,event_date,venue,expected_guest_count,status,quoted_amount,agreed_amount,advance_percentage,agreed_advance_amount,date_locked,booking_approval_status,customer_id,caterer_id")
      .eq("id",params.id).eq("caterer_id",membership.caterer_id).single();
    if (error || !data) { setMessage("Event not found or you do not have access."); setLoading(false); return; }
    const row = data as EventRow;
    setEvent(row); setName(row.event_name); setType(row.event_type || "Other"); setDate(row.event_date);
    setVenue(row.venue || ""); setGuests(row.expected_guest_count == null ? "" : String(row.expected_guest_count));
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
    setLoading(false);
  }

  useEffect(() => { void loadEvent(); }, [params.id,router]);

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
    <div className="eyebrow">EVENT RECORD · EDIT</div><h1>{event.event_name}</h1>
    <p>{customer || "Customer not linked"}{phone ? " · "+phone : ""}</p>
    <div className="event-facts">
      <div><span>CUSTOMER</span><strong>{customer || "—"}</strong><small>{phone}</small></div>
      <div><span>EXPECTED GUESTS</span><strong>{event.expected_guest_count ?? "—"}</strong></div>
      {canManageBooking&&<div><span>QUOTED AMOUNT</span><strong>{money(event.quoted_amount)}</strong></div>}
      <div><span>VENUE</span><strong>{event.venue || "—"}</strong></div>
    </div>
    <form className="auth-form" onSubmit={save}>
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
      <label>Event status<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statusLabels).filter(([value])=>value!=="cancelled").map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save event changes"}</button>
    </form>
    {message && <p className="auth-message" role="status">{message}</p>}
    {canManageBooking&&<section className="activity-section"><div className="eyebrow">EVENT COSTS</div><h2>Expenses & profitability</h2>
      <div className="event-facts"><div><span>ESTIMATED COST</span><strong>{money(expenses.filter(x=>x.expense_status==="estimated").reduce((s,x)=>s+Number(x.amount),0))}</strong></div><div><span>ACTUAL COST</span><strong>{money(expenses.filter(x=>x.expense_status==="actual").reduce((s,x)=>s+Number(x.amount),0))}</strong></div><div><span>PROJECTED PROFIT</span><strong>{money(Number(event.agreed_amount||0)-expenses.filter(x=>x.expense_status==="estimated").reduce((s,x)=>s+Number(x.amount),0))}</strong></div><div><span>PROFIT VS AGREED AMOUNT</span><strong>{money(Number(event.agreed_amount||0)-expenses.filter(x=>x.expense_status==="actual").reduce((s,x)=>s+Number(x.amount),0))}</strong></div></div>
      <p className="activity-empty">Profit figures use the agreed booking amount. Final event profit is confirmed only after all revenue and costs are reconciled.</p>
      {expenses.length>0&&<div className="activity-list">{expenses.map(x=><article className="activity-item" key={x.id}><span className="activity-dot"/><div><p><strong>{money(Number(x.amount))}</strong> · {x.expense_type} · {x.expense_status}</p><time>{new Date(x.expense_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}{x.vendor_name?" · "+x.vendor_name:""}{x.notes?" · "+x.notes:""}</time></div></article>)}</div>}
      <form className="auth-form" onSubmit={async e=>{e.preventDefault();const value=Number(expenseAmount);if(!event||!Number.isFinite(value)||value<0)return;setBusy(true);setMessage("");const s=createClient();const {data:{user}}=await s.auth.getUser();const {error}=await s.from("event_expenses").insert({caterer_id:event.caterer_id,event_id:event.id,expense_type:expenseType,amount:value,expense_date:expenseDate,expense_status:expenseStatus,vendor_name:expenseVendor.trim()||null,notes:expenseNotes.trim()||null,recorded_by:user?.id});setBusy(false);if(error){setMessage(error.message);return;}setExpenseAmount("");setExpenseVendor("");setExpenseNotes("");await loadEvent();}}>
       <div className="form-pair"><label>Amount (₹)<input type="number" min="0" step="0.01" required value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} /></label><label>Expense date<input type="date" required value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} /></label></div>
       <div className="form-pair"><label>Category<select value={expenseType} onChange={e=>setExpenseType(e.target.value)}><option value="ingredients">Ingredients / food</option><option value="labour">Labour</option><option value="transport">Transport</option><option value="equipment">Equipment / rental</option><option value="miscellaneous">Miscellaneous</option></select></label><label>Record as<select value={expenseStatus} onChange={e=>setExpenseStatus(e.target.value)}><option value="estimated">Estimate</option><option value="actual">Actual expense</option></select></label></div>
       <label>Vendor / payee (optional)<input value={expenseVendor} onChange={e=>setExpenseVendor(e.target.value)} /></label><label>Notes (optional)<input value={expenseNotes} onChange={e=>setExpenseNotes(e.target.value)} /></label>
       <button className="primary-button" disabled={busy}>{busy?"Saving…":"Add expense"}</button>
      </form>
    </section>}
    <section className="activity-section"><div className="eyebrow">FUNCTION SCHEDULE</div><h2>Functions</h2>
      {functions.length===0?<p className="activity-empty">No functions added yet.</p>:<div className="activity-list">{functions.map(fn=><article className="activity-item" key={fn.id}><span className="activity-dot"/><div><p><strong>{fn.function_name}</strong> · {new Date(fn.function_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p><time>{fn.expected_guest_count??"—"} guests{fn.venue?" · "+fn.venue:""}{fn.menu_notes?" · "+fn.menu_notes:""}</time></div></article>)}</div>}
      <form className="auth-form" onSubmit={async e=>{e.preventDefault();if(!event||!functionName.trim()||!functionDate)return;setBusy(true);setMessage("");const s=createClient();const {data:{user}}=await s.auth.getUser();const {error}=await s.from("event_functions").insert({caterer_id:event.caterer_id,booking_id:event.id,function_name:functionName.trim(),function_date:functionDate,venue:functionVenue.trim()||null,expected_guest_count:functionGuests?Number(functionGuests):null,menu_notes:functionMenu.trim()||null,sort_order:functions.length});setBusy(false);if(error){setMessage(error.message);return;}await s.from("event_activity").insert({caterer_id:event.caterer_id,event_id:event.id,actor_id:user?.id,activity_type:"function_added",description:"Added function: "+functionName.trim()+".",metadata:{function_date:functionDate}});setFunctionName("");setFunctionDate("");setFunctionVenue("");setFunctionGuests("");setFunctionMenu("");await loadEvent();}}>
        <label>Function name<input required value={functionName} onChange={e=>setFunctionName(e.target.value)} placeholder="e.g. Haldi, Mehendi, Reception" /></label>
        <div className="form-pair"><label>Function date<input type="date" required value={functionDate} onChange={e=>setFunctionDate(e.target.value)} /></label><label>Expected guests<input type="number" min="1" value={functionGuests} onChange={e=>setFunctionGuests(e.target.value)} /></label></div>
        <label>Venue<input value={functionVenue} onChange={e=>setFunctionVenue(e.target.value)} /></label>
        <label>Menu notes<textarea rows={2} value={functionMenu} onChange={e=>setFunctionMenu(e.target.value)} placeholder="Function-specific menu and service notes" /></label>
        <button className="primary-button" disabled={busy}>{busy?"Adding…":"Add function"}</button>
      </form>
    </section>
    {canManageBooking&&<section className="activity-section"><div className="eyebrow">BOOKING APPROVAL</div><h2>{approvalStatus==="approved"?"Booking approved":approvalStatus==="cancelled"?"Booking cancelled":"Awaiting approval"}</h2><p className="activity-empty">Approval requires a locked date and customer receipts meeting the calculated advance.</p><button type="button" className="primary-button" disabled={busy||approvalStatus==="approved"||!dateLocked||Number(agreedAmount)<=0} onClick={async()=>{setBusy(true);setMessage("");const s=createClient();const {error}=await s.rpc("approve_booking",{p_booking_id:event.id});setBusy(false);if(error){setMessage(error.message);return;}setApprovalStatus("approved");setStatus("confirmed");setMessage("Booking approved.");await loadEvent();}}>Approve booking</button>
      <label>Cancellation reason (required to cancel)<textarea rows={2} value={cancellationReason} onChange={e=>setCancellationReason(e.target.value)} placeholder="Why is this booking being cancelled?" /></label>
      <button type="button" className="text-button" disabled={busy||approvalStatus==="cancelled"||!cancellationReason.trim()} onClick={async()=>{if(!window.confirm("Cancel this booking?"))return;setBusy(true);setMessage("");const s=createClient();const {error}=await s.rpc("cancel_booking",{p_booking_id:event.id,p_reason:cancellationReason.trim()});setBusy(false);if(error){setMessage(error.message);return;}setApprovalStatus("cancelled");setStatus("cancelled");setMessage("Booking cancelled. Payment history has been retained.");await loadEvent();}}>Cancel booking</button>
    </section>}
    <section className="activity-section"><div className="eyebrow">EVENT HISTORY</div><h2>Activity</h2>
      {activity.length===0 ? <p className="activity-empty">No activity recorded yet.</p> :
        <div className="activity-list">{activity.map(item=><article className="activity-item" key={item.id}><span className="activity-dot"/><div><p>{item.description}</p><time>{new Date(item.created_at).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"})}</time></div></article>)}</div>}
    </section>
  </section></main>;
}
