import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRequests } from '../services/api';

export default function PatientDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRequests()
      .then((res) => setRequests(res.data.requests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    matched: 'bg-yellow-100 text-yellow-800',
    fulfilled: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  const stats = {
    total: requests.length,
    active: requests.filter((r) => ['open', 'matched'].includes(r.status)).length,
    fulfilled: requests.filter((r) => r.status === 'fulfilled').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="text-gray-600">Track your blood requests and donor responses</p>
        </div>
        <Link
          to="/dashboard/requests/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          + New Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Requests</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-primary-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Fulfilled</p>
          <p className="text-3xl font-bold text-green-600">{stats.fulfilled}</p>
        </div>
      </div>

      {/* Requests List */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Requests</h2>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-500 mb-4">You haven't made any blood requests yet.</p>
          <Link to="/dashboard/requests/new" className="text-primary-600 hover:underline font-medium">
            Create your first request
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const acceptedCount = req.matchedDonors?.filter((m) => m.status === 'accepted').length || 0;
            return (
              <Link key={req._id} to={`/dashboard/requests/${req._id}`} className="block">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary-600">{req.bloodGroup}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[req.status]}`}>
                        {req.status}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{req.urgency}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {req.matchedDonors?.length || 0} matched, {acceptedCount} accepted
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {req.location?.address && (
                    <p className="text-sm text-gray-500 mt-2">{req.location.address}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
