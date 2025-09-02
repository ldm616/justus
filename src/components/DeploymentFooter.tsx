export default function DeploymentFooter() {
  // This will be replaced at build time
  const deploymentTime = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    timeZone: 'America/Los_Angeles'
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 text-center py-2">
      <p className="text-xs text-gray-400">
        Deployed {deploymentTime}
      </p>
    </div>
  );
}