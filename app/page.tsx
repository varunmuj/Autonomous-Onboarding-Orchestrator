"use client";

import { useState } from "react";
import { CreateOnboardingRequest, Stakeholder, Integration } from "@/lib/types";
import { DEMO_MODE } from "@/lib/demo-data";

export default function Home() {
  // Customer data
  const [customerName, setCustomerName] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState<'small' | 'medium' | 'large' | 'enterprise' | ''>("");
  const [goLiveDate, setGoLiveDate] = useState("");

  // Stakeholders
  const [stakeholders, setStakeholders] = useState<Omit<Stakeholder, 'id' | 'onboarding_id' | 'created_at'>[]>([]);
  const [newStakeholder, setNewStakeholder] = useState({
    role: 'owner' as const,
    name: '',
    email: '',
    phone: '',
    responsibilities: ['']
  });

  // Integrations
  const [integrations, setIntegrations] = useState<Omit<Integration, 'id' | 'onboarding_id' | 'created_at' | 'status'>[]>([]);
  const [newIntegration, setNewIntegration] = useState({
    type: 'SIS' as const,
    name: '',
    configuration: {}
  });

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addStakeholder = () => {
    if (newStakeholder.name && newStakeholder.email) {
      setStakeholders([...stakeholders, {
        ...newStakeholder,
        responsibilities: newStakeholder.responsibilities.filter(r => r.trim() !== '')
      }]);
      setNewStakeholder({
        role: 'owner',
        name: '',
        email: '',
        phone: '',
        responsibilities: ['']
      });
    }
  };

  const removeStakeholder = (index: number) => {
    setStakeholders(stakeholders.filter((_, i) => i !== index));
  };

  const addIntegration = () => {
    if (newIntegration.name) {
      setIntegrations([...integrations, newIntegration]);
      setNewIntegration({
        type: 'SIS',
        name: '',
        configuration: {}
      });
    }
  };

  const removeIntegration = (index: number) => {
    setIntegrations(integrations.filter((_, i) => i !== index));
  };

  const updateResponsibility = (index: number, value: string) => {
    const updated = [...newStakeholder.responsibilities];
    updated[index] = value;
    setNewStakeholder({ ...newStakeholder, responsibilities: updated });
  };

  const addResponsibility = () => {
    setNewStakeholder({
      ...newStakeholder,
      responsibilities: [...newStakeholder.responsibilities, '']
    });
  };

  const removeResponsibility = (index: number) => {
    const updated = newStakeholder.responsibilities.filter((_, i) => i !== index);
    setNewStakeholder({ ...newStakeholder, responsibilities: updated });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("Creating onboarding...");

    const requestData: CreateOnboardingRequest = {
      customer_name: customerName,
      contract_start_date: contractDate,
      contact_email: contactEmail || undefined,
      industry: industry || undefined,
      size: size || undefined,
      go_live_date: goLiveDate || undefined,
      stakeholders,
      integrations
    };

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ Onboarding created successfully! ID: ${data.onboarding_id}`);
        // Reset form
        setCustomerName("");
        setContractDate("");
        setContactEmail("");
        setIndustry("");
        setSize("");
        setGoLiveDate("");
        setStakeholders([]);
        setIntegrations([]);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("❌ Network error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "40px" }}>
        <h1>Airr 3.0 - Autonomous Onboarding Orchestrator</h1>
        {DEMO_MODE && (
          <div style={{ 
            backgroundColor: "#fff3cd", 
            border: "1px solid #ffeaa7", 
            padding: "10px 15px", 
            borderRadius: "8px", 
            marginBottom: "15px",
            color: "#856404"
          }}>
            🎭 <strong>Demo Mode</strong> - Using mock data. Configure Supabase to use real data.
          </div>
        )}
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Production-ready autonomous onboarding system with state-driven workflows
        </p>
        <nav style={{ marginBottom: "30px" }}>
          <a href="/" style={{ marginRight: "20px", color: "#0070f3" }}>Customer Intake</a>
          <a href="/dashboard" style={{ color: "#0070f3" }}>Dashboard</a>
        </nav>
      </div>

      <h2>New Customer Onboarding</h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Customer Information */}
        <fieldset style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px" }}>
          <legend><strong>Customer Information</strong></legend>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label><strong>Customer Name *</strong></label>
              <input
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div>
              <label><strong>Contract Start Date *</strong></label>
              <input
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label><strong>Contact Email</strong></label>
              <input
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            <div>
              <label><strong>Industry</strong></label>
              <input
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>

            <div>
              <label><strong>Company Size</strong></label>
              <select
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                value={size}
                onChange={(e) => setSize(e.target.value as any)}
              >
                <option value="">Select size...</option>
                <option value="small">Small (1-50 employees)</option>
                <option value="medium">Medium (51-200 employees)</option>
                <option value="large">Large (201-1000 employees)</option>
                <option value="enterprise">Enterprise (1000+ employees)</option>
              </select>
            </div>

            <div>
              <label><strong>Target Go-Live Date</strong></label>
              <input
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                type="date"
                value={goLiveDate}
                onChange={(e) => setGoLiveDate(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* Stakeholders */}
        <fieldset style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px" }}>
          <legend><strong>Stakeholders</strong></legend>
          
          {stakeholders.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h4>Added Stakeholders:</h4>
              {stakeholders.map((stakeholder, index) => (
                <div key={index} style={{ 
                  border: "1px solid #eee", 
                  padding: "10px", 
                  marginBottom: "10px", 
                  borderRadius: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <strong>{stakeholder.name}</strong> ({stakeholder.role}) - {stakeholder.email}
                    <br />
                    <small>Responsibilities: {stakeholder.responsibilities.join(", ")}</small>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeStakeholder(index)}
                    style={{ background: "#ff4444", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ border: "1px solid #eee", padding: "15px", borderRadius: "4px", backgroundColor: "#f9f9f9" }}>
            <h4>Add New Stakeholder:</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label>Role</label>
                <select
                  style={{ width: "100%", padding: "5px" }}
                  value={newStakeholder.role}
                  onChange={(e) => setNewStakeholder({ ...newStakeholder, role: e.target.value as any })}
                >
                  <option value="owner">Owner</option>
                  <option value="it_contact">IT Contact</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="technical_lead">Technical Lead</option>
                </select>
              </div>
              <div>
                <label>Name</label>
                <input
                  style={{ width: "100%", padding: "5px" }}
                  value={newStakeholder.name}
                  onChange={(e) => setNewStakeholder({ ...newStakeholder, name: e.target.value })}
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  style={{ width: "100%", padding: "5px" }}
                  type="email"
                  value={newStakeholder.email}
                  onChange={(e) => setNewStakeholder({ ...newStakeholder, email: e.target.value })}
                />
              </div>
              <div>
                <label>Phone</label>
                <input
                  style={{ width: "100%", padding: "5px" }}
                  value={newStakeholder.phone}
                  onChange={(e) => setNewStakeholder({ ...newStakeholder, phone: e.target.value })}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: "10px" }}>
              <label>Responsibilities</label>
              {newStakeholder.responsibilities.map((resp, index) => (
                <div key={index} style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
                  <input
                    style={{ flex: 1, padding: "5px" }}
                    value={resp}
                    onChange={(e) => updateResponsibility(index, e.target.value)}
                    placeholder="Enter responsibility..."
                  />
                  {newStakeholder.responsibilities.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeResponsibility(index)}
                      style={{ background: "#ff4444", color: "white", border: "none", padding: "5px", borderRadius: "4px" }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button" 
                onClick={addResponsibility}
                style={{ background: "#0070f3", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", fontSize: "12px" }}
              >
                + Add Responsibility
              </button>
            </div>

            <button 
              type="button" 
              onClick={addStakeholder}
              style={{ background: "#28a745", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px" }}
            >
              Add Stakeholder
            </button>
          </div>
        </fieldset>

        {/* Integrations */}
        <fieldset style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px" }}>
          <legend><strong>Required Integrations</strong></legend>
          
          {integrations.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h4>Added Integrations:</h4>
              {integrations.map((integration, index) => (
                <div key={index} style={{ 
                  border: "1px solid #eee", 
                  padding: "10px", 
                  marginBottom: "10px", 
                  borderRadius: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <strong>{integration.name}</strong> ({integration.type})
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeIntegration(index)}
                    style={{ background: "#ff4444", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ border: "1px solid #eee", padding: "15px", borderRadius: "4px", backgroundColor: "#f9f9f9" }}>
            <h4>Add New Integration:</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label>Type</label>
                <select
                  style={{ width: "100%", padding: "5px" }}
                  value={newIntegration.type}
                  onChange={(e) => setNewIntegration({ ...newIntegration, type: e.target.value as any })}
                >
                  <option value="SIS">SIS (Student Information System)</option>
                  <option value="CRM">CRM (Customer Relationship Management)</option>
                  <option value="SFTP">SFTP (File Transfer)</option>
                  <option value="API">API Integration</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label>Integration Name</label>
                <input
                  style={{ width: "100%", padding: "5px" }}
                  value={newIntegration.name}
                  onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
                  placeholder="e.g., PowerSchool SIS, Salesforce CRM..."
                />
              </div>
            </div>

            <button 
              type="button" 
              onClick={addIntegration}
              style={{ background: "#28a745", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px" }}
            >
              Add Integration
            </button>
          </div>
        </fieldset>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ 
            background: isSubmitting ? "#ccc" : "#0070f3", 
            color: "white", 
            border: "none", 
            padding: "15px 30px", 
            borderRadius: "8px", 
            fontSize: "16px",
            cursor: isSubmitting ? "not-allowed" : "pointer"
          }}
        >
          {isSubmitting ? "Creating Onboarding..." : "Start Autonomous Onboarding"}
        </button>
      </form>

      {message && (
        <div style={{ 
          marginTop: "20px", 
          padding: "15px", 
          borderRadius: "8px",
          backgroundColor: message.includes("✅") ? "#d4edda" : "#f8d7da",
          border: `1px solid ${message.includes("✅") ? "#c3e6cb" : "#f5c6cb"}`,
          color: message.includes("✅") ? "#155724" : "#721c24"
        }}>
          {message}
        </div>
      )}
    </main>
  );
}


