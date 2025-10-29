import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Policy } from '../lib/supabase';
import {
  submitPolicy,
  processApproval,
  getApprovalLogs,
  updatePolicy,
} from '../services/policyService';
import {
  X,
  FileText,
  User,
  DollarSign,
  Package,
  Shield,
  CheckCircle,
  XCircle,
  Send,
  Edit,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface PolicyDetailProps {
  policy: Policy;
  onClose: () => void;
  onUpdate: () => void;
}

export const PolicyDetail: React.FC<PolicyDetailProps> = ({ policy, onClose, onUpdate }) => {
  const { profile } = useAuth();
  const [approvalLogs, setApprovalLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    customer_name: policy.customer_name,
    premium_amount: policy.premium_amount.toString(),
    product_type: policy.product_type,
  });

  useEffect(() => {
    loadApprovalLogs();
  }, [policy.id]);

  const loadApprovalLogs = async () => {
    try {
      const logs = await getApprovalLogs(policy.id);
      setApprovalLogs(logs);
    } catch (error) {
      console.error('Error loading approval logs:', error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitPolicy(policy.id, profile!.id);
      onUpdate();
    } catch (error: any) {
      alert(error.message || 'Failed to submit policy');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await processApproval(policy.id, profile!.id, 'approved', profile!.role, comments);
      onUpdate();
    } catch (error: any) {
      alert(error.message || 'Failed to approve policy');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setLoading(true);
    try {
      await processApproval(policy.id, profile!.id, 'rejected', profile!.role, comments);
      onUpdate();
    } catch (error: any) {
      alert(error.message || 'Failed to reject policy');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updatePolicy(policy.id, {
        customer_name: editData.customer_name,
        premium_amount: parseFloat(editData.premium_amount),
        product_type: editData.product_type,
      });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      alert(error.message || 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = profile?.role === 'creator' && policy.status === 'draft' && policy.creator_id === profile.id;
  const canSubmit = profile?.role === 'creator' && policy.status === 'draft' && policy.creator_id === profile.id;
  const canApprove =
    (profile?.role === 'underwriter' && policy.status === 'pending_underwriter') ||
    (profile?.role === 'manager' && policy.status === 'pending_manager');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">Policy Details</h2>
              <p className="text-blue-100">{policy.policy_number}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {policy.fraud_check_passed === false && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-semibold">Fraud Alert</p>
                <p className="text-red-700 text-sm mt-1">{policy.fraud_check_reason}</p>
              </div>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={editData.customer_name}
                  onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
                <input
                  type="text"
                  value={editData.product_type}
                  onChange={(e) => setEditData({ ...editData, product_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Premium Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.premium_amount}
                  onChange={(e) => setEditData({ ...editData, premium_amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="text-lg font-semibold text-gray-900">{policy.customer_name}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Package className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Product Type</p>
                  <p className="text-lg font-semibold text-gray-900">{policy.product_type}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <DollarSign className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Premium Amount</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(policy.premium_amount)}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Fraud Check Status</p>
                  <p className={`text-lg font-semibold ${policy.fraud_check_passed ? 'text-green-600' : 'text-red-600'}`}>
                    {policy.fraud_check_passed ? 'Passed' : 'Failed'}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm text-gray-900">{formatDate(policy.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-sm text-gray-900 capitalize">{policy.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}

          {canApprove && (
            <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Review & Decision</h3>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add comments (required for rejection)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                rows={3}
              />
              <div className="flex space-x-4">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="flex space-x-4 mb-8">
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
                >
                  <Edit className="w-5 h-5" />
                  <span>Edit Policy</span>
                </button>
              )}
              {canSubmit && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  <span>Submit for Approval</span>
                </button>
              )}
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Approval History</h3>
            {approvalLogs.length === 0 ? (
              <p className="text-gray-600">No approval actions yet</p>
            ) : (
              <div className="space-y-4">
                {approvalLogs.map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {log.action === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : log.action === 'rejected' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Send className="w-5 h-5 text-blue-600" />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {log.user_profiles?.full_name} ({log.role})
                          </p>
                          <p className="text-sm text-gray-600 capitalize">{log.action}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{formatDate(log.created_at)}</p>
                    </div>
                    <div className="ml-8">
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Status Change:</span> {log.previous_status} → {log.new_status}
                      </p>
                      {log.comments && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Comments:</span> {log.comments}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
