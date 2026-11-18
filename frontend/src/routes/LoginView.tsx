import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/actions/Button';
import { GithubIcon } from '@/components/ui/icons/GithubIcon';
import { GoogleIcon } from '@/components/ui/icons/GoogleIcon';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { signInWithEmail, signInWithGitHub, signInWithGoogle, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const returnTo = (location.state as { returnTo?: string })?.returnTo || '/app/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your registered email address and password.');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: err } = await signInWithEmail(email.trim(), password);
    setLoading(false);

    if (err) {
      setError(err.message || 'Authentication failed. Please verify your email and password.');
    } else {
      navigate(returnTo, { replace: true });
    }
  };

  const handleGitHubLogin = async () => {
    setError(null);
    setOauthLoading('github');
    const { error: err } = await signInWithGitHub();
    setOauthLoading(null);
    if (err) {
      setError(err.message || 'GitHub sign-in failed. Please try again.');
    } else if (!isConfigured) {
      navigate(returnTo, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setOauthLoading('google');
    const { error: err } = await signInWithGoogle();
    setOauthLoading(null);
    if (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } else if (!isConfigured) {
      navigate(returnTo, { replace: true });
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {/* Login Card */}
      <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#090d16]/85 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.7)] p-6 sm:p-8 transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white font-sans">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1.5 leading-relaxed">
            Continue your learning journey where you left off.
          </p>
        </div>

        {/* Inline Error Alert */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Social Authentication */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || oauthLoading !== null}
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-white text-xs sm:text-sm font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            <GoogleIcon className="w-4 h-4" />
            <span>{oauthLoading === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={loading || oauthLoading !== null}
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-white text-xs sm:text-sm font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            <GithubIcon className="w-4 h-4 text-white" />
            <span>{oauthLoading === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-widest text-white/40">
            or continue with email
          </span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="login-email" className="text-xs font-medium text-white/80">
              Email address <span className="text-blue-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d131f] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-sm text-white placeholder-white/30 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-medium text-white/80">
                Password <span className="text-blue-400">*</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-white/50 hover:text-blue-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#0d131f] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-sm text-white placeholder-white/30 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 justify-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.35)] transition-all rounded-xl mt-3 active:scale-[0.99]"
            rightIcon={<ArrowRight className="w-4 h-4 text-white" />}
            isLoading={loading}
          >
            Sign In
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-5 mt-5 border-t border-white/10 text-center">
          <p className="text-xs text-white/50">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 font-medium hover:underline ml-1">
              Create an account →
            </Link>
          </p>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-3 text-[10px] text-white/30 font-mono">
            <Link to="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <span>&bull;</span>
            <Link to="/refunds" className="hover:text-white/60 transition-colors">Refunds</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
