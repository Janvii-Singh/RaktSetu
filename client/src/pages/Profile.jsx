import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import LocationPicker from '../components/LocationPicker';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const defaultHealth = (existing) => ({
  hasFever: existing?.hasFever ?? false,
  isPregnant: existing?.isPregnant ?? false,
  onMedication: existing?.onMedication ?? false,
  hadRecentSurgery: existing?.hadRecentSurgery ?? false,
  surgeryDate: existing?.surgeryDate ? new Date(existing.surgeryDate).toISOString().split('T')[0] : '',
  hadRecentTattooOrPiercing: existing?.hadRecentTattooOrPiercing ?? false,
  tattooOrPiercingDate: existing?.tattooOrPiercingDate ? new Date(existing.tattooOrPiercingDate).toISOString().split('T')[0] : '',
  weight: existing?.weight ?? '',
});

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bloodGroup: user?.bloodGroup || 'O+',
    isAvailable: user?.isAvailable ?? true,
    location: user?.location || { type: 'Point', coordinates: [77.2090, 28.6139], address: '' },
  });
  const [health, setHealth] = useState(() => defaultHealth(user?.healthStatus));
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateHealth = (field) => (e) =>
    setHealth({ ...health, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

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
      const payload = { ...form };
      if (user?.role === 'donor') {
        payload.healthStatus = {
          ...health,
          weight: health.weight ? parseFloat(health.weight) : undefined,
          surgeryDate: health.hadRecentSurgery && health.surgeryDate ? health.surgeryDate : undefined,
          tattooOrPiercingDate: health.hadRecentTattooOrPiercing && health.tattooOrPiercingDate ? health.tattooOrPiercingDate : undefined,
        };
      }
      const res = await updateProfile(payload);
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

        {/* ── Health Status (donors only) ── */}
        {user?.role === 'donor' && (
          <div className="border-t border-gray-200 pt-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Health Status</h2>
            <p className="text-xs text-gray-500 mb-4">
              Keep this up to date. Your eligibility to donate is re-evaluated each time you save.
              {user?.healthStatus?.lastUpdated && (
                <> Last updated: <strong>{new Date(user.healthStatus.lastUpdated).toLocaleDateString()}</strong></>
              )}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <input
                  type="number" min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. 65"
                  value={health.weight}
                  onChange={updateHealth('weight')}
                />
                {health.weight && parseFloat(health.weight) < 50 && (
                  <p className="text-red-500 text-xs mt-1">You must weigh at least 50 kg to be eligible to donate.</p>
                )}
              </div>

              {[
                { field: 'hasFever', label: 'Do you currently have a fever or feel unwell?' },
                { field: 'isPregnant', label: 'Are you currently pregnant or breastfeeding?' },
                { field: 'onMedication', label: 'Are you currently on any medication?' },
                { field: 'hadRecentSurgery', label: 'Have you had a surgery in the past 6 months?' },
                { field: 'hadRecentTattooOrPiercing', label: 'Have you had a tattoo or piercing in the past 6 months?' },
              ].map(({ field, label }) => (
                <div key={field} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex gap-4 items-center shrink-0">
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="radio" name={`health-${field}`} checked={health[field] === true}
                        onChange={() => setHealth({ ...health, [field]: true })} />
                      Yes
                    </label>
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="radio" name={`health-${field}`} checked={health[field] === false}
                        onChange={() => setHealth({ ...health, [field]: false })} />
                      No
                    </label>
                  </div>
                  <p className="text-sm text-gray-700 flex-1">{label}</p>
                </div>
              ))}

              {health.hadRecentSurgery && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Surgery</label>
                  <input type="date" max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={health.surgeryDate} onChange={updateHealth('surgeryDate')} />
                </div>
              )}

              {health.hadRecentTattooOrPiercing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Tattoo / Piercing</label>
                  <input type="date" max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={health.tattooOrPiercingDate} onChange={updateHealth('tattooOrPiercingDate')} />
                </div>
              )}

              {/* Eligibility preview */}
              {(() => {
                const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
                const blocked =
                  health.hasFever || health.isPregnant || health.onMedication ||
                  (health.weight && parseFloat(health.weight) < 50) ||
                  (health.hadRecentSurgery && health.surgeryDate && new Date(health.surgeryDate) > sixMonthsAgo) ||
                  (health.hadRecentTattooOrPiercing && health.tattooOrPiercingDate && new Date(health.tattooOrPiercingDate) > sixMonthsAgo);

                return blocked ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm">
                    Based on your answers, you will be marked <strong>temporarily ineligible</strong>. Your availability will be set to off until conditions change.
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">
                    You appear eligible to donate blood.
                  </div>
                );
              })()}
            </div>
          </div>
        )}

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