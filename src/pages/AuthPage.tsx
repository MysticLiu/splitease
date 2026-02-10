import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useApp } from '../context/useApp';

export function AuthPage() {
  const navigate = useNavigate();
  const { session, signInWithPassword, signUp, signInWithGoogle } = useApp();
  const recoveryParams = new URLSearchParams(window.location.hash.replace('#', ''));
  const isRecovery = recoveryParams.get('type') === 'recovery';
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'update'>(
    isRecovery ? 'update' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isRecovery) setMode('update');
  }, [isRecovery]);

  useEffect(() => {
    if (session && mode !== 'update') {
      navigate('/', { replace: true });
    }
  }, [session, mode, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (resetError) throw resetError;
        setInfo('Password reset email sent.');
        return;
      }

      if (mode === 'update') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        await supabase.auth.signOut();
        setInfo('Password updated. Please sign in again.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      if (mode === 'signup') {
        const { error: signUpError } = await signUp(email, password, fullName);
        if (signUpError) throw signUpError;
        setInfo('Check your email to confirm your account, then sign in.');
      } else {
        const { error: signInError } = await signInWithPassword(email, password);
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const showTabs = mode === 'login' || mode === 'signup';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border rounded-xl shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white font-bold">
            $
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">SplitEase</h1>
          <p className="text-gray-500 text-sm">
            {mode === 'signup'
              ? 'Create your account'
              : mode === 'reset'
              ? 'Reset your password'
              : mode === 'update'
              ? 'Set a new password'
              : 'Sign in to continue'}
          </p>
        </div>

        {showTabs && (
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Input
              label="Full name"
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          )}

          {mode !== 'update' && (
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          )}

          {(mode === 'login' || mode === 'signup' || mode === 'update') && (
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          )}

          {mode === 'update' && (
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              placeholder="********"
              required
            />
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={() => setMode('reset')}
            >
              Forgot your password?
            </button>
          )}

          {(mode === 'reset' || mode === 'update') && (
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-700"
              onClick={() => setMode('login')}
            >
              Back to sign in
            </button>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-600">{info}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'signup'
              ? 'Create account'
              : mode === 'reset'
              ? 'Send reset email'
              : mode === 'update'
              ? 'Update password'
              : 'Sign in'}
          </Button>
        </form>

        {mode === 'login' && (
          <>
            <div className="my-4 text-center text-xs text-gray-400">or</div>
            <Button
              variant="secondary"
              onClick={() => signInWithGoogle()}
              className="w-full"
              type="button"
            >
              Continue with Google
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
