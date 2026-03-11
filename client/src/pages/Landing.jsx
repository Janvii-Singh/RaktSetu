import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-primary-600">RaktSetu</h1>
        <div className="space-x-4">
          <Link to="/login" className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium">
            Login
          </Link>
          <Link to="/register" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
            Register
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Find Blood Donors <span className="text-primary-600">Near You</span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            RaktSetu connects patients and hospitals with nearby eligible blood donors in real-time
            using intelligent matching and geo-spatial technology.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all"
          >
            Get Started
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          {[
            {
              title: 'Real-time Matching',
              desc: 'Find compatible donors near you instantly with smart geo-spatial matching.',
              icon: '🔍',
            },
            {
              title: 'ML-Powered Predictions',
              desc: 'Our AI predicts donor availability to maximize response rates.',
              icon: '🤖',
            },
            {
              title: 'Live Notifications',
              desc: 'Get instant alerts when donors respond to your blood requests.',
              icon: '🔔',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Roles */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">For Everyone in the Chain</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { role: 'Donors', desc: 'Register, set availability, and respond to blood requests near you.' },
              { role: 'Patients', desc: 'Create blood requests and get matched with eligible donors instantly.' },
              { role: 'Hospitals', desc: 'Manage requests, view donor pools, and track fulfillment analytics.' },
            ].map((r) => (
              <div key={r.role} className="p-6 border border-gray-200 rounded-xl">
                <h4 className="text-lg font-semibold text-primary-600 mb-2">{r.role}</h4>
                <p className="text-gray-600">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm">
        RaktSetu &mdash; Major Project 2026
      </footer>
    </div>
  );
}
