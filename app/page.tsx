"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inr=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);

const priorities = [
  { time: "Today", title: "Review new enquiries", detail: "Keep every incoming lead accounted for", tag: "Leads", tone: "amber" },
  { time: "Upcoming", title: "Confirm event requirements", detail: "Guest count, menu and venue details", tag: "Events", tone: "blue" },
  { time: "Follow-up", title: "Check pending collections", detail: "Track advances and outstanding balances", tag: "Finance", tone: "green" },
];

const modules = [
  { number: "01", title: "Events", detail: "Enquiries, bookings and event execution", icon: "◷", href: "/events" },
  { number: "02", title: "Menu Studio", detail: "Standardise menus and create documents", icon: "▤" },
  { number: "03", title: "Quotations", detail: "Custom pricing, revisions and sharing", icon: "₹" },
  { number: "04", title: "Finance", detail: "Payments, expenses and event profit", icon: "↗" },
  { number: "05", title: "Food planning", detail: "Dish quantities, buffers and purchases", icon: "✳" },
  { number: "06", title: "Enquiry inbox", detail: "Capture and review incoming requests", icon: "◎", href: "/leads" },
];

export default function Home() {
  const router=useRouter();
  const [metrics,setMetrics]=useState({upcoming:0,enquiries:0,due:0,revenue:0});
  const [loading,setLoading]=useState(true);
  const [canViewFinance,setCanViewFinance]=useState(false);
  useEffect(()=>{
    const load=async()=>{
      const s=createClient();
      const {data:{user}}=await s.auth.getUser();
      if(!user){setLoading(false);return;}
      const {data:membership}=await s.from("caterer_memberships").select("caterer_id,role").eq("user_id",user.id).limit(1).maybeSingle();
      if(!membership){router.replace("/setup");return;}
      const financeAccess=["owner","manager"].includes(membership.role);
      setCanViewFinance(financeAccess);
      const today=new Date();
      const todayKey=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
      const monthStart=todayKey.slice(0,8)+"01";
      const {data:events}=await s.from("events").select("id,event_date,status,agreed_amount").eq("caterer_id",membership.caterer_id);
      const {data:leads}=await s.from("leads").select("id,review_status").eq("caterer_id",membership.caterer_id);
      const {data:payments}=financeAccess?await s.from("customer_payments").select("booking_id,amount,payment_date").eq("caterer_id",membership.caterer_id):{data:[]};
      const rows=events||[];
      const receipts=payments||[];
      const paidByBooking=new Map<string,number>();
      receipts.forEach(p=>{if(p.booking_id)paidByBooking.set(p.booking_id,(paidByBooking.get(p.booking_id)||0)+Number(p.amount));});
      const due=rows.reduce((sum,e)=>sum+Math.max(0,Number(e.agreed_amount||0)-(paidByBooking.get(e.id)||0)),0);
      setMetrics({
        upcoming:rows.filter(e=>e.event_date>=todayKey&&!["closed","cancelled","completed"].includes(e.status)).length,
        enquiries:(leads||[]).filter(l=>l.review_status==="needs_review").length,
        due,
        revenue:receipts.filter(p=>p.payment_date>=monthStart&&p.payment_date<=todayKey).reduce((sum,p)=>sum+Number(p.amount),0)
      });
      setLoading(false);
    };
    void load();
  },[router]);
  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#home"><span className="brand-mark">D</span><span>DHANDE’S<small> MILLENNIUM CATERING</small></span></a>
        <div className="side-label">WORKSPACE</div>
        <a className="nav-item active" href="#home"><span>⌂</span> Overview</a>
        <a className="nav-item" href="/events"><span>◷</span> Events</a>
        <a className="nav-item" href="#modules"><span>▤</span> Menu Studio</a>
        <a className="nav-item" href="#modules"><span>₹</span> Quotations</a>
        <a className="nav-item" href="#modules"><span>↗</span> Finance</a>
        <a className="nav-item" href="/leads"><span>◎</span> Enquiry inbox</a>\n        <a className="nav-item" href="/customers"><span>◉</span> Customers</a>
        <div className="sidebar-bottom"><div className="pilot-dot"/> Pilot workspace <span className="pilot-label">V1</span></div>
      </aside>

      <section className="main-content" id="home">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Overview</div><div className="topbar-right"><span className="date-label">CATERING OPERATIONS</span><a className="topbar-link" href="/login">Sign in</a><div className="avatar">D</div></div></header>
        <div className="welcome-row"><div><div className="eyebrow">YOUR BUSINESS, AT A GLANCE</div><h1>Good work starts<br className="mobile-break"/> with a clear view.</h1><p className="intro">A single place to keep every event, menu and payment in order.</p></div><button className="primary-button" type="button" onClick={() => { window.location.href = "/events/new"; }}>＋ <span>Create an event</span></button></div>

        <div className="metrics-grid">
          <article className="metric-card"><div className="metric-top"><span>UPCOMING EVENTS</span><span className="metric-icon">◷</span></div><div className="metric-value">{loading?"—":metrics.upcoming}</div><div className="metric-foot">Dated today or later, excluding closed and cancelled</div></article>
          <article className="metric-card"><div className="metric-top"><span>OPEN ENQUIRIES</span><span className="metric-icon">◎</span></div><div className="metric-value">{loading?"—":metrics.enquiries}</div><div className="metric-foot">Leads marked as needing review</div></article>
          <article className="metric-card"><div className="metric-top"><span>PAYMENTS DUE</span><span className="metric-icon">₹</span></div><div className="metric-value">{loading?"—":canViewFinance?inr(metrics.due):"Restricted"}</div><div className="metric-foot">Agreed booking amounts less linked receipts</div></article>
          <article className="metric-card accent-card"><div className="metric-top"><span>MONTHLY REVENUE</span><span className="metric-icon">↗</span></div><div className="metric-value">{loading?"—":canViewFinance?inr(metrics.revenue):"Restricted"}</div><div className="metric-foot">Receipts recorded this calendar month</div></article>
        </div>

        <div className="section-heading"><div><div className="eyebrow">STAY AHEAD</div><h2>What needs your attention</h2></div><span className="section-note">Your activity will show here</span></div>
        <div className="priority-list">{priorities.map((item) => <article className="priority-item" key={item.title}><div className="priority-time">{item.time}</div><div className="priority-copy"><h3>{item.title}</h3><p>{item.detail}</p></div><span className={`tag ${item.tone}`}>{item.tag}</span><span className="priority-arrow">↗</span></article>)}</div>

        <div className="section-heading modules-heading" id="modules"><div><div className="eyebrow">THE WORKSPACE</div><h2>Everything in its place</h2></div><span className="section-note">Built around the way catering works</span></div>
        <div className="modules-grid">{modules.map((module) => <a className="module-card" href={("href" in module && module.href) ? module.href : "#modules"} key={module.title}><div className="module-top"><span className="module-icon">{module.icon}</span><span className="module-number">{module.number}</span></div><h3>{module.title}</h3><p>{module.detail}</p><span className="module-link">Open module <span>→</span></span></a>)}</div>
        <footer className="footer"><span>DHANDE’S MILLENNIUM CATERING</span><span>Thoughtfully organised. Made for service.</span></footer>
      </section>
    </main>
  );
}
