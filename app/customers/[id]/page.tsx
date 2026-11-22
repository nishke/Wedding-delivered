"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Customer={id:string;full_name:string;phone:string|null;email:string|null};
type Payment={id:string;amount:number;payment_date:string;payment_method:string;reference_number:string|null;notes:string|null;created_at:string;booking_id:string|null};
type Booking={id:string;event_name:string;event_date:string};
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n);

export default function CustomerDetailPage(){
 const params=useParams<{id:string}>();const router=useRouter();
 const [customer,setCustomer]=useState<Customer|null>(null);const [payments,setPayments]=useState<Payment[]>([]);const [bookings,setBookings]=useState<Booking[]>([]);
 const [catererId,setCatererId]=useState("");const [canViewFinance,setCanViewFinance]=useState(false);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const [amount,setAmount]=useState("");const [date,setDate]=useState(new Date().toISOString().slice(0,10));
 const [method,setMethod]=useState("cash");const [bookingId,setBookingId]=useState("");const [reference,setReference]=useState("");const [notes,setNotes]=useState("");
 async function load(){
  const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/login");return;}
  const {data:membership}=await s.from("caterer_memberships").select("caterer_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership){router.replace("/setup");return;}setCatererId(membership.caterer_id);setCanViewFinance(["owner","manager"].includes(membership.role));
  const {data:c,error}=await s.from("customers").select("id,full_name,phone,email").eq("id",params.id).eq("caterer_id",membership.caterer_id).single();
  if(error||!c){setMessage("Customer not found or access denied.");setLoading(false);return;}setCustomer(c as Customer);
  const {data:bookingRows}=await s.from("events").select("id,event_name,event_date").eq("customer_id",params.id).eq("caterer_id",membership.caterer_id).order("event_date",{ascending:false});setBookings((bookingRows||[]) as Booking[]);
  const {data:p,error:pe}=await s.from("customer_payments").select("id,amount,payment_date,payment_method,reference_number,notes,created_at,booking_id").eq("customer_id",params.id).eq("caterer_id",membership.caterer_id).order("payment_date",{ascending:false}).order("created_at",{ascending:false});
  if(pe)setMessage("Could not load payment history: "+pe.message);else setPayments((p||[]) as Payment[]);
  setLoading(false);
 }
 useEffect(()=>{void load();},[params.id,router]);
 const total=payments.reduce((sum,p)=>sum+Number(p.amount),0);
 async function recordPayment(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const value=Number(amount);if(!customer||!catererId||!Number.isFinite(value)||value<=0){setMessage("Enter a valid payment amount.");return;}
  setBusy(true);setMessage("");const s=createClient();const {data:{user}}=await s.auth.getUser();
  const {error}=await s.from("customer_payments").insert({caterer_id:catererId,customer_id:customer.id,amount:value,payment_date:date,payment_method:method,booking_id:bookingId||null,reference_number:reference.trim()||null,notes:notes.trim()||null,recorded_by:user?.id});
  setBusy(false);if(error){setMessage(error.message);return;}
  setAmount("");setReference("");setNotes("");setBookingId("");setMessage("Payment recorded.");await load();
 }
 if(loading)return <main className="auth-shell"><section className="auth-card"><p>Loading customer…</p></section></main>;
 if(!customer)return <main className="auth-shell"><section className="auth-card"><Link className="back-link" href="/customers">← Customers</Link><p>{message}</p></section></main>;
 return <main className="auth-shell"><section className="auth-card event-card events-list-card">
  <Link className="back-link" href="/customers">← Customers</Link><div className="eyebrow">CUSTOMER ACCOUNT · PAYMENT HISTORY</div>
  <h1>{customer.full_name}.</h1><p>{customer.phone||"No phone recorded"}{customer.email?" · "+customer.email:""}</p>
  {canViewFinance&&<>\n  <div className="event-facts"><div><span>TOTAL RECEIVED</span><strong>{money(total)}</strong></div><div><span>PAYMENT ENTRIES</span><strong>{payments.length}</strong></div></div>
  <section className="activity-section"><div className="eyebrow">RECORD A RECEIPT</div><h2>Add payment</h2>
   <form className="auth-form" onSubmit={recordPayment}>
    <div className="form-pair"><label>Amount received (₹)<input type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} /></label><label>Payment date<input type="date" required value={date} onChange={e=>setDate(e.target.value)} /></label></div>
    <label>Allocate to booking (optional)<select value={bookingId} onChange={e=>setBookingId(e.target.value)}><option value="">Unallocated customer receipt</option>{bookings.map(b=><option value={b.id} key={b.id}>{b.event_name} · {new Date(b.event_date+"T00:00:00").toLocaleDateString("en-IN")}</option>)}</select></label>
    <label>Payment method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="gateway">Payment gateway</option><option value="other">Other</option></select></label>
    <label>Reference / transaction ID (optional)<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="UPI reference, cheque number, etc." /></label>
    <label>Notes (optional)<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. cash received by owner" /></label>
    <button className="primary-button" disabled={busy}>{busy?"Recording…":"Record payment"}</button>
   </form>
   {message&&<p className="auth-message" role="status">{message}</p>}
  </section>
  <section className="activity-section"><div className="eyebrow">CUSTOMER LEDGER</div><h2>Payment history</h2>
   {payments.length===0?<p className="activity-empty">No payments recorded for this customer yet.</p>:<div className="activity-list">{payments.map(p=><article className="activity-item" key={p.id}><span className="activity-dot"/><div><p><strong>{money(Number(p.amount))}</strong> · {p.payment_method.replace("_"," ")}</p><time>{new Date(p.payment_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}{p.booking_id?" · "+(bookings.find(b=>b.id===p.booking_id)?.event_name||"Booking linked"):" · Unallocated"}{p.reference_number?" · Ref: "+p.reference_number:""}{p.notes?" · "+p.notes:""}</time></div></article>)}</div>}
  </section>\n  </>}
 </section></main>;
}
