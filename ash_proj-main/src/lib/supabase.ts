import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'creator' | 'underwriter' | 'manager';

export type PolicyStatus = 'draft' | 'pending_underwriter' | 'pending_manager' | 'approved' | 'rejected';

export type ApprovalAction = 'submitted' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Policy {
  id: string;
  policy_number: string;
  customer_name: string;
  premium_amount: number;
  product_type: string;
  status: PolicyStatus;
  fraud_check_passed: boolean;
  fraud_check_reason: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalLog {
  id: string;
  policy_id: string;
  approver_id: string;
  action: ApprovalAction;
  role: UserRole;
  comments: string;
  previous_status: PolicyStatus;
  new_status: PolicyStatus;
  created_at: string;
}
