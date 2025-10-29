import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createPolicy } from '../services/policyService';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface PolicyFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const PolicyForm: React.FC<PolicyFormProps> = ({ onSuccess, onCancel }) => {
  const { profile } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [productType, setProductType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fraudWarning, setFraudWarning] = useState<{ passed: boolean; reason: string } | null>(null);

  const productTypes = [
    'Auto Insurance',
    'Home Insurance',
    'Life Insurance',
    'Health Insurance',
    'Business Insurance',
    'Travel Insurance',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setFraudWarning(null);

    try {
      const policy = await createPolicy({
        customer_name: customerName,
        premium_amount: parseFloat(premiumAmount),
        product_type: productType,
        creator_id: profile!.id,
      });

      if (!policy.fraud_check_passed) {
        setFraudWarning({
          passed: false,
          reason: policy.fraud_check_reason,
        });
      } else {
        setFraudWarning({
          passed: true,
          reason: policy.fraud_check_reason,
        });
      }

      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create policy');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Create New Policy</h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
              placeholder="Enter customer full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            >
              <option value="">Select product type</option>
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Premium Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={premiumAmount}
              onChange={(e) => setPremiumAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
              placeholder="0.00"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {fraudWarning && (
            <div
              className={`border px-4 py-3 rounded-lg text-sm flex items-start space-x-2 ${
                fraudWarning.passed
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {fraudWarning.passed ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold mb-1">
                  {fraudWarning.passed ? 'Fraud Check Passed' : 'Fraud Alert'}
                </p>
                <p>{fraudWarning.reason}</p>
              </div>
            </div>
          )}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Policy'}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Note:</span> All new policies undergo automated fraud detection
            before being saved. Policies are created in draft status and must be submitted for approval.
          </p>
        </div>
      </div>
    </div>
  );
};
