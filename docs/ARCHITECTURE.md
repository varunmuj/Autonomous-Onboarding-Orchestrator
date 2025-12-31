# Architecture & Workflow Design Rationale

## Executive Summary

Airr 3.0's Autonomous Onboarding Orchestrator is architected with **production thinking over demos**, emphasizing clarity, durability, and operational correctness. The system treats onboarding as a core domain workflow owned by the application, using external tools only for execution and automation.

## Core Architectural Decisions

### 1. Workflow Ownership: Application-First

**Decision**: Onboarding workflow logic lives inside the product, not in external automation tools.

**Rationale**: 
Onboarding is not a background automation problem — it is a **core domain workflow** that must be:
- **Deterministic and explainable**: Every state transition is explicit and auditable
- **Auditable over time**: Complete history preserved for compliance and debugging  
- **Easy to evolve**: Business rules change without breaking existing workflows
- **Visible in real time**: Operators and customers see true operational state

**Implementation**:
- State-driven workflow with explicit stages (Intake → Integrations Pending → Blocked → Ready for Go-Live → Completed)
- All transitions persisted in Supabase with timestamps and metadata
- Real-time UI updates through Supabase subscriptions
- Business rules versionable alongside application code

**Benefits**:
- Product is the system of record
- Workflow state is queryable, debuggable, and replayable
- No hidden state in external tools
- UI always reflects true operational state

### 2. n8n Role: Execution Layer Only

**Decision**: n8n handles asynchronous execution and automation, not business logic.

**Rationale**:
Embedding core business workflows inside automation tools leads to:
- Hidden state that's difficult to debug
- Fragile coupling between tools and business logic
- Version control challenges for workflow changes
- Operational opacity for support teams

**Implementation**:
- Application emits explicit events (`ONBOARDING_STARTED`, `TASK_BLOCKED_24H`, `ONBOARDING_COMPLETED`)
- n8n workflows triggered by webhooks for specific automation needs
- n8n handles: reminders, escalations, delays, retries, external notifications
- All state changes flow back to Supabase for consistency

**Benefits**:
- Clear separation of concerns
- Business logic remains testable and explicit
- Automation scales independently
- No vendor lock-in at the logic layer

### 3. Data Architecture: Supabase as Source of Truth

**Decision**: All operational state lives in Supabase with real-time subscriptions.

**Rationale**:
- Single source of truth for all onboarding data
- Real-time capabilities for live dashboard updates
- PostgreSQL provides ACID guarantees for data consistency
- Built-in audit capabilities with row-level security

**Implementation**:
- Comprehensive schema with referential integrity
- Real-time subscriptions for UI updates
- Audit trail table for all significant events
- Property-based testing for data consistency

### 4. Testing Strategy: Property-Based + Unit Testing

**Decision**: Dual testing approach with emphasis on property-based testing.

**Rationale**:
- Property-based tests validate universal correctness across input space
- Unit tests handle specific examples and edge cases
- Mathematical guarantees about system behavior
- Catches edge cases that traditional testing misses

**Implementation**:
- fast-check for TypeScript property-based testing
- Minimum 100 iterations per property test
- Properties map directly to requirements
- Comprehensive API consistency validation

## System Boundaries

### What the Application Owns
- **Customer onboarding state**: Current stage, progress, blockers
- **Business rules**: Task generation logic, escalation policies
- **Data integrity**: Referential integrity, validation, audit trails
- **User experience**: Real-time updates, dashboard, forms
- **API contracts**: Consistent error handling, response formats

### What n8n Owns
- **Asynchronous execution**: Delays, scheduled tasks, retries
- **External notifications**: Email, Slack, SMS integrations
- **Event-driven automation**: Reminders, escalations, monitoring
- **Integration reliability**: Circuit breakers, backoff strategies

### What Supabase Owns
- **Data persistence**: All operational data storage
- **Real-time updates**: Live subscriptions for UI
- **Access control**: Row-level security (future)
- **Backup and recovery**: Data durability guarantees

## Scalability Considerations

### Horizontal Scaling
- Stateless Next.js application servers
- Supabase handles database scaling
- n8n workflows scale independently
- CDN for static assets

### Performance Optimization
- Database indexing for common queries
- Real-time subscription filtering
- API response caching where appropriate
- Lazy loading for dashboard components

### Reliability Patterns
- Circuit breakers for external integrations
- Retry logic with exponential backoff
- Graceful degradation for non-critical features
- Health checks for all system components

## Evolution Path

### Phase 1: Foundation (Current)
- Core workflow implementation
- Basic automation with n8n
- Property-based testing framework
- Real-time dashboard

### Phase 2: Intelligence
- AI-driven task creation
- Risk prediction algorithms
- Dynamic SLA adjustments
- Intelligent stakeholder assignment

### Phase 3: Enterprise
- Multi-tenant architecture
- Advanced analytics
- Integration marketplace
- Role-based access control

### Phase 4: Scale
- Microservices decomposition (if needed)
- Advanced monitoring and alerting
- Global deployment
- Enterprise security features

## Design Principles

### 1. Explicit Over Implicit
- All state transitions are explicit and logged
- No magic behavior or hidden automation
- Clear API contracts with comprehensive validation

### 2. Testable Over Clever
- Property-based testing for mathematical guarantees
- Simple, predictable code over complex optimizations
- Comprehensive test coverage for all business logic

### 3. Observable Over Opaque
- Complete audit trails for all operations
- Real-time visibility into system state
- Health checks and monitoring endpoints

### 4. Evolvable Over Perfect
- Business rules can change without system rewrites
- Modular architecture supports incremental improvements
- Version control for all configuration and logic

## Conclusion

This architecture prioritizes **operational correctness** and **long-term maintainability** over short-term convenience. By keeping business logic in the application and using external tools only for their strengths, the system remains transparent, debuggable, and evolvable.

The result is a foundation that can scale from POC to production while maintaining the clarity and reliability required for mission-critical onboarding operations.