// StayNexa Login Page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const DEMO_LOGINS = [
  { label: 'Super Admin', email: 'admin@staynexa.com', role: 'Platform Admin' },
  { label: 'Hotel Admin (Grand Palace)', email: 'vikram@grandpalace.com', role: 'Hotel Admin' },
  { label: 'Reception (Grand Palace)', email: 'anjali@grandpalace.com', role: 'Reception' },
  { label: 'Kitchen (Grand Palace)', email: 'mohan@grandpalace.com', role: 'Kitchen Staff' },
  { label: 'Housekeeping', email: 'rekha@grandpalace.com', role: 'Housekeeping' },
  { label: 'Maintenance', email: 'ramesh@grandpalace.com', role: 'Maintenance' },
  { label: 'Hotel Admin (Willow Boutique)', email: 'priti@willowboutique.in', role: 'Hotel Admin' },
  { label: 'Hotel Admin (Azure Cove)', email: 'carlos@azurecove.com', role: 'Hotel Admin' },
];

export default function LoginPage() {
  const { signIn, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    setError('');
    setIsLoading(true);
    try {
      const result = await signIn(demoEmail, 'demo123');
      if (result.error) {
        setError(result.error);
      } else {
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#fafaf9]">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-[#1a2744] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#c9a84c] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-[#c9a84c] translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#c9a84c] rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-display font-bold text-2xl tracking-tight">StayNexa</div>
              <div className="text-[#c9a84c] text-sm">One Stay. One Platform.</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-white font-display text-4xl font-bold leading-tight mb-6">
            The complete hotel<br />
            operating system
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed mb-10">
            Manage reservations, guests, housekeeping, restaurant, and billing — all from one unified platform.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '3 Demo Hotels', sub: 'Ready to explore' },
              { label: '23 Modules', sub: 'Fully connected' },
              { label: 'Multi-tenant', sub: 'Isolated & secure' },
              { label: 'Role-based', sub: '9 user roles' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4">
                <div className="text-[#c9a84c] font-bold text-lg">{stat.label}</div>
                <div className="text-blue-200 text-sm">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-blue-300 text-sm">
          © 2024 StayNexa · All rights reserved
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#1a2744] rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#c9a84c]" />
          </div>
          <div>
            <div className="text-[#1a2744] font-display font-bold text-xl">StayNexa</div>
            <div className="text-[#c9a84c] text-xs">One Stay. One Platform.</div>
          </div>
        </div>

        <div className="w-full max-w-md">
          {/* Demo banner */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-800 font-semibold text-sm">Demo Mode Active</div>
              <div className="text-amber-700 text-xs mt-1">Use any quick login below. Password: <code className="bg-amber-100 px-1 rounded">demo123</code></div>
            </div>
          </div>

          {user && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                  {user.full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-[11px] text-blue-600 font-bold uppercase tracking-wide">Current Session</div>
                  <div className="text-sm font-bold text-[#1a2744]">{user.full_name}</div>
                  <div className="text-xs text-stone-500">{user.email} · <span className="font-medium text-blue-700">{user.role}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors shadow-sm"
                >
                  Go to App
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          <h2 className="text-[#242220] font-display text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-[#6b6864] text-sm mb-8">Sign in to your StayNexa account</p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#4f4d4a] mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3.5 py-2.5 border border-[#d9d8d5] rounded-lg text-[#242220] placeholder-[#b8b6b0] focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4f4d4a] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-3.5 py-2.5 border border-[#d9d8d5] rounded-lg text-[#242220] placeholder-[#b8b6b0] focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-transparent text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f8d87] hover:text-[#4f4d4a]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#1a2744] text-white rounded-lg font-medium text-sm hover:bg-[#243561] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e5e4e2]" /></div>
            <div className="relative flex justify-center"><span className="bg-[#fafaf9] px-3 text-[#8f8d87] text-xs">Quick Demo Login</span></div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {DEMO_LOGINS.map(demo => (
              <button
                key={demo.email}
                onClick={() => handleDemoLogin(demo.email)}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-4 py-3 border border-[#e5e4e2] rounded-lg hover:border-[#c9a84c] hover:bg-amber-50 transition-all text-left group disabled:opacity-60"
              >
                <div>
                  <div className="text-[#242220] font-medium text-sm group-hover:text-[#1a2744]">{demo.label}</div>
                  <div className="text-[#8f8d87] text-xs">{demo.email}</div>
                </div>
                <span className="text-xs bg-[#f1f0ee] group-hover:bg-amber-100 text-[#6b6864] px-2 py-1 rounded-full whitespace-nowrap">{demo.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
