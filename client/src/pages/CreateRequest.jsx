import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRequest } from '../services/api';
import LocationPicker from '../components/LocationPicker';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function CreateRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    urgency: 'normal',
    unitsNeeded: 1,
    hospitalName: '',
    contactPhone: '',
    notes: '',
    location: { type: 'Point', coordinates: [77.2090, 28.6139], address: '' },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await createRequest(form);
      navigate(`/dashboard/requests/${res.data.request._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Blood Request</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group Needed</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={form.bloodGroup}
              onChange={update('bloodGroup')}
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={form.urgency}
              onChange={update('urgency')}
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Units Needed</label>
            <input
              type="number"
              min="1"
              max="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={form.unitsNeeded}
              onChange={(e) => setForm({ ...form, unitsNeeded: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
            <input
              type="tel"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={form.contactPhone}
              onChange={update('contactPhone')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            value={form.hospitalName}
            onChange={update('hospitalName')}
            placeholder="e.g., City Hospital"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <LocationPicker
            coordinates={form.location.coordinates}
            onLocationChange={(coordinates, address) =>
              setForm({ ...form, location: { type: 'Point', coordinates, address } })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            rows={3}
            value={form.notes}
            onChange={update('notes')}
            placeholder="Any additional details..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Blood Request'}
        </button>
      </form>
    </div>
  );
}
