import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getRequests, respondToRequest } from '../services/api';

export default function DonorDashboard() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await getRequests({ status: 'matched' });
      setRequests(res.data.requests);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId, accepted) => {
    try {
      await respondToRequest(requestId, { accepted });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to respond');
    }
  };

  const getMyMatch = (request) => {
    return request.matchedDonors?.find(
      (m) => m.donorId === user._id || m.donorId?._id === user._id
    );
  };

  const urgencyColors = {
    critical: 'bg-red-100 text-red-800',
    urgent: 'bg-orange-100 text-orange-800',
    normal: 'bg-green-100 text-green-800',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Donor Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user?.name}. Blood Group: <span className="font-semibold text-primary-600">{user?.bloodGroup}</span>
          {' | '}Status: <span className={`font-semibold ${user?.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
            {user?.isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Active Requests</p>
          <p className="text-3xl font-bold text-primary-600">{requests.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Unread Notifications</p>
          <p className="text-3xl font-bold text-blue-600">
            {notifications.filter((n) => !n.read).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Your Blood Group</p>
          <p className="text-3xl font-bold text-gray-900">{user?.bloodGroup}</p>
        </div>
      </div>

      {/* Incoming Requests */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Incoming Blood Requests</h2>

      {loading ? (
        <p className="text-gray-500">Loading requests...</p>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
          No active blood requests matched to you at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const myMatch = getMyMatch(req);
            return (
              <div key={req._id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-primary-600">{req.bloodGroup}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColors[req.urgency]}`}>
                        {req.urgency}
                      </span>
                      {req.hospitalName && (
                        <span className="text-sm text-gray-500">{req.hospitalName}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {req.location?.address || `${req.location?.coordinates?.[1]?.toFixed(4)}, ${req.location?.coordinates?.[0]?.toFixed(4)}`}
                    </p>
                    {myMatch?.distance && (
                      <p className="text-sm text-gray-500 mt-1">{myMatch.distance.toFixed(1)} km away</p>
                    )}
                    {req.notes && <p className="text-sm text-gray-500 mt-1">Note: {req.notes}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {myMatch?.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(req._id, true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(req._id, false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className={`text-sm font-medium ${
                        myMatch?.status === 'accepted' ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {myMatch?.status === 'accepted' ? 'Accepted' : 'Declined'}
                      </span>
                    )}
                    <Link to={`/dashboard/requests/${req._id}`} className="text-sm text-primary-600 hover:underline">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
