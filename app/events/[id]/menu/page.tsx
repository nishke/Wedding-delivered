"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FunctionRow={id:string;function_name:string;function_date:string};
type Dish={id:string;name:string;category_id:string|null;serving_unit:string;default_unit_price:number|null;is_active:boolean};
type MenuItem={id:string;item_name:string;category_name:string|null;quantity:number|null;serving_unit:string;unit_price:number|null;notes:string|null;dish_id:string|null};
type Category={id:string;name:string};
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n);

export default function EventMenuPage(){
 const params=useParams<{id:string}>();const router=useRouter();
 const [eventName,setEventName]=useState("");const [functions,setFunctions]=useState<FunctionRow[]>([]);
 const [dishes,setDishes]=useState<Dish[]>([]);const [categories,setCategories]=useState<Category[]>([]);
 const [items,setItems]=useState<MenuItem[]>([]);const [catererId,setCatererId]=useState("");
 const [role,setRole]=useState("");const [functionId,setFunctionId]=useState("");
 const [dishId,setDishId]=useState("custom");const [itemName,setItemName]=useState("");
 const [categoryName,setCategoryName]=useState("");const [quantity,setQuantity]=useState("");
 const [unit,setUnit]=useState("portion");const [unitPrice,setUnitPrice]=useState("");
 const [notes,setNotes]=useState("");const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");
 const canManage=["owner","manager"].includes(role);
 async function load(){
  const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/login");return;}
  const {data:membership}=await s.from("caterer_memberships").select("caterer_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership){router.replace("/setup");return;}setCatererId(membership.caterer_id);setRole(membership.role);
  const {data:event}=await s.from("events").select("id,event_name").eq("id",params.id).eq("caterer_id",membership.caterer_id).maybeSingle();
  if(!event){setMessage("Event not found or access denied.");setLoading(false);return;}setEventName(event.event_name);
  const [{data:fn},{data:ds},{data:cats},{data:menu,error}]=await Promise.all([
   s.from("event_functions").select("id,function_name,function_date").eq("booking_id",params.id).eq("caterer_id",membership.caterer_id).order("sort_order"),
   s.from("dishes").select("id,name,category_id,serving_unit,default_unit_price,is_active").eq("caterer_id",membership.caterer_id).eq("is_active",true).order("name"),
   s.from("menu_categories").select("id,name").eq("caterer_id",membership.caterer_id).eq("is_active",true),
   s.from("event_menu_items").select("id,item_name,category_name,quantity,serving_unit,unit_price,notes,dish_id").eq("event_function_id",functionId||"00000000-0000-0000-0000-000000000000").eq("caterer_id",membership.caterer_id).order("sort_order")
  ]);
  setFunctions((fn||[]) as FunctionRow[]);setDishes((ds||[]) as Dish[]);setCategories((cats||[]) as Category[]);
  if(!functionId&&fn?.length)setFunctionId(fn[0].id);
  if(error)setMessage(error.message);
  setItems((menu||[]) as MenuItem[]);setLoading(false);
 }
 useEffect(()=>{void load();},[params.id,router]);
 useEffect(()=>{if(!functionId||!catererId)return;const s=createClient();void s.from("event_menu_items").select("id,item_name,category_name,quantity,serving_unit,unit_price,notes,dish_id").eq("event_function_id",functionId).eq("caterer_id",catererId).order("sort_order").then(({data,error})=>{if(error)setMessage(error.message);else setItems((data||[]) as MenuItem[]);});},[functionId,catererId]);
 function chooseDish(value:string){setDishId(value);const d=dishes.find(x=>x.id===value);if(d){setItemName(d.name);setUnit(d.serving_unit);setUnitPrice(d.default_unit_price===null?"":String(d.default_unit_price));const c=categories.find(x=>x.id===d.category_id);setCategoryName(c?.name||"");}else{setItemName("");setUnit("portion");setUnitPrice("");setCategoryName("");}}
 async function addItem(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!canManage||!functionId||!itemName.trim())return;
  const q=quantity.trim()===""?null:Number(quantity);const p=unitPrice.trim()===""?null:Number(unitPrice);
  if((q!==null&&(!Number.isFinite(q)||q<0))||(p!==null&&(!Number.isFinite(p)||p<0))){setMessage("Quantity and price must be valid non-negative numbers.");return;}
  setBusy(true);setMessage("");const s=createClient();const {error}=await s.from("event_menu_items").insert({caterer_id:catererId,event_function_id:functionId,dish_id:dishId==="custom"?null:dishId,item_name:itemName.trim(),category_name:categoryName.trim()||null,quantity:q,serving_unit:unit.trim()||"portion",unit_price:p,notes:notes.trim()||null,sort_order:items.length});
  setBusy(false);if(error){setMessage(error.message);return;}setDishId("custom");setItemName("");setCategoryName("");setQuantity("");setUnit("portion");setUnitPrice("");setNotes("");await load();
 }
 async function removeItem(id:string){if(!canManage)return;const s=createClient();const {error}=await s.from("event_menu_items").delete().eq("id",id).eq("caterer_id",catererId);if(error){setMessage(error.message);return;}await load();}
 const total=items.reduce((sum,x)=>sum+(Number(x.quantity||0)*Number(x.unit_price||0)),0);
 return <main className="auth-shell"><section className="auth-card event-card events-list-card">
  <Link className="back-link" href={"/events/"+params.id}>← Event details</Link><div className="eyebrow">EVENT MENU · {eventName.toUpperCase()}</div>
  <div className="events-title-row"><div><h1>Menu plan.</h1><p>Build a different menu for each function. Catalogue dishes and one-off custom items can sit together.</p></div></div>
  {message&&<p className="auth-message" role="status">{message}</p>}
  {loading?<p>Loading event menu…</p>:functions.length===0?<p className="activity-empty">Add an event function before planning its menu.</p>:<>
   <label>Function<select value={functionId} onChange={e=>setFunctionId(e.target.value)}>{functions.map(f=><option key={f.id} value={f.id}>{f.function_name} · {new Date(f.function_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</option>)}</select></label>
   <section className="activity-section"><h2>Selected menu</h2>
    {items.length===0?<p className="activity-empty">No dishes added to this function yet.</p>:<div className="activity-list">{items.map(x=><article className="activity-item" key={x.id}><span className="activity-dot"/><div><p><strong>{x.item_name}</strong>{x.category_name?" · "+x.category_name:""}</p><time>{x.quantity===null?"Quantity not set":x.quantity+" "+x.serving_unit}{x.unit_price!==null?" · "+money(Number(x.unit_price))+" / "+x.serving_unit:" · Price not set"}{x.notes?" · "+x.notes:""}</time></div>{canManage&&<button type="button" className="text-button" onClick={()=>void removeItem(x.id)}>Remove</button>}</article>)}</div>}
    <p className="activity-empty">Indicative menu value: {money(total)}. This is not yet the event quotation total.</p>
   </section>
   {canManage&&<section className="activity-section"><h2>Add menu item</h2><form className="auth-form" onSubmit={addItem}>
    <label>Choose a catalogue dish or add custom<select value={dishId} onChange={e=>chooseDish(e.target.value)}><option value="custom">Custom item</option>{dishes.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label>Dish / item name<input required value={itemName} onChange={e=>setItemName(e.target.value)} /></label>
    <div className="form-pair"><label>Menu category<input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="e.g. Starter" /></label><label>Serving unit<input required value={unit} onChange={e=>setUnit(e.target.value)} /></label></div>
    <div className="form-pair"><label>Quantity (optional)<input type="number" min="0" step="0.01" value={quantity} onChange={e=>setQuantity(e.target.value)} /></label><label>Unit price (₹, optional)<input type="number" min="0" step="0.01" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} /></label></div>
    <label>Notes (optional)<input value={notes} onChange={e=>setNotes(e.target.value)} /></label>
    <button className="primary-button" disabled={busy}>{busy?"Saving…":"Add to function menu"}</button>
   </form></section>}
  </>}
 </section></main>;
}
