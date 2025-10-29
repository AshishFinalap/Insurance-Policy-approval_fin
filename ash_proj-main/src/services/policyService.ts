import { supabase, Policy, PolicyStatus, ApprovalAction } from '../lib/supabase';

/**
 * FRAUD CHECK SIMULATION
 * Uses random logic to simulate AI-based fraud detection
 * Returns pass/fail with reasoning
 */
export const performFraudCheck = (policy: {
  customer_name: string;
  premium_amount: number;
  product_type: string;
}): { passed: boolean; reason: string } => {
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Random AI simulation: 20% chance of fraud detection
  const randomFraudFlag = Math.random() < 0.2;

  if (randomFraudFlag) {
    riskFactors.push('Anomalous pattern detected by AI model');
    riskScore += 50;
  }

  // Check premium amount (very high premiums are suspicious)
  if (policy.premium_amount > 100000) {
    riskFactors.push('Unusually high premium amount');
    riskScore += 30;
  }

  // Check customer name for suspicious patterns
  if (policy.customer_name.length < 3 || /^\d+$/.test(policy.customer_name)) {
    riskFactors.push('Invalid customer name format');
    riskScore += 40;
  }

  const passed = riskScore < 50;
  const reason = passed
    ? 'All fraud checks passed successfully'
    : `Fraud risk detected: ${riskFactors.join(', ')} (Risk Score: ${riskScore})`;

  // NOTIFICATION: Log fraud check result
  console.log('🔍 FRAUD CHECK NOTIFICATION:', {
    customer: policy.customer_name,
    result: passed ? 'PASSED' : 'FAILED',
    reason,
    timestamp: new Date().toISOString(),
  });

  return { passed, reason };
};

/**
 * NOTIFICATION SYSTEM
 * Logs notifications to console for workflow events
 */
export const notify = (type: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const emoji = {
    policy_created: '📝',
    policy_submitted: '📤',
    approval_required: '⏳',
    policy_approved: '✅',
    policy_rejected: '❌',
    fraud_alert: '🚨',
  }[type] || '📢';

  console.log(`${emoji} NOTIFICATION [${type.toUpperCase()}]:`, {
    message,
    timestamp,
    ...data,
  });
};

/**
 * Generate unique policy number
 */
const generatePolicyNumber = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('generate_policy_number');
  if (error || !data) {
    const timestamp = Date.now();
    return `POL-${timestamp}`;
  }
  return data;
};

/**
 * CREATE POLICY
 * Creates a new policy with fraud check
 */
export const createPolicy = async (policyData: {
  customer_name: string;
  premium_amount: number;
  product_type: string;
  creator_id: string;
}) => {
  // Run fraud check
  const fraudCheck = performFraudCheck(policyData);

  // Generate policy number
  const policyNumber = await generatePolicyNumber();

  const { data, error } = await supabase
    .from('policies')
    .insert({
      policy_number: policyNumber,
      customer_name: policyData.customer_name,
      premium_amount: policyData.premium_amount,
      product_type: policyData.product_type,
      creator_id: policyData.creator_id,
      fraud_check_passed: fraudCheck.passed,
      fraud_check_reason: fraudCheck.reason,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  notify('policy_created', 'New policy created', {
    policy_number: policyNumber,
    customer: policyData.customer_name,
    fraud_check: fraudCheck.passed ? 'passed' : 'failed',
  });

  if (!fraudCheck.passed) {
    notify('fraud_alert', 'Policy flagged for fraud review', {
      policy_number: policyNumber,
      reason: fraudCheck.reason,
    });
  }

  return data;
};

/**
 * UPDATE POLICY
 * Updates a draft policy (only allowed for creators on their own drafts)
 */
export const updatePolicy = async (
  policyId: string,
  updates: {
    customer_name?: string;
    premium_amount?: number;
    product_type?: string;
  }
) => {
  const { data, error } = await supabase
    .from('policies')
    .update(updates)
    .eq('id', policyId)
    .select()
    .single();

  if (error) throw error;

  notify('policy_updated', 'Policy updated', {
    policy_id: policyId,
    updates,
  });

  return data;
};

/**
 * GET POLICIES
 * Retrieves policies based on user role and filters
 */
export const getPolicies = async (filters?: {
  status?: PolicyStatus;
  creator_id?: string;
}) => {
  let query = supabase.from('policies').select('*').order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.creator_id) {
    query = query.eq('creator_id', filters.creator_id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Policy[];
};

/**
 * GET SINGLE POLICY
 */
export const getPolicy = async (policyId: string) => {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('id', policyId)
    .maybeSingle();

  if (error) throw error;
  return data as Policy | null;
};

/**
 * SUBMIT POLICY FOR APPROVAL
 * Moves policy from draft to pending_underwriter
 */
export const submitPolicy = async (policyId: string, creatorId: string) => {
  const policy = await getPolicy(policyId);
  if (!policy) throw new Error('Policy not found');

  const { data, error } = await supabase
    .from('policies')
    .update({ status: 'pending_underwriter' })
    .eq('id', policyId)
    .select()
    .single();

  if (error) throw error;

  // Log the submission
  await logApproval(policyId, creatorId, 'submitted', 'creator', '', 'draft', 'pending_underwriter');

  notify('policy_submitted', 'Policy submitted for approval', {
    policy_number: policy.policy_number,
    customer: policy.customer_name,
    next_step: 'Underwriter review required',
  });

  notify('approval_required', 'Underwriter action required', {
    policy_number: policy.policy_number,
    role: 'underwriter',
  });

  return data;
};

/**
 * APPROVE/REJECT POLICY
 * Handles approval workflow logic
 */
export const processApproval = async (
  policyId: string,
  approverId: string,
  action: 'approved' | 'rejected',
  role: string,
  comments: string = ''
) => {
  const policy = await getPolicy(policyId);
  if (!policy) throw new Error('Policy not found');

  let newStatus: PolicyStatus;

  if (action === 'rejected') {
    newStatus = 'rejected';
  } else {
    // Approval logic based on current status
    if (policy.status === 'pending_underwriter' && role === 'underwriter') {
      newStatus = 'pending_manager';
    } else if (policy.status === 'pending_manager' && role === 'manager') {
      newStatus = 'approved';
    } else {
      throw new Error('Invalid approval workflow state');
    }
  }

  const { data, error } = await supabase
    .from('policies')
    .update({ status: newStatus })
    .eq('id', policyId)
    .select()
    .single();

  if (error) throw error;

  // Log the approval action
  await logApproval(policyId, approverId, action, role, comments, policy.status, newStatus);

  if (action === 'approved' && newStatus === 'approved') {
    notify('policy_approved', 'Policy fully approved', {
      policy_number: policy.policy_number,
      customer: policy.customer_name,
    });
  } else if (action === 'approved' && newStatus === 'pending_manager') {
    notify('policy_approved', 'Underwriter approved policy', {
      policy_number: policy.policy_number,
      next_step: 'Manager review required',
    });
    notify('approval_required', 'Manager action required', {
      policy_number: policy.policy_number,
      role: 'manager',
    });
  } else if (action === 'rejected') {
    notify('policy_rejected', 'Policy rejected', {
      policy_number: policy.policy_number,
      rejected_by: role,
      reason: comments,
    });
  }

  return data;
};

/**
 * LOG APPROVAL ACTION
 * Creates an audit log entry
 */
export const logApproval = async (
  policyId: string,
  approverId: string,
  action: ApprovalAction,
  role: string,
  comments: string,
  previousStatus: PolicyStatus,
  newStatus: PolicyStatus
) => {
  const { error } = await supabase.from('approval_logs').insert({
    policy_id: policyId,
    approver_id: approverId,
    action,
    role,
    comments,
    previous_status: previousStatus,
    new_status: newStatus,
  });

  if (error) throw error;
};

/**
 * GET APPROVAL LOGS
 * Retrieves audit trail for a policy
 */
export const getApprovalLogs = async (policyId: string) => {
  const { data, error } = await supabase
    .from('approval_logs')
    .select('*, user_profiles(full_name, role)')
    .eq('policy_id', policyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
