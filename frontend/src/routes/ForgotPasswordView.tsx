import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/actions/Button';
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordView: React.FC = () => {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: err } = await resetPasswordForEmail(email.trim());
    setLoading(false);

    if (err) {
      setError(err.message || 'Failed to dispatch recovery link. Please try again.');
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto">
      <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#090d16]/85 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.7)] p-6 sm:p-8 transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white font-sans">
            Reset password
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1.5 leading-relaxed">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                If an account exists for <span className="font-semibold text-white">{email}</span>, a password reset link has been dispatched to your inbox.
              </span>
            </div>
            <Link to="/login" className="block">
              <Button
                variant="secondary"
                className="w-full justify-center text-xs py-2.5 text-white/80 border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Return to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label htmlFor="recovery-email" className="text-xs font-medium text-white/80">
                Email address <span className="text-[#00d2ff]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="recovery-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d131f] border border-white/10 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff]/30 text-sm text-white placeholder-white/30 outline-none transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 justify-center text-sm font-semibold text-black bg-gradient-to-r from-white via-[#e0f2fe] to-[#00d2ff] hover:opacity-95 hover:shadow-[0_0_25px_rgba(0,210,255,0.3)] transition-all rounded-xl mt-3 active:scale-[0.99]"
              rightIcon={<Send className="w-3.5 h-3.5 text-black" />}
              isLoading={loading}
            >
              Send Reset Link
            </Button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="pt-5 mt-5 border-t border-white/10 text-center">
          <Link
            to="/login"
            className="text-xs text-white/50 hover:text-[#00d2ff] transition-colors inline-flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordView;
