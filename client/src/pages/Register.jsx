import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const defaultHealth = {
  hasFever: false,
  isPregnant: false,
  onMedication: false,
  hadRecentSurgery: false,
  surgeryDate: '',
  hadRecentTattooOrPiercing: false,
  tattooOrPiercingDate: '',
  weight: '',
};

export default function Register() {
  const [step, setStep] = useState(1); // step 1: basic info, step 2: health (donors only)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'donor',
    phone: '',
    bloodGroup: 'O+',
  });
  const [health, setHealth] = useState(defaultHealth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const updateHealth = (field) => (e) =>
    setHealth({ ...health, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const handleNextStep = (e) => {
    e.preventDefault();
    if (form.role === 'donor') {
      setStep(2);
    } else {
      submitForm();
    }
  };

  const submitForm = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (form.role === 'donor') {
        payload.healthStatus = {
          ...health,
          weight: health.weight ? parseFloat(health.weight) : undefined,
          surgeryDate: health.hadRecentSurgery && health.surgeryDate ? health.surgeryDate : undefined,
          tattooOrPiercingDate: health.hadRecentTattooOrPiercing && health.tattooOrPiercingDate ? health.tattooOrPiercingDate : undefined,
        };
      }
      const user = await register(payload);
      navigate(`/dashboard/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

        {/* Step indicator for donors */}
        {form.role === 'donor' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 1 ? 'bg-primary-600 text-white' : 'bg-green-500 text-white'}`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={`h-1 w-12 rounded ${step > 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-1">
          {step === 1 ? 'Create Account' : 'Health Questionnaire'}
        </h2>
        {step === 2 && (
          <p className="text-sm text-center text-gray-500 mb-5">
            This helps us determine your eligibility. You'll be asked to update this regularly.
          </p>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={form.name} onChange={update('name')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={form.email} onChange={update('email')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={form.password} onChange={update('password')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
              <div className="grid grid-cols-3 gap-2">
                {['donor', 'patient', 'hospital'].map((role) => (
                  <button key={role} type="button"
                    onClick={() => setForm({ ...form, role })}
                    className={`py-2 px-3 rounded-lg text-sm font-medium capitalize border transition-colors ${
                      form.role === role
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                    }`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={form.phone} onChange={update('phone')} />
            </div>

            {form.role !== 'hospital' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={form.bloodGroup} onChange={update('bloodGroup')}>
                  {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">
              {form.role === 'donor' ? 'Next: Health Check →' : (loading ? 'Creating account...' : 'Create Account')}
            </button>
          </form>
        )}

        {/* ── Step 2: Health Questionnaire (donors only) ── */}
        {step === 2 && (
          <form onSubmit={submitForm} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Must be at least 50 kg"
                value={health.weight} onChange={updateHealth('weight')} />
              {health.weight && parseFloat(health.weight) < 50 && (
                <p className="text-red-500 text-xs mt-1">You must weigh at least 50 kg to be eligible to donate.</p>
              )}
            </div>

            {/* Yes/No health questions */}
            {[
              { field: 'hasFever', label: 'Do you currently have a fever or feel unwell?' },
              { field: 'isPregnant', label: 'Are you currently pregnant or breastfeeding?' },
              { field: 'onMedication', label: 'Are you currently on any medication?' },
              { field: 'hadRecentSurgery', label: 'Have you had a surgery in the past 6 months?' },
              { field: 'hadRecentTattooOrPiercing', label: 'Have you had a tattoo or piercing in the past 6 months?' },
            ].map(({ field, label }) => (
              <div key={field} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="radio" name={field} value="yes" checked={health[field] === true}
                      onChange={() => setHealth({ ...health, [field]: true })} />
                    Yes
                  </label>
                  <label className="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="radio" name={field} value="no" checked={health[field] === false}
                      onChange={() => setHealth({ ...health, [field]: false })} />
                    No
                  </label>
                </div>
                <p className="text-sm text-gray-700 flex-1">{label}</p>
              </div>
            ))}

            {/* Date fields shown conditionally */}
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
              const blocked = health.hasFever || health.isPregnant || health.onMedication
                || (health.weight && parseFloat(health.weight) < 50)
                || (health.hadRecentSurgery && health.surgeryDate && new Date(health.surgeryDate) > sixMonthsAgo)
                || (health.hadRecentTattooOrPiercing && health.tattooOrPiercingDate && new Date(health.tattooOrPiercingDate) > sixMonthsAgo);

              return blocked ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm">
                  Based on your answers, you will be registered as <strong>temporarily ineligible</strong> to donate. You can update your health status later from your profile once conditions change.
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">
                  You appear eligible to donate blood.
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                ← Back
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
