import { useUser } from '../contexts/UserContext';

export default function Home() {
  const { profile } = useUser();

  return (
    <div className="min-h-screen pt-[60px] md:pt-12 pb-12">
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
    </div>
  );
}