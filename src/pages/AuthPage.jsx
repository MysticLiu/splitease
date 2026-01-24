import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useApp } from '../context/AppContext';

export function AuthPage() {
  const navigate = useNavigate();
  const { session, signInWithPassword, signUp, signInWithGoogle } = useApp();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await signUp(email, password, fullName);
        if (signUpError) throw signUpError;
        setInfo('Check your email to confirm your account, then sign in.');
      } else {
        const { error: signInError } = await signInWithPassword(email, password);
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border rounded-xl shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white font-bold">
            $
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">SplitEase</h1>
          <p className="text-gray-500 text-sm">
            {mode === 'signup' ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-600">{info}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <div className="my-4 text-center text-xs text-gray-400">or</div>

        <Button
          variant="secondary"
          onClick={() => signInWithGoogle()}
          className="w-full"
          type="button"
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
