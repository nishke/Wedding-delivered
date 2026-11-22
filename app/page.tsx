"use client";

const priorities = [
  { time: "Today", title: "Review new enquiries", detail: "Keep every incoming lead accounted for", tag: "Leads", tone: "amber" },
  { time: "Upcoming", title: "Confirm event requirements", detail: "Guest count, menu and venue details", tag: "Events", tone: "blue" },
  { time: "Follow-up", title: "Check pending collections", detail: "Track advances and outstanding balances", tag: "Finance", tone: "green" },
];

const modules = [
  { number: "01", title: "Events", detail: "Enquiries, bookings and event execution", icon: "◷" },
  { number: "02", title: "Menu Studio", detail: "Standardise menus and create documents", icon: "▤" },
  { number: "03", title: "Quotations", detail: "Custom pricing, revisions and sharing", icon: "₹" },
  { number: "04", title: "Finance", detail: "Payments, expenses and event profit", icon: "↗" },
  { number: "05", title: "Food planning", detail: "Dish quantities, buffers and purchases", icon: "✳" },
  { number: "06", title: "Customers & leads", detail: "Customer records and enquiry inbox", icon: "◎" },
];

export default function Home() {
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
        <a className="nav-item" href="#modules"><span>◎</span> Customers & leads</a>
        <div className="sidebar-bottom"><div className="pilot-dot"/> Pilot workspace <span className="pilot-label">V1</span></div>
      </aside>

      <section className="main-content" id="home">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Overview</div><div className="topbar-right"><span className="date-label">CATERING OPERATIONS</span><a className="topbar-link" href="/login">Sign in</a><div className="avatar">D</div></div></header>
        <div className="welcome-row"><div><div className="eyebrow">YOUR BUSINESS, AT A GLANCE</div><h1>Good work starts<br className="mobile-break"/> with a clear view.</h1><p className="intro">A single place to keep every event, menu and payment in order.</p></div><button className="primary-button" type="button" onClick={() => { window.location.href = "/events/new"; }}>＋ <span>Create an event</span></button></div>

        <div className="metrics-grid">
          <article className="metric-card"><div className="metric-top"><span>UPCOMING EVENTS</span><span className="metric-icon">◷</span></div><div className="metric-value">—</div><div className="metric-foot">Your next events will appear here</div></article>
          <article className="metric-card"><div className="metric-top"><span>OPEN ENQUIRIES</span><span className="metric-icon">◎</span></div><div className="metric-value">—</div><div className="metric-foot">New leads awaiting review</div></article>
          <article className="metric-card"><div className="metric-top"><span>PAYMENTS DUE</span><span className="metric-icon">₹</span></div><div className="metric-value">—</div><div className="metric-foot">Outstanding customer balances</div></article>
          <article className="metric-card accent-card"><div className="metric-top"><span>MONTHLY REVENUE</span><span className="metric-icon">↗</span></div><div className="metric-value">—</div><div className="metric-foot">Recorded collections this month</div></article>
        </div>

        <div className="section-heading"><div><div className="eyebrow">STAY AHEAD</div><h2>What needs your attention</h2></div><span className="section-note">Your activity will show here</span></div>
        <div className="priority-list">{priorities.map((item) => <article className="priority-item" key={item.title}><div className="priority-time">{item.time}</div><div className="priority-copy"><h3>{item.title}</h3><p>{item.detail}</p></div><span className={`tag ${item.tone}`}>{item.tag}</span><span className="priority-arrow">↗</span></article>)}</div>

        <div className="section-heading modules-heading" id="modules"><div><div className="eyebrow">THE WORKSPACE</div><h2>Everything in its place</h2></div><span className="section-note">Built around the way catering works</span></div>
        <div className="modules-grid">{modules.map((module) => <a className="module-card" href="#modules" key={module.title}><div className="module-top"><span className="module-icon">{module.icon}</span><span className="module-number">{module.number}</span></div><h3>{module.title}</h3><p>{module.detail}</p><span className="module-link">Open module <span>→</span></span></a>)}</div>
        <footer className="footer"><span>DHANDE’S MILLENNIUM CATERING</span><span>Thoughtfully organised. Made for service.</span></footer>
      </section>
    </main>
  );
}
