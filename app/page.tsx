"use client";

import { useState } from "react";

export default function Home() {
  const [customerName, setCustomerName] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Creating onboarding...");

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_name: customerName,
        contract_start_date: contractDate,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage(`Onboarding created: ${data.onboarding_id}`);
      setCustomerName("");
      setContractDate("");
    } else {
      setMessage("Error creating onboarding");
    }
  }

  return (
    <main style={{ padding: "40px", maxWidth: "500px" }}>
      <h2>New Customer Onboarding</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Customer Name</label>
          <br />
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Contract Start Date</label>
          <br />
          <input
            type="date"
            value={contractDate}
            onChange={(e) => setContractDate(e.target.value)}
            required
          />
        </div>

        <br />

        <button type="submit">Start Onboarding</button>
      </form>

      <br />

      {message && <p>{message}</p>}
    </main>
  );
}


