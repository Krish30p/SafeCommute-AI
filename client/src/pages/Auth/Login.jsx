import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login({ onNavigateToSignup }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <div className="w-full bg-white/70 backdrop-blur-xl py-8 px-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-3xl border border-white/50">
        
        <h2 className="text-center text-xl font-bold text-gray-800 mb-6">
          Welcome Back
        </h2>

        {error && (
          <div className="mb-6 bg-red-50/80 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={16} className="text-red-500" />
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
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
                className="block w-full pl-11 pr-4 py-3 bg-white/60 border border-gray-200/60 rounded-xl leading-5 text-gray-800 placeholder-gray-400 input-glow transition-all duration-300 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">
              Password
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-white/60 border border-gray-200/60 rounded-xl leading-5 text-gray-800 placeholder-gray-400 input-glow transition-all duration-300 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#AECBEB] hover:bg-[#9BBDE2] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#AECBEB] disabled:opacity-60 disabled:hover:translate-y-0 transition-all duration-300"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-transparent text-gray-500 bg-white/80 rounded-full text-xs font-medium">
                New to SafeCommute AI?
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={onNavigateToSignup}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-transparent bg-gray-100/50 hover:bg-white hover:border-gray-200 hover:shadow-sm rounded-xl text-sm font-bold text-gray-600 transition-all duration-300"
            >
              Create an account <ArrowRight size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
