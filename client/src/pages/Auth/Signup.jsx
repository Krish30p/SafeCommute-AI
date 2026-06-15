import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, AlertCircle, ArrowLeft, Phone } from 'lucide-react';

export default function Signup({ onNavigateToLogin }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      return setError('Passwords do not match');
    }

    if (!name.trim()) {
      return setError('Name is required for SOS alerts');
    }

    if (!phone.trim()) {
      return setError('Phone number is required');
    }

    if (!phone.startsWith('+')) {
      return setError('Phone number must start with country code (e.g. +91XXXXXXXXXX)');
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password, name, phone);
    } catch (err) {
      setError('Failed to create an account. ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <div className="w-full bg-white/70 backdrop-blur-xl py-8 px-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-3xl border border-white/50">
        
        <h2 className="text-center text-xl font-bold text-gray-800 mb-6">
          Create an account
        </h2>

        {error && (
          <div className="mb-6 bg-red-50/80 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">
              Full Name
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-11 pr-4 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl leading-5 text-gray-800 placeholder-gray-400 input-glow transition-all duration-300 sm:text-sm"
                placeholder="Jane Doe"
              />
            </div>
            <p className="mt-1 ml-1 text-xs text-gray-500 font-medium">Required for SOS WhatsApp alerts</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">
              Phone Number
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full pl-11 pr-4 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl leading-5 text-gray-800 placeholder-gray-400 input-glow transition-all duration-300 sm:text-sm"
                placeholder="+919876543210"
              />
            </div>
            <p className="mt-1 ml-1 text-xs text-gray-500 font-medium">Must include country code (e.g. +91)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">
              Email address
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl leading-5 text-gray-800 placeholder-gray-400 input-glow transition-all duration-300 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl leading-5 text-gray-800 placeholder-gray-400 input-glow transition-all duration-300 sm:text-sm"
                  placeholder="••••••••"
                  minLength="6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">
                Confirm
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl leading-5 text-gray-800 placeholder-gray-400 input-glow transition-all duration-300 sm:text-sm"
                  placeholder="••••••••"
                  minLength="6"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#AECBEB] hover:bg-[#9BBDE2] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#AECBEB] disabled:opacity-60 disabled:hover:translate-y-0 transition-all duration-300"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <button
            onClick={onNavigateToLogin}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 transition-all duration-300"
          >
            <ArrowLeft size={16} /> Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
