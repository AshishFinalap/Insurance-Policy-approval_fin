# Insurance-Policy-approval_fin
Insurance Policy Approval Workflow Platform Project Overview

This project implements a multi-step insurance policy approval system with complete CRUD operations, role-based workflow, approval logs, notifications, and a simple fraud detection simulation. The workflow involves Creators, Underwriters, and Managers — each with specific permissions and actions.

Features Core Functionalities

CRUD for Insurance Policies

Create, Read, Update, and Delete policies

Key fields: ID, Customer Name, Premium Amount, Product Type

Multi-Step Approval Workflow

Step 1: Underwriter Approval

Step 2: Manager Approval

Role-Based Access Control (RBAC)

Creator: Can create and edit until first approval

Underwriter: Can approve or reject policies in step 1

Manager: Can approve or reject in step 2

Approval Logs

Tracks each approval/rejection with timestamp and approver details

Notifications (Simulated)

Console-based notifications after each action

Fraud Check (Bonus Feature)

Randomized AI-style fraud validation during policy creation (pass/fail)

Tech Stack Layer Technology Frontend React (Vite + TypeScript + Tailwind CSS) Backend Supabase (Lovable Cloud Functions) Database PostgreSQL (via Supabase) Authentication Supabase JWT-based Authentication Hosting Lovable Cloud Deployment Architecture Overview

Workflow: Creator → Underwriter → Manager

Process Flow:

Creator creates a new insurance policy.

Fraud check (random boolean) determines if the policy can move forward.

Underwriter reviews and approves/rejects.

Manager performs final approval/rejection.

Approval logs record every action with timestamp.

Console notifications simulate user alerts.

Role Access Example:

Role Permissions Creator Create, Edit (until first approval) Underwriter Approve/Reject (Step 1) Manager Approve/Reject (Step 2) Viewer Read-only access Installation & Setup

Clone Repository

git clone https://github.com/yourusername/insurance-policy-approval.git cd insurance-policy-approval

Install Dependencies

npm install

Configure Environment Create .env file in root directory and add your Supabase keys:

VITE_SUPABASE_URL=your-supabase-url VITE_SUPABASE_ANON_KEY=your-anon-key

Run Application

npm run dev

Database Schema Field Type Description id UUID Unique Policy ID customer_name VARCHAR Name of the customer premium_amount DECIMAL Insurance premium product_type VARCHAR Type of insurance status ENUM Pending / Approved / Rejected approved_by VARCHAR Approver name approval_stage ENUM Underwriter / Manager created_at TIMESTAMP Creation date updated_at TIMESTAMP Last update Notification Simulation

Console logs simulate real-time notifications, for example:

Policy #123 created successfully. Fraud Check Passed. Next Action: Awaiting Underwriter Approval. Underwriter approved Policy #123 on 2025-10-29. Notification: Sent to Manager for final review.

Fraud Check Logic (Bonus)

A random boolean is generated during policy creation to simulate AI-based fraud detection:

const fraudCheck = Math.random() < 0.3; // 30% chance of fraud

If fraudCheck = true → Policy rejected automatically.

Approval Log Example Policy ID Approver Role Action Timestamp 101 John Doe Underwriter Approved 2025-10-29 11:23 101 Jane Smith Manager Approved 2025-10-29 12:10 Folder Structure /src ┣ components # UI components (forms, modals, tables) ┣ pages # Pages (Dashboard, PolicyForm, Logs) ┣ lib # Supabase client, utilities ┣ hooks # Custom React hooks ┣ types # TypeScript interfaces ┣ App.tsx ┗ main.tsx

Roles Implementation (Lovable Cloud)

Managed using Supabase Row-Level Security (RLS)

Users are tagged with a role (creator, underwriter, manager)

Access restricted using RLS policies and API routes

Architecture Notes

Frontend handles UI, routing, and user authentication.

Supabase Edge Functions act as backend APIs.

Approval logs stored as a separate table (approval_logs).

Fraud check handled client-side during policy creation.

Deliverables

Runnable full-stack application

CRUD operations for policies

Role-based approval workflow

Approval logs and notifications

Optional AI-style fraud detection

Code comments and architecture documentation

Future Enhancements

Add email-based notifications using Supabase Functions

Add dashboard analytics (total approved/rejected policies)

Integrate AI/ML model for real fraud prediction

Implement multi-user login sessions

Author

Ashish Tiwary B.Tech CSE (CPS) — VIT Chennai Email: ashish.tiwary2025@vitstudent.ac.in
