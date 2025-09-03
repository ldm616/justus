export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Less than a minute
  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }
  
  // Less than an hour
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  
  // Less than a day
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  
  // Less than 30 days
  if (diffDays < 30) {
    return `${diffDays}d`;
  }
  
  // Same year - show month and day
  if (past.getFullYear() === now.getFullYear()) {
    const month = past.toLocaleDateString('en-US', { month: 'short' });
    const day = past.getDate();
    return `${month} ${day}`;
  }
  
  // Different year - show month, day, and year
  const month = past.toLocaleDateString('en-US', { month: 'short' });
  const day = past.getDate();
  const year = past.getFullYear();
  return `${month} ${day}, ${year}`;
}