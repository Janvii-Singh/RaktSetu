import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import LocationPicker from '../components/LocationPicker';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bloodGroup: user?.bloodGroup || 'O+',
    isAvailable: user?.isAvailable ?? true,
    location: user?.location || { type: 'Point', coordinates: [77.2090, 28.6139], address: '' },
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Check if donor has set a valid location (not default [0,0] or default Delhi)
    if (user?.role === 'donor') {
      const coords = form.location?.coordinates;
      const isDefaultLocation = coords[0] === 77.2090 && coords[1] === 28.6139;
      const isZeroLocation = coords[0] === 0 && coords[1] === 0;
      
      if (isDefaultLocation) {
        setError('⚠️ Please click on the map to set your exact location. The default location is not valid.');
        return;
      }
      if (isZeroLocation) {
        setError('⚠️ Please click on the map to set your exact location.');
        return;
      }
    }
    
    setLoading(true);
    try {
      const res = await updateProfile(form);
      updateUser(res.data.user);
      setSuccess('Profile updated successfully! You will now receive blood requests in your area.');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  // Check if donor has valid location
  const hasValidLocation = () => {
    if (user?.role !== 'donor') return true;
    const coords = form.location?.coordinates;
    if (!coords) return false;
    const isDefault = coords[0] === 77.2090 && coords[1] === 28.6139;
    const isZero = coords[0] === 0 && coords[1] === 0;
    return !isDefault && !isZero;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

      {/* Warning for donors without location */}
      {user?.role === 'donor' && !hasValidLocation() && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">⚠️ Location Required!</p>
          <p className="text-red-600 text-sm mt-1">
            Please click on the map below to set your exact location. Without a valid location, 
            you will not receive any blood requests from hospitals.
          </p>
        </div>
      )}

      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            value={user?.email || ''}
            disabled
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        {user?.role !== 'hospital' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={form.bloodGroup}
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        )}

        {user?.role === 'donor' && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Available for Donation</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.isAvailable ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                form.isAvailable ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location {user?.role === 'donor' && <span className="text-red-500">*</span>}
          </label>
          {user?.role === 'donor' && (
            <p className="text-xs text-gray-500 mb-2">
              📍 Click on the map or drag the red marker to set your exact location. 
              This helps hospitals find donors near them.
            </p>
          )}
          <LocationPicker
            coordinates={form.location?.coordinates || [77.2090, 28.6139]}
            onLocationChange={(coordinates, address) =>
              setForm({ ...form, location: { type: 'Point', coordinates, address } })
            }
          />
          {form.location?.address && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Location set: {form.location.address}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}