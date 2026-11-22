"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Customer = { id: string; full_name: string; phone: string | null; email: string | null; address: string | null; created_at: string };

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: membership, error: membershipError } = await supabase
        .from("caterer_memberships").select("caterer_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (membershipError || !membership) { router.replace("/setup"); return; }
      const { data, error } = await supabase.from("customers")
        .select("id,full_name,phone,email,address,created_at")
        .eq("caterer_id", membership.caterer_id).order("full_name", { ascending: true });
      if (error) setMessage("Could not load customers: " + error.message);
      else setCustomers((data || []) as Customer[]);
      setLoading(false);
    };
    void load();
  }, [router]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.full_name, customer.phone, customer.email, customer.address]
        .some((value) => value?.toLocaleLowerCase().includes(term))
    );
  }, [customers, query]);

  return (
    <main className="auth-shell">
      <section className="auth-card event-card events-list-card">
        <Link className="back-link" href="/">← Workspace</Link>
        <div className="eyebrow">WORKSPACE · CUSTOMER RECORDS</div>
        <div className="events-title-row">
          <div><h1>Customers.</h1><p>One record for every customer relationship.</p></div>
          <span className="customer-count">{customers.length} {customers.length === 1 ? "record" : "records"}</span>
        </div>
        <label className="customer-search">
          <span>SEARCH CUSTOMERS</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, email or address" />
        </label>
        {loading ? <p>Loading customers…</p> : message ? <p className="auth-message" role="alert">{message}</p> :
          filtered.length === 0 ? <div className="events-empty"><h2>{customers.length ? "No matching customers." : "No customer records yet."}</h2><p>{customers.length ? "Try a different search." : "Customer records will appear here when you create events."}</p></div> :
          <div className="customer-directory">
            {filtered.map((customer) => <Link className="customer-directory-row" href={"/customers/"+customer.id} key={customer.id}>
              <div className="customer-avatar">{customer.full_name.trim().charAt(0).toLocaleUpperCase()}</div>
              <div className="customer-directory-main"><strong>{customer.full_name}</strong><span>{customer.phone || "No phone recorded"}{customer.email ? " · " + customer.email : ""}</span>{customer.address && <small>{customer.address}</small>}</div>
            </Link>)}
          </div>
        }
      </section>
    </main>
  );
}
