"use client";

import { useState, useEffect } from "react";
import { EventsAudit } from "@/lib/types";
import { AuditSummary } from "@/lib/audit-trail";

interface AuditFilters {
  entity_type?: string;
  entity_id?: string;
  event_type?: string;
  onboarding_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export default function AuditPage() {
  const [auditRecords, setAuditRecords] = useState<EventsAudit[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({
    limit: 50
  });
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value.toString());
        }
      });

      if (showSummary) {
        params.append('summary', 'true');
      }

      const response = await fetch(`/api/audit?${params}`);
      const data = await response.json();

      if (showSummary) {
        setSummary(data.summary);
        setAuditRecords([]);
      } else {
        setAuditRecords(data.audit_records || []);
        setSummary(null);
      }
    } catch (error) {
      console.error("Failed to fetch audit data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata) return "No metadata";
    
    const important = {
      onboarding_id: metadata.onboarding_id,
      customer_name: metadata.customer_name,
      source: metadata.source,
      trigger: metadata.trigger,
    };

    return Object.entries(important)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Audit Trail</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Entity Type</label>
            <select
              value={filters.entity_type || ""}
              onChange={(e) => handleFilterChange("entity_type", e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All</option>
              <option value="customer">Customer</option>
              <option value="onboarding">Onboarding</option>
              <option value="task">Task</option>
              <option value="stakeholder">Stakeholder</option>
              <option value="integration">Integration</option>
              <option value="blocker">Blocker</option>
              <option value="escalation">Escalation</option>
              <option value="system">System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Entity ID</label>
            <input
              type="text"
              value={filters.entity_id || ""}
              onChange={(e) => handleFilterChange("entity_id", e.target.value)}
              placeholder="Enter entity ID"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Onboarding ID</label>
            <input
              type="text"
              value={filters.onboarding_id || ""}
              onChange={(e) => handleFilterChange("onboarding_id", e.target.value)}
              placeholder="Enter onboarding ID"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date From</label>
            <input
              type="date"
              value={filters.date_from || ""}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date To</label>
            <input
              type="date"
              value={filters.date_to || ""}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Limit</label>
            <select
              value={filters.limit || 50}
              onChange={(e) => handleFilterChange("limit", e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <button
            onClick={() => {
              setShowSummary(false);
              fetchAuditData();
            }}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Search Records"}
          </button>
          
          <button
            onClick={() => {
              setShowSummary(true);
              fetchAuditData();
            }}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Generate Summary"}
          </button>

          <button
            onClick={() => {
              setFilters({ limit: 50 });
              setAuditRecords([]);
              setSummary(null);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary View */}
      {summary && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Audit Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-800">Total Events</h3>
              <p className="text-2xl font-bold text-blue-600">{summary.total_events}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold text-green-800">Date Range</h3>
              <p className="text-sm text-green-600">
                {formatDate(summary.date_range.earliest)} - {formatDate(summary.date_range.latest)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Events by Type</h3>
              <div className="space-y-1">
                {Object.entries(summary.events_by_type).map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="text-sm">{type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Events by Entity</h3>
              <div className="space-y-1">
                {Object.entries(summary.events_by_entity).map(([entity, count]) => (
                  <div key={entity} className="flex justify-between">
                    <span className="text-sm">{entity}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {summary.most_active_entities.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Most Active Entities</h3>
              <div className="space-y-1">
                {summary.most_active_entities.slice(0, 5).map((entity, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-sm">{entity.entity_type}:{entity.entity_id}</span>
                    <span className="font-medium">{entity.event_count} events</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Records View */}
      {auditRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Audit Records ({auditRecords.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {auditRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.entity_type}</div>
                      <div className="text-sm text-gray-500">{record.entity_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {record.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatMetadata(record.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !summary && auditRecords.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No audit records found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}