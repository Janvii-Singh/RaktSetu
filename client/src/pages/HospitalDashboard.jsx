import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRequests, getDonors } from '../services/api';

export default function HospitalDashboard() {
  const [requests, setRequests] = useState([]);
  const [donorCount, setDonorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getRequests().then((res) => setRequests(res.data.requests)),
      getDonors({ available: 'true' })
        .then((res) => setDonorCount(res.data.count))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const stats = {
    total: requests.length,
    active: requests.filter((r) => ['open', 'matched'].includes(r.status)).length,
    fulfilled: requests.filter((r) => r.status === 'fulfilled').length,
    fulfillmentRate: requests.length > 0
      ? ((requests.filter((r) => r.status === 'fulfilled').length / requests.length) * 100).toFixed(0)
      : 0,
  };

  // Avg response time from matched donors that accepted
  const responseTimes = requests.flatMap((r) =>
    (r.matchedDonors || [])
      .filter((m) => m.respondedAt)
      .map((m) => (new Date(m.respondedAt) - new Date(r.createdAt)) / 60000) // minutes
  );
  const avgResponseTime = responseTimes.length > 0
    ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0)
    : 'N/A';

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    matched: 'bg-yellow-100 text-yellow-800',
    fulfilled: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Dashboard</h1>
          <p className="text-gray-600">Manage blood requests and donor pool</p>
        </div>
        <Link
          to="/dashboard/requests/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          + New Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-primary-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Fulfilled</p>
          <p className="text-2xl font-bold text-green-600">{stats.fulfilled}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Fulfillment Rate</p>
          <p className="text-2xl font-bold text-blue-600">{stats.fulfillmentRate}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Available Donors</p>
          <p className="text-2xl font-bold text-orange-600">{donorCount}</p>
        </div>
      </div>

      {/* Analytics row */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Analytics</h3>
        <p className="text-sm text-gray-600">
          Average donor response time: <span className="font-semibold">{avgResponseTime} min</span>
        </p>
      </div>

      {/* Requests Table */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">All Requests</h2>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Blood Group</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Urgency</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Matched</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr key={req._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-primary-600">{req.bloodGroup}</td>
                  <td className="px-4 py-3 capitalize">{req.urgency}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{req.matchedDonors?.length || 0}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link to={`/dashboard/requests/${req._id}`} className="text-primary-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
