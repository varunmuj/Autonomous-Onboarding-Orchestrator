# Requirements Document

## Introduction

Airr 3.0 is an Autonomous Onboarding Orchestrator that provides a self-driving onboarding system taking customers from contract signed to fully activated. The system orchestrates integrations, tasks, reminders, and blockers while providing real-time visibility into time-to-value metrics.

## Glossary

- **System**: The Airr 3.0 Autonomous Onboarding Orchestrator
- **Customer**: An organization that has signed a contract and needs onboarding
- **Stakeholder**: A person involved in the customer's onboarding process (owner, IT contact, etc.)
- **Integration**: External system connection required for customer activation (SIS, CRM, SFTP)
- **Task**: A specific action item in the onboarding process
- **Blocker**: An issue preventing onboarding progress
- **Go_Live_Date**: Target date for customer activation
- **Time_To_Value**: Duration from contract signing to full activation
- **Dashboard**: Live interface showing onboarding status and progress
- **Orchestrator**: n8n-driven automation engine managing task workflows

## Requirements

### Requirement 1: Customer Intake Management

**User Story:** As an onboarding manager, I want to capture and store customer details during intake, so that I can track all necessary information for successful onboarding.

#### Acceptance Criteria

1. WHEN a new customer is added, THE System SHALL capture customer name, contact information, and contract details
2. WHEN required integrations are specified, THE System SHALL store integration types and configuration requirements
3. WHEN stakeholders are identified, THE System SHALL record their roles, contact information, and responsibilities
4. WHEN a go-live date is set, THE System SHALL validate it is a future date and store it as the target activation date
5. THE System SHALL persist all customer intake data to Supabase immediately upon entry

### Requirement 2: Autonomous Task Orchestration

**User Story:** As an onboarding manager, I want the system to automatically generate and manage onboarding tasks, so that the process runs efficiently without manual intervention.

#### Acceptance Criteria

1. WHEN a customer intake is completed, THE Orchestrator SHALL automatically generate appropriate onboarding tasks based on customer requirements
2. WHEN tasks are created, THE System SHALL assign owners based on task type and stakeholder roles
3. WHEN task deadlines approach, THE Orchestrator SHALL trigger automated reminders to assigned owners
4. WHEN external events occur, THE System SHALL update task status automatically based on integration feedback
5. WHEN tasks become blocked, THE Orchestrator SHALL escalate to appropriate stakeholders with blocker details
6. THE Orchestrator SHALL use n8n workflows to manage all automated task operations

### Requirement 3: Live Dashboard Visualization

**User Story:** As a stakeholder, I want to view real-time onboarding progress through a dashboard, so that I can track status and identify issues quickly.

#### Acceptance Criteria

1. WHEN accessing the dashboard, THE System SHALL display the current onboarding stage for each active customer
2. WHEN viewing customer details, THE Dashboard SHALL show all tasks with their assigned owners and current status
3. WHEN blockers exist, THE Dashboard SHALL highlight them prominently with blocker descriptions and impact
4. WHEN calculating metrics, THE System SHALL display accurate time-to-value tracking for each customer
5. THE Dashboard SHALL update in real-time as task status and progress changes occur

### Requirement 4: Data Persistence and Reliability

**User Story:** As a system administrator, I want all onboarding data stored reliably in Supabase, so that the system maintains operational truth and can be managed by other engineers.

#### Acceptance Criteria

1. WHEN any data changes occur, THE System SHALL persist updates to Supabase immediately
2. WHEN the system starts, THE System SHALL load all current state from Supabase successfully
3. WHEN database operations fail, THE System SHALL handle errors gracefully and maintain data consistency
4. THE System SHALL maintain referential integrity between customers, tasks, stakeholders, and integrations
5. THE System SHALL provide audit trails for all significant onboarding events and status changes

### Requirement 5: Integration Management

**User Story:** As an IT contact, I want to configure and monitor required integrations, so that customer systems connect properly during onboarding.

#### Acceptance Criteria

1. WHEN integration requirements are defined, THE System SHALL store configuration details for SIS, CRM, and SFTP connections
2. WHEN integration setup begins, THE System SHALL provide clear instructions and requirements to stakeholders
3. WHEN integration tests are performed, THE System SHALL validate connectivity and report results
4. WHEN integration failures occur, THE System SHALL create blockers and notify appropriate stakeholders
5. THE System SHALL track integration completion status as part of overall onboarding progress

### Requirement 6: Deployment and Operations

**User Story:** As a DevOps engineer, I want the system to be deployable via Coolify and runnable by other engineers, so that it can be maintained and scaled effectively.

#### Acceptance Criteria

1. THE System SHALL be containerized and deployable through Coolify platform
2. WHEN deployed, THE System SHALL connect to Supabase and n8n instances successfully
3. THE System SHALL include comprehensive documentation for setup and operation
4. WHEN configuration changes are needed, THE System SHALL support environment-based configuration
5. THE System SHALL provide health checks and monitoring endpoints for operational visibility