# Project Structure

This document explains the organization and purpose of each directory and key file in the Airr 3.0 Autonomous Onboarding Orchestrator.

## Root Directory Structure

```
├── .kiro/                          # Kiro specifications and planning
│   └── specs/autonomous-onboarding-orchestrator/
│       ├── requirements.md         # EARS-compliant requirements
│       ├── design.md              # System design and architecture
│       └── tasks.md               # Implementation task breakdown
├── app/                           # Next.js App Router application
│   ├── api/                       # API route handlers
│   ├── dashboard/                 # Dashboard page components
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Home page component
├── docs/                         # Architecture and design documentation
│   ├── ARCHITECTURE.md           # Detailed architecture rationale
│   └── PROJECT_STRUCTURE.md      # This file
├── lib/                          # Shared utilities and types
│   ├── types.ts                  # TypeScript type definitions
│   ├── types.test.ts             # Property-based tests for data models
│   ├── api-endpoints.test.ts     # Property-based tests for API endpoints
│   ├── test-utils.ts             # Testing utilities and helpers
│   └── supabase.ts               # Supabase client configuration
├── n8n/                          # n8n workflow definitions
│   └── onboarding_orchestrator.json  # Main onboarding workflow
├── public/                       # Static assets
├── supabase/                     # Database schema and migrations
│   └── migrations.sql            # Database schema definition
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Test configuration
└── README.md                     # Project overview and setup
```

## Key Directories Explained

### `.kiro/specs/`
Contains the complete specification for the autonomous onboarding orchestrator:
- **requirements.md**: EARS-pattern requirements with acceptance criteria
- **design.md**: System architecture, data models, and correctness properties
- **tasks.md**: Implementation task breakdown with property-based testing tasks

### `app/api/`
Next.js API routes implementing the backend functionality:

```
app/api/
├── onboarding/
│   └── route.ts                  # Customer intake and onboarding creation
├── stakeholders/
│   ├── route.ts                  # Create stakeholder records
│   ├── [onboarding_id]/
│   │   └── route.ts              # Get stakeholders by onboarding ID
│   └── update/[id]/
│       └── route.ts              # Update individual stakeholders
└── integrations/
    ├── route.ts                  # Create integration requirements
    ├── [onboarding_id]/
    │   └── route.ts              # Get integrations by onboarding ID
    └── update/[id]/
        └── route.ts              # Update integration configuration
```

**Design Principles**:
- RESTful API design with consistent error handling
- Comprehensive input validation and sanitization
- Audit logging for all significant operations
- Proper HTTP status codes and error messages

### `lib/`
Shared utilities, types, and testing infrastructure:

- **types.ts**: Complete TypeScript definitions for all data models
- **types.test.ts**: Property-based tests for core data persistence
- **api-endpoints.test.ts**: Property-based tests for API consistency
- **test-utils.ts**: Shared testing utilities and mock helpers
- **supabase.ts**: Supabase client configuration and helpers

### `supabase/`
Database schema and migration files:
- **migrations.sql**: Complete database schema with all tables, relationships, and constraints
- Includes audit trail tables and proper indexing
- Referential integrity enforced at database level

### `n8n/`
Workflow definitions for the orchestration layer:
- **onboarding_orchestrator.json**: Main workflow for task generation and automation
- Handles asynchronous operations like reminders and escalations
- Integrates with external systems (SIS, CRM, SFTP)

## Code Organization Principles

### 1. Separation of Concerns
- **API routes**: Handle HTTP requests, validation, and database operations
- **Types**: Centralized type definitions shared across the application
- **Tests**: Property-based tests for universal properties, unit tests for specific cases
- **Workflows**: Asynchronous automation separate from business logic

### 2. Type Safety
- Strict TypeScript configuration with no implicit any
- Comprehensive type definitions for all data models
- API request/response types for consistency
- Property-based testing with typed generators

### 3. Testing Strategy
- **Property-based tests**: Universal properties across all inputs
- **Unit tests**: Specific examples and edge cases
- **Integration tests**: End-to-end workflow validation
- **API tests**: Request/response consistency validation

### 4. Documentation
- Architecture decisions documented with rationale
- API endpoints self-documenting through types
- Property-based tests serve as executable specifications
- Comprehensive README with setup and deployment instructions

## Development Workflow

### Adding New Features
1. **Requirements**: Update `.kiro/specs/requirements.md` with EARS patterns
2. **Design**: Update `.kiro/specs/design.md` with architecture changes
3. **Tasks**: Break down implementation in `.kiro/specs/tasks.md`
4. **Types**: Add/update type definitions in `lib/types.ts`
5. **API**: Implement API routes with validation and error handling
6. **Tests**: Write property-based tests for universal properties
7. **Documentation**: Update README and architecture docs

### Testing New Code
```bash
# Run all tests
npm test

# Run specific test files
npm test lib/types.test.ts
npm test lib/api-endpoints.test.ts

# Run with coverage
npm run test:coverage
```

### Database Changes
1. Update `supabase/migrations.sql` with schema changes
2. Update type definitions in `lib/types.ts`
3. Update API routes to handle new fields
4. Add property-based tests for new data structures

## File Naming Conventions

### API Routes
- `route.ts` for standard CRUD operations
- `[id]/route.ts` for dynamic routes with parameters
- Nested folders for logical grouping (e.g., `stakeholders/update/[id]/`)

### Test Files
- `*.test.ts` for test files
- Property-based tests focus on universal properties
- Unit tests focus on specific examples and edge cases

### Type Definitions
- `types.ts` for all shared type definitions
- Interface names match database table names (PascalCase)
- Request/Response types suffixed appropriately

## Integration Points

### Supabase Integration
- Real-time subscriptions for dashboard updates
- Row-level security for future multi-tenant support
- Audit trail tables for compliance and debugging

### n8n Integration
- Webhook triggers for onboarding events
- Asynchronous task execution and automation
- External system integrations (SIS, CRM, SFTP)

### External Systems
- SIS (Student Information System) integration
- CRM (Customer Relationship Management) integration
- SFTP server connections for data exchange
- Email/notification systems through n8n

This structure supports the core architectural principle of keeping business logic in the application while using external tools for their specific strengths.