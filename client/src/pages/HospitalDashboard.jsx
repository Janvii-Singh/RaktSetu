import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRequests, getDonors, getMLRankings } from '../services/api';
import { TrendingUp, MapPin, Clock, Phone, Award, Brain, X } from 'lucide-react';
import { io } from 'socket.io-client';

export default function HospitalDashboard() {
  const [requests, setRequests] = useState([]);
  const [donorCount, setDonorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rankedDonors, setRankedDonors] = useState([]);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [loadingDonors, setLoadingDonors] = useState(false);

  useEffect(() => {
    Promise.all([
      getRequests().then((res) => setRequests(res.data.requests)),
      getDonors({ available: 'true' })
        .then((res) => setDonorCount(res.data.count))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
  if (user?._id) {
    const socket = io('http://localhost:5000');
    socket.emit('join', `user_${user._id}`);
    
    socket.on('donor_response_update', (data) => {
      console.log('Donor response received:', data);
      // Refresh requests to show updated donor responses
      getRequests().then((res) => setRequests(res.data.requests));
    });
    
    return () => socket.disconnect();
  }
  }, [user?._id]);

  // Fetch ML ranked donors for a specific request
  const handleViewDonors = async (request) => {
    setSelectedRequest(request);
    setShowDonorModal(true);
    setLoadingDonors(true);
    
    try {
      const res = await getMLRankings(request._id);
      if (res.data.success) {
        setRankedDonors(res.data.rankedDonors);
      }
    } catch (error) {
      console.error('Error fetching ML rankings:', error);
      setRankedDonors([]);
    } finally {
      setLoadingDonors(false);
    }
  };

  const closeModal = () => {
    setShowDonorModal(false);
    setSelectedRequest(null);
    setRankedDonors([]);
  };

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
      .map((m) => (new Date(m.respondedAt) - new Date(r.createdAt)) / 60000)
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

  const getProbabilityColor = (probability) => {
    if (probability >= 0.7) return 'bg-green-100 text-green-800 border-green-300';
    if (probability >= 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getProbabilityText = (probability) => {
    if (probability >= 0.7) return 'High Chance';
    if (probability >= 0.4) return 'Medium Chance';
    return 'Low Chance';
  };

  const getRankIcon = (index) => {
    if (index === 0) return <Award className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Award className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-gray-500 font-bold">{index + 1}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Dashboard</h1>
          <p className="text-gray-600">Manage blood requests and view AI-matched donors</p>
        </div>
        <Link
          to="/dashboard/requests/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          + New Request
        </Link>
      </div>

      {/* AI Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-6 border border-purple-200">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">AI-Powered Donor Matching</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Click "View AI Matches" on any request to see donors ranked by AI response probability.
        </p>
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
                  <td className="px-4 py-3 flex gap-2">
                    <Link to={`/dashboard/requests/${req._id}`} className="text-primary-600 hover:underline">
                      View
                    </Link>
                    <button
                      onClick={() => handleViewDonors(req)}
                      className="text-purple-600 hover:underline flex items-center gap-1"
                    >
                      <TrendingUp className="w-3 h-3" />
                      AI Matches
                    </button>
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

      {/* Donor Ranking Modal */}
      {showDonorModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">AI-Ranked Donors</h2>
                <p className="text-sm text-gray-600">
                  Request: {selectedRequest.bloodGroup} - {selectedRequest.urgency}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {loadingDonors ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : rankedDonors.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No matching donors found in your area.</p>
                  <p className="text-sm text-gray-400 mt-2">Try increasing the search radius or check donor availability.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-800">AI-Powered Donor Ranking</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Donors ranked by ML model predicting response probability based on distance, 
                      donation history, and response patterns.
                    </p>
                  </div>
                  
                  {rankedDonors.map((item, index) => (
                    <div key={item.donor?._id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex-shrink-0 w-8 pt-1">
                            {getRankIcon(index)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-gray-800">
                                {item.donor?.name || 'Anonymous Donor'}
                              </h4>
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                                {item.donor?.bloodGroup}
                              </span>
                              {index === 0 && (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                                  Best Match
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-2 space-y-1">
                              {item.donor?.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Phone className="w-3 h-3" />
                                  <span>{item.donor.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{item.distance?.toFixed(1)} km away</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Est. {Math.ceil(item.distance * 2)} min</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 text-right">
                            <div className={`px-3 py-2 rounded-lg border ${getProbabilityColor(item.mlScore)}`}>
                              <div className="text-xs font-medium">AI Score</div>
                              <div className="text-xl font-bold">
                                {(item.mlScore * 100).toFixed(0)}%
                              </div>
                              <div className="text-xs mt-0.5">
                                {getProbabilityText(item.mlScore)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {item.status === 'accepted' && item.donor?.phone && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <a
                            href={`tel:${item.donor.phone}`}
                            className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
                          >
                            <Phone className="w-4 h-4" />
                            Contact Donor: {item.donor.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}