import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRequests } from '../services/api';

export default function DonationHistory() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRequests()
      .then((res) => setRequests(res.data.requests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Donation History</h1>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
          No donation history yet.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Link key={req._id} to={`/dashboard/requests/${req._id}`} className="block">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-primary-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary-600">{req.bloodGroup}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      req.status === 'fulfilled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {req.hospitalName && (
                  <p className="text-sm text-gray-500 mt-1">{req.hospitalName}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
