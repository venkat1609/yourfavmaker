import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="container py-20 text-center animate-fade-in">
      <p className="text-6xl font-heading text-muted-foreground/30 mb-4">404</p>
      <h1 className="text-3xl font-heading mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>
      </Link>
    </div>
  );
}
