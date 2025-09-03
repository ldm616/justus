import { Heart, Camera } from 'lucide-react';

interface AppIconProps {
  size?: number;
  className?: string;
}

export default function AppIcon({ size = 24, className = "" }: AppIconProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <Heart 
        size={size} 
        className="text-white fill-white"
      />
      <Camera 
        size={size * 0.5} 
        className="absolute text-black"
      />
    </div>
  );
}