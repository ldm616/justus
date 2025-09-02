import { useUser } from '../contexts/UserContext';

export default function Home() {
  const { profile } = useUser();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Home
          </h1>
          {profile ? (
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {profile.username || 'User'}!
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to JustUs. Please sign in to continue.
            </p>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2025 JustUs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}