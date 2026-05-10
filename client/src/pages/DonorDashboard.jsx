import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getRequests, respondToRequest } from '../services/api';
import { io } from 'socket.io-client';

export default function DonorDashboard() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [socket, setSocket] = useState(null);

  // Setup Socket.io connection
  useEffect(() => {
    if (user?._id) {
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);
      newSocket.emit('join', `user_${user._id}`);
      
      // Listen for donor response updates
      newSocket.on('donor_response_update', (data) => {
        console.log('Donor response update received:', data);
        fetchRequests(); // Refresh the requests list
      });

      return () => newSocket.disconnect();
    }
  }, [user?._id]);

  const fetchRequests = async () => {
    try {
        const res = await getRequests();
        console.log('All requests:', res.data.requests);
        
        // Filter requests that match donor's blood group
        const matchingRequests = res.data.requests.filter(req => {
            // Check if blood group matches
            if (req.bloodGroup !== user?.bloodGroup) return false;
            
            // Check if donor is in matchedDonors and status is pending
            const match = req.matchedDonors?.find(m => 
                (m.donorId?._id === user?._id || m.donorId === user?._id)
            );
            
            console.log(`Request ${req._id}: match found =`, match);
            
            return match && match.status === 'pending';
        });
        
        console.log('Matching requests:', matchingRequests);
        setRequests(matchingRequests);
    } catch (error) {
        console.error('Error fetching requests:', error);
    } finally {
        setLoading(false);
    }
};

  const handleRespond = async (requestId, accepted) => {
    setResponding(requestId);
    try {
        // Make sure donorId is being sent correctly
        const response = await respondToRequest(requestId, { 
            donorId: user._id, 
            accepted: accepted 
        });
        
        console.log('Response received:', response.data);
        
        // Remove the responded request from the list
        setRequests(prev => prev.filter(req => req._id !== requestId));
        
        alert(`✓ You have ${accepted ? 'accepted' : 'declined'} this request`);
    } catch (err) {
        console.error('Error responding:', err);
        console.error('Error details:', err.response?.data);
        alert(err.response?.data?.message || 'Failed to respond. Please try again.');
    } finally {
        setResponding(null);
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

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
        <h1 className="text-2xl font-bold text-gray-900">Donor Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user?.name}. Blood Group: <span className="font-semibold text-primary-600">{user?.bloodGroup}</span>
          {' | '}Status: <span className={`font-semibold ${user?.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
            {user?.isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </p>
        </div>
        <button
          onClick={fetchRequests}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          ↻ Refresh
        </button>
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
                  <div className="flex-1">
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
                      <p className="text-sm text-gray-500 mt-1">📍 {myMatch.distance.toFixed(1)} km away</p>
                    )}
                    {myMatch?.score && (
                      <p className="text-sm text-purple-600 mt-1">🤖 AI Match Score: {(myMatch.score * 100).toFixed(0)}%</p>
                    )}
                    {req.notes && <p className="text-sm text-gray-500 mt-1">📝 Note: {req.notes}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    {myMatch?.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(req._id, true)}
                          disabled={responding === req._id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {responding === req._id ? 'Processing...' : '✓ Accept Request'}
                        </button>
                        <button
                          onClick={() => handleRespond(req._id, false)}
                          disabled={responding === req._id}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition disabled:opacity-50"
                        >
                          ✗ Decline
                        </button>
                      </div>
                    )}
                    {myMatch?.status === 'accepted' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        ✓ Accepted
                      </span>
                    )}
                    {myMatch?.status === 'declined' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        ✗ Declined
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