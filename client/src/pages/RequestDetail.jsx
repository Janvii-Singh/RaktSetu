import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRequestById, respondToRequest, fulfillRequest } from '../services/api';
import DonorRanking from '../components/DonorRanking';

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMLRankings, setShowMLRankings] = useState(true);

  const fetchRequest = async () => {
    try {
      const res = await getRequestById(id);
      setRequest(res.data.request);
    } catch (error) {
      console.error('Error fetching request:', error);
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
      alert(err.response?.data?.message || 'Failed to respond');
    }
  };

  const handleFulfill = async (donorId) => {
    try {
      await fulfillRequest(id, { donorId });
      fetchRequest();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as fulfilled');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Request not found</p>
      </div>
    );
  }

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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Request Details Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-2xl font-bold text-red-600">{request.bloodGroup}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColors[request.urgency]}`}>
            {request.urgency.toUpperCase()}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[request.status]}`}>
            {request.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p><span className="font-medium text-gray-800">Requester:</span> {request.requesterId?.name || 'Unknown'}</p>
            <p><span className="font-medium text-gray-800">Hospital:</span> {request.hospitalName || 'N/A'}</p>
            <p><span className="font-medium text-gray-800">Contact Phone:</span> {request.contactPhone || request.requesterId?.phone || 'N/A'}</p>
          </div>
          <div>
            <p><span className="font-medium text-gray-800">Units Needed:</span> {request.unitsNeeded}</p>
            <p><span className="font-medium text-gray-800">Created:</span> {new Date(request.createdAt).toLocaleString()}</p>
            <p><span className="font-medium text-gray-800">Location:</span> {request.location?.address || (request.location?.coordinates ? `${request.location.coordinates[1]?.toFixed(4)}, ${request.location.coordinates[0]?.toFixed(4)}` : 'Not specified')}</p>
          </div>
        </div>

        {request.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600"><span className="font-medium text-gray-800">Notes:</span> {request.notes}</p>
          </div>
        )}

        {/* Donor action buttons */}
        {user?.role === 'donor' && myMatch?.status === 'pending' && request.status !== 'fulfilled' && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => handleRespond(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              ✓ Accept Request
            </button>
            <button
              onClick={() => handleRespond(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              ✗ Decline
            </button>
          </div>
        )}

        {/* Status message for donors who already responded */}
        {user?.role === 'donor' && myMatch && myMatch.status !== 'pending' && (
          <div className="mt-6 p-3 rounded-lg bg-gray-100 text-center">
            <p className="text-sm text-gray-600">
              You have {myMatch.status} this request.
              {myMatch.status === 'accepted' && request.status === 'fulfilled' && ' The request has been fulfilled.'}
            </p>
          </div>
        )}
      </div>

      {/* AI-Powered Donor Rankings - Visible to Patient/Hospital */}
      {(user?.role === 'patient' || user?.role === 'hospital') && request.status !== 'fulfilled' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              🤖 AI-Powered Donor Matches
            </h2>
            <button
              onClick={() => setShowMLRankings(!showMLRankings)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              {showMLRankings ? 'Hide' : 'Show'} AI Rankings
            </button>
          </div>
          
          {showMLRankings && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <DonorRanking requestId={id} />
            </div>
          )}
        </div>
      )}

      {/* Traditional Matched Donors List */}
      {(user?.role === 'patient' || user?.role === 'hospital') && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            All Responding Donors ({request.matchedDonors?.filter(m => m.status !== 'pending').length || 0})
          </h2>

          {!request.matchedDonors || request.matchedDonors.filter(m => m.status !== 'pending').length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No donors have responded yet.</p>
              <p className="text-sm text-gray-400 mt-2">Donors will appear here when they accept or decline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {request.matchedDonors
                .filter(match => match.status !== 'pending')
                .map((match, i) => {
                  const donor = match.donorId;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{donor?.name || 'Anonymous Donor'}</p>
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            {donor?.bloodGroup}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {match.distance?.toFixed(1)} km away
                        </p>
                        {/* Show ML Score if available */}
                        {match.score && (
                          <p className="text-xs text-purple-600 mt-1">
                            AI Match Score: {(match.score * 100).toFixed(0)}%
                          </p>
                        )}
                        {match.status === 'accepted' && donor?.phone && (
                          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                            <span>📞 Phone:</span> 
                            <a href={`tel:${donor.phone}`} className="hover:underline">
                              {donor.phone}
                            </a>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                          match.status === 'accepted' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {match.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                        </span>
                        {match.status === 'accepted' && request.status !== 'fulfilled' && (
                          <button
                            onClick={() => handleFulfill(donor?._id || match.donorId)}
                            className="ml-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
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

      {/* Fulfilled Message */}
      {request.status === 'fulfilled' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-center">
            ✅ This request has been fulfilled. Thank you for helping save lives!
          </p>
        </div>
      )}

      {/* Expired Message */}
      {request.status === 'expired' && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-700 text-center">
            ⏰ This request has expired. Please create a new request if you still need blood.
          </p>
        </div>
      )}
    </div>
  );
}