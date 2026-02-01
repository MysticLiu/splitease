import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { useApp } from '../context/AppContext';

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useApp();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.fullName || '');
    setAvatarUrl(profile?.avatarUrl || '');
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      setStatus('Profile updated.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Profile" showBack onBack={() => navigate('/')} />
      <PageContainer>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar
                  name={fullName || profile?.email || 'User'}
                  color="#6366F1"
                  size="lg"
                  src={avatarUrl || profile?.avatarUrl}
                />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900">
                    {profile?.email || 'No email'}
                  </p>
                  <p>Signed in</p>
                </div>
              </div>

              <Input
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Avatar URL (optional)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />

              {status && <p className="text-sm text-emerald-600">{status}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
