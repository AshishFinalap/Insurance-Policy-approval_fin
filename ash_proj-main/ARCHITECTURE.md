# Insurance Policy Approval Workflow System - Architecture Documentation

## Overview

This is a complete insurance policy approval workflow system built with React, TypeScript, Supabase, and Tailwind CSS. The system implements a multi-step approval process with role-based access control, fraud detection, and comprehensive audit logging.

## System Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Core Components

```
src/
├── lib/
│   └── supabase.ts              # Supabase client and TypeScript types
├── contexts/
│   └── AuthContext.tsx          # Authentication context and user management
├── services/
│   └── policyService.ts         # Business logic for policies, fraud check, notifications
├── components/
│   ├── Auth.tsx                 # Login/Signup UI
│   ├── Dashboard.tsx            # Main dashboard with filtering
│   ├── PolicyList.tsx           # Table view of all policies
│   ├── PolicyForm.tsx           # Create new policy form
│   └── PolicyDetail.tsx         # Policy details with approval actions
└── App.tsx                      # Root component with routing logic
```

## Database Schema

### Tables

#### 1. user_profiles
Extends Supabase auth.users with role information
- `id` (uuid, PK, FK to auth.users)
- `email` (text, unique)
- `full_name` (text)
- `role` (text: 'creator' | 'underwriter' | 'manager')
- `created_at` (timestamp)

#### 2. policies
Core insurance policy data
- `id` (uuid, PK)
- `policy_number` (text, unique, auto-generated)
- `customer_name` (text)
- `premium_amount` (numeric)
- `product_type` (text)
- `status` (text: 'draft' | 'pending_underwriter' | 'pending_manager' | 'approved' | 'rejected')
- `fraud_check_passed` (boolean)
- `fraud_check_reason` (text)
- `creator_id` (uuid, FK to user_profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 3. approval_logs
Complete audit trail
- `id` (uuid, PK)
- `policy_id` (uuid, FK to policies)
- `approver_id` (uuid, FK to user_profiles)
- `action` (text: 'submitted' | 'approved' | 'rejected')
- `role` (text)
- `comments` (text)
- `previous_status` (text)
- `new_status` (text)
- `created_at` (timestamp)

### Row Level Security (RLS)

All tables have RLS enabled with specific policies:

**user_profiles:**
- All authenticated users can view all profiles (workflow visibility)
- Users can only update their own profile
- Users can insert their own profile on signup

**policies:**
- All authenticated users can view policies
- Creators can create new policies
- Creators can update only their own draft policies
- Underwriters can update pending_underwriter policies (to pending_manager or rejected)
- Managers can update pending_manager policies (to approved or rejected)

**approval_logs:**
- All authenticated users can view logs (audit transparency)
- Users can only insert logs for their own actions

## User Roles & Permissions

### Creator
- Create new policies
- Edit own policies in draft status
- Submit policies for approval
- View all policies and approval logs

### Underwriter (Step 1 Approval)
- Review policies in pending_underwriter status
- Approve policies (moves to pending_manager)
- Reject policies (moves to rejected)
- View all policies and approval logs
- Cannot edit policies

### Manager (Step 2 Approval)
- Review policies in pending_manager status
- Approve policies (moves to approved - final)
- Reject policies (moves to rejected)
- View all policies and approval logs
- Cannot edit policies

## Approval Workflow

```
draft
  ↓ (Creator submits)
pending_underwriter
  ↓ (Underwriter approves)
pending_manager
  ↓ (Manager approves)
approved (FINAL)

Note: Any approver can reject at their stage, moving status to rejected
```

### Workflow Rules

1. **Draft Policies**: Only creators can edit their own draft policies
2. **Submission**: Creators submit draft policies, triggering notification to underwriters
3. **Underwriter Review**:
   - Can approve (→ pending_manager) or reject (→ rejected)
   - Must provide comments for rejection
4. **Manager Review**:
   - Can approve (→ approved) or reject (→ rejected)
   - Must provide comments for rejection
5. **Final States**: approved and rejected are terminal states (no further changes)

## Fraud Detection System

### Implementation
Located in `src/services/policyService.ts` - `performFraudCheck()`

### Detection Logic
The system uses simulated AI logic with multiple risk factors:

1. **Random AI Flag**: 20% chance of random detection
2. **Premium Amount Check**: Premiums over $100,000 flagged
3. **Customer Name Validation**: Names < 3 characters or numeric-only flagged

### Risk Scoring
- Each factor adds to risk score
- Score ≥ 50 = Failed fraud check
- Score < 50 = Passed fraud check

### User Impact
- Failed fraud checks don't prevent policy creation
- Policies are flagged with warning indicators
- Fraud check results visible in policy details
- All checks logged to console with timestamps

## Notification System

### Implementation
Located in `src/services/policyService.ts` - `notify()`

### Notification Types

All notifications are logged to browser console with:
- Emoji indicator
- Type label
- Message
- Timestamp
- Contextual data

**Supported Events:**
- `policy_created`: New policy created
- `policy_submitted`: Policy submitted for approval
- `approval_required`: Action required by specific role
- `policy_approved`: Policy approved at any stage
- `policy_rejected`: Policy rejected
- `fraud_alert`: Fraud check failed

### Console Output Example
```
📝 NOTIFICATION [POLICY_CREATED]: {
  message: "New policy created",
  timestamp: "2025-10-29T12:00:00.000Z",
  policy_number: "POL-000001",
  customer: "John Doe",
  fraud_check: "passed"
}
```

## Audit Logging

### Complete Audit Trail
Every action is logged in the `approval_logs` table:

- Policy submissions
- Approvals at each step
- Rejections with reasons
- Status transitions
- User who performed action
- Role at time of action
- Timestamp

### Audit Log Display
- Visible in policy detail view
- Shows chronological history
- Includes user names and roles
- Shows status transitions
- Displays comments/reasons

## CRUD Operations

### Create
**File**: `src/services/policyService.ts` - `createPolicy()`
1. Accepts policy data (customer, premium, product type)
2. Runs fraud check
3. Generates unique policy number
4. Inserts into database with draft status
5. Logs creation notification
6. Returns created policy

### Read
**File**: `src/services/policyService.ts` - `getPolicies()`, `getPolicy()`
- List all policies with optional filters (status, creator)
- Get single policy by ID
- Respects RLS policies (users see only what they should)

### Update
**File**: `src/services/policyService.ts` - `updatePolicy()`
- Only draft policies can be edited
- Only by original creator
- Updates customer name, premium, product type
- Logs update notification

### Delete
Not implemented (data preservation requirement)

## Security Features

### Authentication
- Email/password authentication via Supabase
- Session management with auto-refresh
- Secure logout

### Authorization
- Row Level Security on all tables
- Role-based access control
- Ownership checks for edit operations
- Approval workflow state validation

### Data Integrity
- Database constraints (foreign keys, check constraints)
- Status validation
- Premium amount validation (must be > 0)
- Unique policy numbers

## UI/UX Features

### Dashboard
- Role-based view
- Policy filtering by status
- Pending action alerts for approvers
- Clean, modern design with Tailwind CSS

### Policy List
- Sortable table view
- Status badges with color coding
- Fraud check indicators
- Quick view of key information

### Policy Detail
- Complete policy information
- Fraud check results with warnings
- Edit mode for draft policies (creators only)
- Approval controls (role-specific)
- Complete approval history
- Comments for approvals/rejections

### Authentication
- Combined login/signup form
- Role selection during signup
- Clear role descriptions
- Error handling

## Running the Application

### Prerequisites
- Node.js 18+
- Supabase account with project created
- Environment variables configured in `.env`

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Testing the Workflow

1. **Create Test Users**:
   - Sign up as Creator (role: creator)
   - Sign up as Underwriter (role: underwriter)
   - Sign up as Manager (role: manager)

2. **Test Flow**:
   - Login as Creator → Create policy → Submit
   - Login as Underwriter → Approve policy
   - Login as Manager → Final approval
   - Check console for notifications at each step

3. **Test Fraud Detection**:
   - Create policy with very high premium (>$100k)
   - Create policy with short name (<3 chars)
   - Check console for fraud alerts

## Code Organization

### Separation of Concerns
- **UI Components**: Presentation only, minimal logic
- **Services**: Business logic, API calls, fraud detection
- **Contexts**: State management (auth)
- **Types**: Centralized in supabase.ts

### Best Practices
- TypeScript for type safety
- Async/await for async operations
- Error handling at service level
- Console logging for notifications
- Row Level Security for authorization
- Single Responsibility Principle

## Future Enhancements

Potential improvements:
- Email notifications (replace console logs)
- PDF policy generation
- Advanced fraud detection with ML
- Policy versioning
- Bulk operations
- Analytics dashboard
- Document attachments
- Comment threads
- Policy amendments
- Automated reminders

## License
This is a demonstration project for educational purposes.
