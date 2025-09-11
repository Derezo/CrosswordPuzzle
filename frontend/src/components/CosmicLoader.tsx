'use client';

import { useEffect, useState } from 'react';

interface CosmicLoaderProps {
  isLoading: boolean;
  onComplete: () => void;
  loadingText?: string;
}

export const CosmicLoader: React.FC<CosmicLoaderProps> = ({
  isLoading,
  onComplete,
  loadingText = "Initializing cosmic theme universe..."
}) => {
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  const [stars, setStars] = useState<Array<{id: number, left: number, top: number, delay: number, duration: number, opacity: number}>>([]);
  const [showDisintegration, setShowDisintegration] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Generate random particles for disintegration effect
    const particleCount = 120;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.8
    }));
    setParticles(newParticles);

    // Generate random stars for background animation
    const starCount = 100;
    const newStars = Array.from({ length: starCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
      opacity: Math.random() * 0.8 + 0.2
    }));
    setStars(newStars);
  }, []);

  useEffect(() => {
    if (isLoading && !isComplete) {
      setShouldRender(true);
      setProgress(0);
      setShowDisintegration(false);
      setIsComplete(false);
      
      // Simulate loading progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            // Start disintegration after a brief pause
            setTimeout(() => {
              setShowDisintegration(true);
              // Complete after disintegration animation
              setTimeout(() => {
                setIsComplete(true);
                setShouldRender(false);
                onComplete();
              }, 1200);
            }, 300);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 100);

      return () => clearInterval(progressInterval);
    } else if (!isLoading && !showDisintegration) {
      // Reset all states when not loading
      setIsComplete(false);
      setShowDisintegration(false);
      setProgress(0);
      setShouldRender(false);
    }
  }, [isLoading, onComplete, isComplete, showDisintegration]);

  // Don't render if not needed
  if (!shouldRender && !isLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        showDisintegration ? 'opacity-90' : 'opacity-100'
      } ${isComplete ? 'pointer-events-none opacity-0' : ''}`}
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 35%, #0f051d 100%)'
      }}
    >
      {/* Animated background stars */}
      {!showDisintegration && !isComplete && stars.length > 0 && (
        <div className="absolute inset-0 overflow-hidden">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
                opacity: star.opacity
              }}
            />
          ))}
        </div>
      )}

      {/* Disintegration particles */}
      {showDisintegration && (
        <div className="absolute inset-0">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animation: `disintegrate 1.2s ease-out forwards`,
                animationDelay: `${particle.delay}s`,
                opacity: 0.8
              }}
            />
          ))}
        </div>
      )}

      {/* Main loading content */}
      <div className={`text-center z-10 transition-all duration-500 ${
        showDisintegration || isComplete ? 'transform scale-110 opacity-0' : 'opacity-100'
      }`}>
        {/* Central cosmic orb */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto relative">
            {/* Outer rotating ring */}
            <div className={`absolute inset-0 rounded-full border-2 border-purple-500/30 ${
              showDisintegration || isComplete ? '' : 'animate-spin'
            }`}></div>
            
            {/* Middle pulsing ring */}
            <div className={`absolute inset-2 rounded-full border border-blue-400/50 ${
              showDisintegration || isComplete ? '' : 'animate-pulse'
            }`}></div>
            
            {/* Inner glowing orb */}
            <div className={`absolute inset-4 rounded-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 shadow-2xl shadow-purple-500/50 ${
              showDisintegration || isComplete ? '' : 'animate-pulse'
            }`}>
              <div className="absolute inset-2 rounded-full bg-gradient-to-r from-white/20 to-transparent"></div>
            </div>

            {/* Rotating particles around orb */}
            {!showDisintegration && !isComplete && Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  transformOrigin: '0 0',
                  animation: `orbit 3s linear infinite`,
                  animationDelay: `${i * 0.375}s`,
                  transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateX(80px)`
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading text */}
        <h2 className={`text-2xl font-bold text-white mb-4 ${
          showDisintegration || isComplete ? '' : 'animate-pulse'
        }`}>
          🌌 Theme Globe
        </h2>
        <p className={`text-lg text-purple-300 mb-6 ${
          showDisintegration || isComplete ? '' : 'animate-pulse'
        }`}>
          {loadingText}
        </p>

        {/* Progress bar */}
        <div className="w-80 max-w-sm mx-auto mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Loading</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              <div className="h-full bg-gradient-to-r from-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Loading dots */}
        {!showDisintegration && !isComplete && (
          <div className="flex justify-center space-x-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes orbit {
          from {
            transform: translate(-50%, -50%) rotate(0deg) translateX(80px);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg) translateX(80px);
          }
        }

        @keyframes disintegrate {
          0% {
            opacity: 0.8;
            transform: scale(1) translateY(0) rotate(0deg);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.6) translateY(-30px) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.1) translateY(-120px) translateX(100px) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default CosmicLoader;