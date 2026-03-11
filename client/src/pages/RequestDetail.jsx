import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRequestById, respondToRequest, fulfillRequest } from '../services/api';

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = async () => {
    try {
      const res = await getRequestById(id);
      setRequest(res.data.request);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleRespond = async (accepted) => {
    try {
      await respondToRequest(id, { accepted });
      fetchRequest();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const handleFulfill = async (donorId) => {
    try {
      await fulfillRequest(id, { donorId });
      fetchRequest();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!request) return <p className="text-red-500">Request not found</p>;

  const urgencyColors = {
    critical: 'bg-red-100 text-red-800',
    urgent: 'bg-orange-100 text-orange-800',
    normal: 'bg-green-100 text-green-800',
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    matched: 'bg-yellow-100 text-yellow-800',
    fulfilled: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  const myMatch = user?.role === 'donor'
    ? request.matchedDonors?.find(
        (m) => (m.donorId?._id || m.donorId) === user._id
      )
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-primary-600">{request.bloodGroup}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColors[request.urgency]}`}>
            {request.urgency}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[request.status]}`}>
            {request.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p><span className="font-medium">Requester:</span> {request.requesterId?.name || 'Unknown'}</p>
            <p><span className="font-medium">Hospital:</span> {request.hospitalName || 'N/A'}</p>
            <p><span className="font-medium">Phone:</span> {request.contactPhone || request.requesterId?.phone || 'N/A'}</p>
          </div>
          <div>
            <p><span className="font-medium">Units:</span> {request.unitsNeeded}</p>
            <p><span className="font-medium">Created:</span> {new Date(request.createdAt).toLocaleString()}</p>
            <p><span className="font-medium">Location:</span> {request.location?.address || `${request.location?.coordinates?.[1]?.toFixed(4)}, ${request.location?.coordinates?.[0]?.toFixed(4)}`}</p>
          </div>
        </div>

        {request.notes && (
          <p className="mt-4 text-sm text-gray-600"><span className="font-medium">Notes:</span> {request.notes}</p>
        )}

        {/* Donor action */}
        {user?.role === 'donor' && myMatch?.status === 'pending' && request.status !== 'fulfilled' && (
          <div className="mt-6 flex gap-3">
            <button onClick={() => handleRespond(true)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Accept
            </button>
            <button onClick={() => handleRespond(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Decline
            </button>
          </div>
        )}
      </div>

      {/* Matched Donors - visible to requester/hospital */}
      {(user?.role === 'patient' || user?.role === 'hospital') && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Matched Donors ({request.matchedDonors?.length || 0})
          </h2>

          {request.matchedDonors?.length === 0 ? (
            <p className="text-gray-500">No donors matched yet.</p>
          ) : (
            <div className="space-y-3">
              {request.matchedDonors.map((match, i) => {
                const donor = match.donorId;
                return (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{donor?.name || 'Donor'}</p>
                      <p className="text-sm text-gray-500">
                        {donor?.bloodGroup} | {match.distance?.toFixed(1)} km away | Score: {match.score?.toFixed(2)}
                      </p>
                      {match.status === 'accepted' && donor?.phone && (
                        <p className="text-sm text-green-600">Phone: {donor.phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        match.status === 'accepted' ? 'text-green-600' :
                        match.status === 'declined' ? 'text-red-500' : 'text-yellow-600'
                      }`}>
                        {match.status}
                      </span>
                      {match.status === 'accepted' && request.status !== 'fulfilled' && (
                        <button
                          onClick={() => handleFulfill(donor?._id || match.donorId)}
                          className="ml-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          Mark Fulfilled
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
