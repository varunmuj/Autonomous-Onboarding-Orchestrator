# Autonomous Onboarding Orchestrator

Airr 3.0 – Autonomous Onboarding Orchestrator POC.

This repository contains a working proof of concept demonstrating
an automated onboarding workflow using Next.js, Supabase, and n8n.

# Autonomous Onboarding Orchestrator

## Overview
This repository contains a working proof of concept built as part of the Airr 3.0 sprint.  
The system demonstrates an autonomous onboarding workflow that reduces manual coordination by using system-driven task orchestration, status tracking, and auditability.

---

## What This POC Does
- Accepts onboarding intake through a web interface
- Automatically generates onboarding tasks
- Orchestrates execution using n8n workflows
- Tracks onboarding status and blockers
- Measures time-to-value
- Maintains an audit trail for traceability

---

## Tech Stack
- Frontend & Backend: Next.js
- Database: Supabase (Postgres)
- Workflow Orchestration: n8n
- Deployment: Docker + Coolify

---

## Local Setup (Under 15 Minutes)

### Prerequisites
- Node.js 18+
- Supabase project
- n8n instance (local or hosted)

### Steps
1. Clone the repository
2. Configure environment variables
3. Run database migrations
4. Start the application

Detailed steps will be added as the POC is finalized.

---

## n8n Workflow
The onboarding workflow is triggered on onboarding creation and is responsible for:
- Generating onboarding tasks
- Assigning owner roles
- Updating onboarding status
- Logging execution events

The workflow export is included in the repository.

---

## What Was Intentionally Cut
To stay within the sprint timebox, the following were intentionally excluded:
- Authentication and role-based access
- Real email or messaging integrations
- Advanced exception handling
- Customer-facing views

---

## Deployment Notes
The application includes a Dockerfile and is designed to be deployed via Coolify on a NAS setup.
Environment variables, ports, and build steps are documented in the deployment section.

---

## Next Steps
- Role-based access using Supabase RLS
- SLA-based reminders and escalations
- AI-assisted onboarding planning
- Cross-account analytics and reporting

