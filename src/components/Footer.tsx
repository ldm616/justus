export default function Footer() {
  const deployDate = new Date().toLocaleString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  });

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-400 text-xs py-2 px-4 text-center z-50">
      <p>Last deployed: {deployDate}</p>
    </footer>
  );
}