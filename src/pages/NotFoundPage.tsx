import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack onBack={() => navigate(-1)} />
      <PageContainer>
        <div className="text-center py-12 bg-white rounded-xl border">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
          <p className="text-gray-500 mb-6">The page you requested does not exist.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Go Back
            </Button>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
