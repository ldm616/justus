import { BUILD_INFO } from '../buildInfo';

export default function Footer() {
  // Format the build date like "Tue Sep 2 3:35 PM PT"
  const formatBuildDate = () => {
    const date = new Date(BUILD_INFO.lastUpdated);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-indigo-900 dark:bg-indigo-950 z-40">
      <div className="max-w-4xl mx-auto px-4 py-2">
        <p className="text-center text-xs text-indigo-300/60">
          Last updated: {formatBuildDate()}
        </p>
      </div>
    </footer>
  );
}