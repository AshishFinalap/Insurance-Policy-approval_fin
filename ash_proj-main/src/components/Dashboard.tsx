import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, FileText, Plus, Filter } from 'lucide-react';
import { PolicyList } from './PolicyList';
import { PolicyForm } from './PolicyForm';
import { PolicyDetail } from './PolicyDetail';
import { Policy, PolicyStatus } from '../lib/supabase';
import { getPolicies } from '../services/policyService';

export const Dashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'all'>('all');

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await getPolicies();
      setPolicies(data);
      setFilteredPolicies(data);
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredPolicies(policies);
    } else {
      setFilteredPolicies(policies.filter((p) => p.status === statusFilter));
    }
  }, [statusFilter, policies]);

  const handlePolicyCreated = () => {
    setShowForm(false);
    loadPolicies();
  };

  const handlePolicyUpdated = () => {
    setSelectedPolicy(null);
    loadPolicies();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'creator':
        return 'bg-green-100 text-green-800';
      case 'underwriter':
        return 'bg-blue-100 text-blue-800';
      case 'manager':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPendingCount = () => {
    if (profile?.role === 'underwriter') {
      return policies.filter((p) => p.status === 'pending_underwriter').length;
    }
    if (profile?.role === 'manager') {
      return policies.filter((p) => p.status === 'pending_manager').length;
    }
    return 0;
  };

  const pendingCount = getPendingCount();

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PolicyForm onSuccess={handlePolicyCreated} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  if (selectedPolicy) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PolicyDetail
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          onUpdate={handlePolicyUpdated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Insurance Policy System</h1>
                <p className="text-sm text-gray-600">Approval Workflow Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                    profile?.role || ''
                  )}`}
                >
                  {profile?.role?.toUpperCase()}
                </span>
              </div>
              <button
                onClick={signOut}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {pendingCount > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">
              You have {pendingCount} {pendingCount === 1 ? 'policy' : 'policies'} pending your review
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Policies</option>
              <option value="draft">Draft</option>
              <option value="pending_underwriter">Pending Underwriter</option>
              <option value="pending_manager">Pending Manager</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {profile?.role === 'creator' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Create Policy</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading policies...</p>
          </div>
        ) : (
          <PolicyList policies={filteredPolicies} onSelectPolicy={setSelectedPolicy} />
        )}
      </main>
    </div>
  );
};
