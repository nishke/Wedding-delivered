"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = { id:string; name:string; sort_order:number; is_active:boolean };
type Dish = { id:string; name:string; category_id:string|null; description:string|null; serving_unit:string; default_unit_price:number|null; is_vegetarian:boolean|null; is_active:boolean };
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n);

export default function MenuStudioPage(){
 const router=useRouter();
 const [catererId,setCatererId]=useState("");
 const [role,setRole]=useState("");
 const [categories,setCategories]=useState<Category[]>([]);
 const [dishes,setDishes]=useState<Dish[]>([]);
 const [categoryName,setCategoryName]=useState("");
 const [dishName,setDishName]=useState("");
 const [categoryId,setCategoryId]=useState("");
 const [description,setDescription]=useState("");
 const [unit,setUnit]=useState("portion");
 const [price,setPrice]=useState("");
 const [vegetarian,setVegetarian]=useState("unknown");
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("all");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const canManage=["owner","manager"].includes(role);
 async function load(){
  const s=createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user){router.replace("/login");return;}
  const {data:membership}=await s.from("caterer_memberships").select("caterer_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership){router.replace("/setup");return;}
  setCatererId(membership.caterer_id);setRole(membership.role);
  const [{data:cats,error:catError},{data:items,error:itemError}]=await Promise.all([
   s.from("menu_categories").select("id,name,sort_order,is_active").eq("caterer_id",membership.caterer_id).order("sort_order").order("name"),
   s.from("dishes").select("id,name,category_id,description,serving_unit,default_unit_price,is_vegetarian,is_active").eq("caterer_id",membership.caterer_id).order("name")
  ]);
  if(catError||itemError)setMessage(catError?.message||itemError?.message||"Could not load menu catalogue.");
  setCategories((cats||[]) as Category[]);setDishes((items||[]) as Dish[]);
  if(!categoryId&&cats?.length)setCategoryId(cats[0].id);
  setLoading(false);
 }
 useEffect(()=>{void load();},[router]);
 const filtered=useMemo(()=>dishes.filter(d=>(filter==="all"||d.category_id===filter)&&(!query.trim()||[d.name,d.description].some(v=>v?.toLowerCase().includes(query.trim().toLowerCase())))),[dishes,filter,query]);
 async function addCategory(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!categoryName.trim()||!catererId)return;setBusy(true);setMessage("");
  const s=createClient();const {data,error}=await s.from("menu_categories").insert({caterer_id:catererId,name:categoryName.trim(),sort_order:categories.length}).select("id").single();
  setBusy(false);if(error){setMessage(error.message);return;}setCategoryName("");if(data)setCategoryId(data.id);setMessage("Category added.");await load();
 }
 async function addDish(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!dishName.trim()||!catererId)return;
  const defaultPrice=price.trim()===""?null:Number(price);
  if(defaultPrice!==null&&(!Number.isFinite(defaultPrice)||defaultPrice<0)){setMessage("Enter a valid non-negative price.");return;}
  setBusy(true);setMessage("");const s=createClient();
  const {error}=await s.from("dishes").insert({caterer_id:catererId,category_id:categoryId||null,name:dishName.trim(),description:description.trim()||null,serving_unit:unit,default_unit_price:defaultPrice,is_vegetarian:vegetarian==="unknown"?null:vegetarian==="yes"});
  setBusy(false);if(error){setMessage(error.message);return;}setDishName("");setDescription("");setPrice("");setMessage("Dish added to the catalogue.");await load();
 }
 async function toggleDish(d:Dish){
  if(!canManage)return;const s=createClient();const {error}=await s.from("dishes").update({is_active:!d.is_active}).eq("id",d.id).eq("caterer_id",catererId);
  if(error){setMessage(error.message);return;}await load();
 }
 return <main className="auth-shell"><section className="auth-card event-card events-list-card">
  <Link className="back-link" href="/">← Workspace</Link><div className="eyebrow">WORKSPACE · MENU STUDIO</div>
  <div className="events-title-row"><div><h1>Menu Studio.</h1><p>Build a reusable dish catalogue. Every event can still have its own custom menu.</p></div></div>
  {message&&<p className="auth-message" role="status">{message}</p>}
  {canManage&&<section className="activity-section"><h2>Categories</h2><form className="auth-form" onSubmit={addCategory}><label>New category<input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="e.g. Starters, Main course, Desserts" required /></label><button className="primary-button" disabled={busy}>{busy?"Saving…":"Add category"}</button></form><div className="event-filters"><span>{categories.length} categories</span><span>{categories.filter(c=>c.is_active).length} active</span></div></section>}
  {canManage&&<section className="activity-section"><h2>Add a dish</h2><form className="auth-form" onSubmit={addDish}>
   <label>Dish name<input required value={dishName} onChange={e=>setDishName(e.target.value)} placeholder="e.g. Paneer tikka" /></label>
   <label>Category<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Uncategorised</option>{categories.filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label>Description / preparation notes<input value={description} onChange={e=>setDescription(e.target.value)} /></label>
   <div className="form-pair"><label>Serving unit<input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="portion, kg, litre" required /></label><label>Default price (₹, optional)<input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} /></label></div>
   <label>Vegetarian status<select value={vegetarian} onChange={e=>setVegetarian(e.target.value)}><option value="unknown">Not specified</option><option value="yes">Vegetarian</option><option value="no">Non-vegetarian</option></select></label>
   <button className="primary-button" disabled={busy}>{busy?"Saving…":"Add dish"}</button>
  </form></section>}
  <section className="activity-section"><div className="events-title-row"><div><h2>Dish catalogue</h2><p>{dishes.length} dishes saved</p></div></div>
   <div className="event-filters"><label><span>SEARCH</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search dishes" /></label><label><span>CATEGORY</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
   {loading?<p>Loading menu catalogue…</p>:filtered.length===0?<p className="activity-empty">No dishes match this view yet.</p>:<div className="activity-list">{filtered.map(d=><article className="activity-item" key={d.id}><span className="activity-dot"/><div><p><strong>{d.name}</strong>{d.is_vegetarian===true?" · Vegetarian":d.is_vegetarian===false?" · Non-vegetarian":""}{!d.is_active?" · Archived":""}</p><time>{categories.find(c=>c.id===d.category_id)?.name||"Uncategorised"} · {d.serving_unit}{d.default_unit_price!==null?" · "+money(Number(d.default_unit_price)):" · No default price"}{d.description?" · "+d.description:""}</time></div>{canManage&&<button type="button" className="text-button" onClick={()=>void toggleDish(d)}>{d.is_active?"Archive":"Restore"}</button>}</article>)}</div>}
  </section>
 </section></main>;
}
