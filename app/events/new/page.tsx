"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CustomerMatch = { id: string; full_name: string; phone: string | null };

function normaliseName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function phoneMatchPattern(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return "^" + [...digits].map((digit) => digit).join("\D*") + "$";
}

export default function NewEventPage() {
  const router = useRouter();
  const [catererId, setCatererId] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [message, setMessage] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerCheckMessage, setCustomerCheckMessage] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [guests, setGuests] = useState("100");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("enquiry");

  useEffect(() => {
    const load = async () => {
      const s = createClient();
      const { data: { user } } = await s.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data, error } = await s.from("caterer_memberships").select("caterer_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (error || !data) { router.replace("/setup"); return; }
      setCatererId(data.caterer_id);
    };
    load();
  }, [router]);

  async function checkCustomer() {
    setMatches([]);
    setSelectedCustomerId("");
    setCustomerCheckMessage("");
    const pattern = phoneMatchPattern(phone);
    if (!pattern) {
      setCustomerCheckMessage("Enter a phone number with at least 7 digits to check for an existing customer.");
      return;
    }
    if (!customer.trim()) {
      setCustomerCheckMessage("Enter the customer’s full name first.");
      return;
    }
    if (!catererId) return;
    setCheckingCustomer(true);
    const s = createClient();
    const { data, error } = await s.from("customers").select("id,full_name,phone").eq("caterer_id", catererId).not("phone", "is", null).filter("phone", "match", pattern).limit(20);
    setCheckingCustomer(false);
    if (error) {
      setCustomerCheckMessage("Could not check existing customers. You can still continue and create a new record.");
      return;
    }
    const found = (data || []) as CustomerMatch[];
    setMatches(found);
    const exact = found.find((item) => normaliseName(item.full_name) === normaliseName(customer));
    if (exact) {
      setSelectedCustomerId(exact.id);
      setCustomerCheckMessage("We found a customer with the same name and phone number. We’ll use this record unless you choose otherwise.");
    } else if (found.length) {
      setCustomerCheckMessage("This phone number is already on another customer record. Review it before deciding whether to reuse that record or create a separate one.");
    } else {
      setCustomerCheckMessage("No matching phone number found. A new customer record will be created.");
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!catererId) return;
    setBusy(true);
    setMessage("");
    const s = createClient();
    const { data: eventId, error } = await s.rpc("create_event_with_customer", {
      p_caterer_id: catererId,
      p_customer_id: selectedCustomerId || null,
      p_customer_name: customer.trim().replace(/\s+/g, " "),
      p_customer_phone: phone.trim() || null,
      p_event_name: eventName.trim(),
      p_event_type: eventType,
      p_event_date: date,
      p_venue: venue.trim() || null,
      p_expected_guest_count: Number(guests),
      p_quoted_amount: amount ? Number(amount) : null,
      p_status: status
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    router.push("/events/" + eventId);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card event-card">
        <Link className="back-link" href="/">← Workspace</Link>
        <div className="eyebrow">EVENTS · NEW RECORD</div>
        <h1>Create an event.</h1>
        <p>Start with the customer and the essentials. You can refine the plan later.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>Customer full name
            <input required value={customer} onChange={(e) => { setCustomer(e.target.value); setMatches([]); setSelectedCustomerId(""); setCustomerCheckMessage(""); }} onBlur={() => { if (phone.trim() && customer.trim()) void checkCustomer(); }} />
          </label>
          <label>Customer phone
            <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setMatches([]); setSelectedCustomerId(""); setCustomerCheckMessage(""); }} onBlur={() => { if (phone.trim() && customer.trim()) void checkCustomer(); }} />
          </label>
          {customerCheckMessage && <div className="customer-match-note" role="status">{customerCheckMessage}</div>}
          {checkingCustomer && <p className="customer-match-note">Checking customer records…</p>}
          {matches.length > 0 && (
            <div className="customer-match-list">
              <strong>Possible existing customers</strong>
              {matches.map((match) => (
                <div className="customer-match-row" key={match.id}>
                  <div><b>{match.full_name}</b><small>{match.phone}</small></div>
                  <button type="button" className="text-button" onClick={() => { setSelectedCustomerId(match.id); setCustomerCheckMessage("Existing customer selected. This event will be linked to that customer."); }}>Use this record</button>
                </div>
              ))}
              <button type="button" className="text-button" onClick={() => { setSelectedCustomerId(""); setMatches([]); setCustomerCheckMessage("A separate customer record will be created for this event."); }}>Create a separate customer</button>
            </div>
          )}
          <div className="form-pair">
            <label>Event name<input required value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Sharma wedding" /></label>
            <label>Event type<select value={eventType} onChange={(e) => setEventType(e.target.value)}><option>Wedding</option><option>Reception</option><option>Corporate</option><option>Birthday</option><option>Religious</option><option>Other</option></select></label>
          </div>
          <div className="form-pair">
            <label>Event date<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Expected guests<input type="number" min="1" required value={guests} onChange={(e) => setGuests(e.target.value)} /></label>
          </div>
          <label>Venue<input value={venue} onChange={(e) => setVenue(e.target.value)} /></label>
          <div className="form-pair">
            <label>Quoted amount (₹)<input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label>Initial status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="enquiry">Enquiry</option><option value="quotation_in_progress">Quotation in progress</option><option value="tentative">Tentative</option><option value="confirmed">Confirmed</option></select></label>
          </div>
          <button className="primary-button" disabled={busy || !catererId}>{busy ? "Creating event…" : "Save event"}</button>
        </form>
        {message && <p className="auth-message" role="alert">{message}</p>}
      </section>
    </main>
  );
}
