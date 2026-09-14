import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Lock,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { LightParticleBackground } from '../../components/common/LightParticleBackground';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Request, 2 = Reset with OTP/Token
  const [identifier, setIdentifier] = useState('');
  const [tokenOrOtp, setTokenOrOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devDetails, setDevDetails] = useState(null);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { identifier });
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Password reset code generated.');
        if (res.data.devResetOtp || res.data.devResetToken) {
          setDevDetails({
            otp: res.data.devResetOtp,
            token: res.data.devResetToken,
          });
          setTokenOrOtp(res.data.devResetOtp || res.data.devResetToken);
        }
        setStep(2);
      }
    } catch (err) {
      setError(err.message || 'Unable to process reset request. Please check identifier.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        identifier,
        otp: tokenOrOtp.length === 6 ? tokenOrOtp : undefined,
        token: tokenOrOtp.length > 6 ? tokenOrOtp : undefined,
        newPassword,
        confirmPassword,
      });

      if (res.data?.success) {
        setSuccessMsg('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Password reset failed. Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-neutral-900 flex items-center justify-center p-4 sm:p-6 select-none relative bg-gradient-to-br from-[#deecfc] via-[#eaf2fc] to-[#f5f9ff] overflow-hidden">
      <LightParticleBackground />

      <div className="max-w-md w-full mx-auto relative z-10 space-y-6">
        {/* Shield Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-[#e6f1fb] border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm mx-auto">
            <KeyRound className="w-7 h-7 text-sky-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Account Recovery
          </h1>
          <p className="text-xs text-neutral-500">
            RAKSHA-NER Government Multi-Hazard Early Warning Gateway
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-sky-100/50 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Registered Phone or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 9876543210 or officer@raksha.gov.in"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-[#f8fbff] border border-sky-100/80 rounded-xl text-neutral-900 text-xs sm:text-sm placeholder-neutral-400 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  A 15-minute single-use authorization code will be generated for your verified account.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Generating Code...' : 'Request Reset Authorization'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleCompleteReset} className="space-y-4">
              {devDetails && (
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>Demo Fast-Fill Code:</span>
                  </div>
                  <p className="font-mono text-sm font-extrabold text-sky-700 tracking-wider">
                    OTP: {devDetails.otp}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  6-Digit OTP or Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={tokenOrOtp}
                  onChange={(e) => setTokenOrOtp(e.target.value)}
                  placeholder="e.g. 849201"
                  className="block w-full px-3.5 py-2.5 bg-[#f8fbff] border border-sky-100/80 rounded-xl text-neutral-900 text-xs sm:text-sm font-mono focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-[#f8fbff] border border-sky-100/80 rounded-xl text-neutral-900 text-xs sm:text-sm placeholder-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-[#f8fbff] border border-sky-100/80 rounded-xl text-neutral-900 text-xs sm:text-sm placeholder-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Securing Account...' : 'Set New Password & Authenticate'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs text-neutral-500 hover:text-neutral-800 font-semibold transition-colors cursor-pointer"
              >
                ← Back to Identifier Step
              </button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-neutral-100">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-900 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Portal Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
