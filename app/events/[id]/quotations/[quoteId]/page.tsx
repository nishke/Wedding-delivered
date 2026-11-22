"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { useParams,useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Item={description:string;quantity:number;unit:string;unit_price:number;line_total:number};
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export default function QuotationPrintPage(){
 const params=useParams<{id:string;quoteId:string}>();const router=useRouter();
 const [data,setData]=useState<any>(null);const [items,setItems]=useState<Item[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{void(async()=>{
  const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/login");return;}
  const {data:m}=await s.from("caterer_memberships").select("caterer_id").eq("user_id",user.id).limit(1).maybeSingle();if(!m){router.replace("/setup");return;}
  const {data:q,error:qError}=await s.from("event_quotations").select("id,revision,pricing_model,guest_count,subtotal,gst_applicable,gst_rate,gst_inclusive,gst_amount,total_amount,status,customer_notes,created_at,event_id").eq("id",params.quoteId).eq("event_id",params.id).eq("caterer_id",m.caterer_id).maybeSingle();
  if(qError||!q){setError(qError?.message||"Quotation not found.");setLoading(false);return;}
  const [{data:event},{data:caterer},{data:lineItems}]=await Promise.all([
   s.from("events").select("event_name,event_type,event_date,venue,customer_id").eq("id",params.id).eq("caterer_id",m.caterer_id).maybeSingle(),
   s.from("caterers").select("name,legal_name,phone,email,address,gstin,fssai_license").eq("id",m.caterer_id).maybeSingle(),
   s.from("event_quotation_items").select("description,quantity,unit,unit_price,line_total").eq("quotation_id",q.id).eq("caterer_id",m.caterer_id).order("sort_order")
  ]);
  let customer=null;if(event?.customer_id){const {data:customerData}=await s.from("customers").select("full_name,phone,email,address").eq("id",event.customer_id).eq("caterer_id",m.caterer_id).maybeSingle();customer=customerData;}
  setData({...q,event,caterer,customer});setItems((lineItems||[]) as Item[]);setLoading(false);
 })();},[params.id,params.quoteId,router]);
 async function markSent(){const s=createClient();const {error:e}=await s.from("event_quotations").update({status:"sent"}).eq("id",params.quoteId).eq("status","draft");if(e){setError(e.message);return;}setData((d:any)=>({...d,status:"sent"}));}
 async function updateStatus(status:"accepted"|"rejected"){
  const s=createClient();const {error:e}=await s.from("event_quotations").update({status}).eq("id",params.quoteId).eq("status","sent");
  if(e){setError(e.message);return;}setData((d:any)=>({...d,status}));
 }
 if(loading)return <main className="auth-shell"><section className="auth-card">Loading quotation…</section></main>;
 if(!data)return <main className="auth-shell"><section className="auth-card"><p>{error||"Quotation unavailable."}</p><Link href={"/events/"+params.id+"/quotations"}>Back to quotations</Link></section></main>;
 const c=data.caterer||{};const e=data.event||{};const customer=data.customer||{};
 return <main className="auth-shell quote-print-shell">
  <div className="quote-toolbar no-print"><Link className="back-link" href={"/events/"+params.id+"/quotations"}>← Quotations</Link><div><button className="text-button" type="button" onClick={()=>window.print()}>Print / Save PDF</button>{customer.phone&&<a className="text-button" href={"https://wa.me/"+customer.phone.replace(/\\D/g,"")+"?text="+encodeURIComponent("Hello "+(customer.full_name||"")+", please find your catering quotation for "+(e.event_name||"your event")+".")} target="_blank" rel="noreferrer">Share on WhatsApp</a>}{data.status==="draft"&&<button className="primary-button" type="button" onClick={()=>void markSent()}>Mark as sent</button>}{data.status==="sent"&&<><button className="text-button" type="button" onClick={()=>void updateStatus("accepted")}>Mark accepted</button><button className="text-button" type="button" onClick={()=>void updateStatus("rejected")}>Mark rejected</button></>}</div></div>
  {error&&<p className="auth-message no-print">{error}</p>}
  <article className="quote-paper">
   <header className="quote-brand"><div><div className="eyebrow">CATERING SERVICES</div><h1>{c.name||"Dhande’s Millennium Catering"}</h1>{c.legal_name&&c.legal_name!==c.name&&<p>{c.legal_name}</p>}{c.address&&<p>{c.address}</p>}{c.phone&&<p>{c.phone}{c.email?" · "+c.email:""}</p>}</div><div className="quote-label"><span>QUOTATION</span><strong>#{String(data.revision).padStart(3,"0")}</strong><small>{new Date(data.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</small></div></header>
   <div className="quote-rule"/>
   <section className="quote-parties"><div><span>PREPARED FOR</span><strong>{customer.full_name||"Customer"}</strong>{customer.phone&&<p>{customer.phone}</p>}{customer.email&&<p>{customer.email}</p>}{customer.address&&<p>{customer.address}</p>}</div><div><span>EVENT DETAILS</span><strong>{e.event_name||"Catering event"}</strong>{e.event_type&&<p>{e.event_type}</p>}{e.event_date&&<p>{new Date(e.event_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>}{e.venue&&<p>{e.venue}</p>}</div></section>
   <table className="quote-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{items.map((it,i)=><tr key={i}><td>{it.description}</td><td>{it.quantity}</td><td>{it.unit}</td><td>{money(Number(it.unit_price))}</td><td>{money(Number(it.line_total))}</td></tr>)}</tbody></table>
   <section className="quote-totals"><div><span>Subtotal</span><strong>{money(Number(data.subtotal))}</strong></div>{data.gst_applicable&&<div><span>GST ({data.gst_rate}%) {data.gst_inclusive?"included":"additional"}</span><strong>{money(Number(data.gst_amount))}</strong></div>}<div className="quote-grand-total"><span>Quotation total</span><strong>{money(Number(data.total_amount))}</strong></div></section>
   {data.pricing_model==="per_plate"&&<p className="quote-footnote">Per-plate quotation based on {data.guest_count||"—"} guests.</p>}
   {data.customer_notes&&<section className="quote-notes"><span>NOTES & TERMS</span><p>{data.customer_notes}</p></section>}
   <footer className="quote-footer"><p>Thank you for considering us for your event.</p><span>{c.gstin?"GSTIN: "+c.gstin:""}{c.fssai_license?" · FSSAI: "+c.fssai_license:""}</span></footer>
  </article>
 </main>;
}
