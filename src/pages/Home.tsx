import { useUser } from '../contexts/UserContext';

export default function Home() {
  const { profile } = useUser();

  return (
    <div className="min-h-screen pt-[60px] md:pt-12">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8">
          <h1 className="text-3xl font-bold mb-4">
            Home
          </h1>
          {profile ? (
            <p className="text-muted">
              Welcome back, {profile.username || 'User'}!
            </p>
          ) : (
            <p className="text-muted">
              Welcome to JustUs. Please sign in to continue.
            </p>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <p className="text-center text-sm text-muted">
            © 2025 JustUs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}