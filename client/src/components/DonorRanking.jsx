import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Award, Phone, Brain, Droplet } from 'lucide-react';
import { mlService } from '../services/mlService';

const DonorRanking = ({ requestId, onDonorSelect }) => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mlHealth, setMlHealth] = useState(null);
  const [selectedDonor, setSelectedDonor] = useState(null);

  useEffect(() => {
    if (requestId) {
      fetchMLHealth();
      fetchRankings();
    }
  }, [requestId]);

  const fetchMLHealth = async () => {
    const health = await mlService.checkHealth();
    setMlHealth(health);
  };

  const fetchRankings = async () => {
    try {
      const data = await mlService.getMLRankings(requestId);
      console.log('ML Rankings Response:', data); // Debug log
      if (data && data.success) {
        setRankings(data.rankedDonors);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No donor rankings available yet</p>
        <p className="text-sm text-gray-400 mt-2">Donors will appear here when matched</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ML Model Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-800">AI-Powered Donor Ranking</h3>
          </div>
          {mlHealth?.model_loaded && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Model: {mlHealth.model_name || 'RandomForest'}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Donors ranked by AI predicting response probability based on distance, 
          donation history, and response patterns.
        </p>
      </div>

      {/* Donor Rankings with ML Scores */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 mb-2">
          Top Matches by AI Prediction ({rankings.length} donors)
        </h4>
        {rankings.map((item, index) => (
          <div
            key={item.donor?._id || index}
            className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
              selectedDonor === item.donor?._id ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
            onClick={() => {
              setSelectedDonor(item.donor?._id);
              if (onDonorSelect) onDonorSelect(item.donor);
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* Rank */}
                <div className="flex-shrink-0 w-8 pt-1">
                  {getRankIcon(index)}
                </div>

                {/* Donor Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-800">
                      {item.donor?.name || 'Unknown Donor'}
                    </h4>
                    {item.donor?.bloodGroup && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full flex items-center gap-1">
                        <Droplet className="w-3 h-3" />
                        {item.donor.bloodGroup}
                      </span>
                    )}
                    {index === 0 && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                        Best Match
                      </span>
                    )}
                  </div>

                  {/* Donor Details */}
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
                        <span>Est. {Math.ceil((item.distance || 0) * 2)} min response</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ML Score Badge */}
                <div className="flex-shrink-0 text-right">
                  <div className={`px-3 py-2 rounded-lg border ${getProbabilityColor(item.mlScore || 0.5)}`}>
                    <div className="text-xs font-medium">AI Score</div>
                    <div className="text-xl font-bold">
                      {Math.round((item.mlScore || 0.5) * 100)}%
                    </div>
                    <div className="text-xs mt-0.5">
                      {getProbabilityText(item.mlScore || 0.5)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {selectedDonor === item.donor?._id && (
              <div className="mt-4 pt-3 border-t border-red-200 flex gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.donor?.phone) {
                      window.location.href = `tel:${item.donor.phone}`;
                    } else {
                      alert('Phone number not available');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <Phone className="w-4 h-4 inline mr-2" />
                  Contact Donor
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDonor(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ML Explanation */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <h5 className="font-semibold mb-2">How AI Calculates Match Scores</h5>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Distance from request location (highest impact)</li>
          <li>Past donation frequency and reliability</li>
          <li>Average response time to previous requests</li>
          <li>Time since last donation</li>
          <li>Blood group compatibility</li>
          <li>Request urgency level</li>
        </ul>
      </div>
    </div>
  );
};

export default DonorRanking;6987