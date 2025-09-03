interface AppIconProps {
  size?: number;
  className?: string;
}

export default function AppIcon({ size = 24, className = "" }: AppIconProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 200" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Camera body */}
        <rect x="40" y="60" width="120" height="120" rx="8" ry="8" fill="#fff" stroke="currentColor" strokeWidth="3"/>
        
        {/* Horizontal line bisecting camera at 1/4 point */}
        <line x1="40" y1="90" x2="160" y2="90" stroke="currentColor" strokeWidth="3"/>
        
        {/* Viewfinder in upper 1/4 section */}
        <rect x="50" y="69" width="20" height="12" rx="2" ry="2" fill="#fff" stroke="currentColor" strokeWidth="2"/>
        
        {/* Main lens in lower 3/4 section */}
        <circle cx="100" cy="135" r="32" fill="#fff" stroke="currentColor" strokeWidth="3"/>
        <circle cx="100" cy="135" r="24" fill="currentColor"/>
        
        {/* Heart shape in center of lens */}
        <path d="M100 130 C95 125, 87 125, 87 133 C87 141, 100 149, 100 149 C100 149, 113 141, 113 133 C113 125, 105 125, 100 130 Z" 
              fill="#fff"/>
      </svg>
    </div>
  );
}