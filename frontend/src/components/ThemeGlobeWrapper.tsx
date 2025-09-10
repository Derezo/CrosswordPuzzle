'use client';

import { Component, ReactNode, Suspense, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PuzzleCategory } from '@/types';

// Enhanced Error Boundary Class Component with HMR recovery
class ThemeGlobeErrorBoundary extends Component<
  { 
    children: ReactNode; 
    fallback: (error: Error, reset: () => void) => ReactNode;
    onError?: (error: Error) => void;
  },
  { hasError: boolean; error: Error | null; errorId: string }
> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: any) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorId: '' 
    };
  }

  static getDerivedStateFromError(error: Error) {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error, 
      errorId 
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ThemeGlobe Error:', error, errorInfo);
    
    // Report error to parent component if provided
    if (this.props.onError) {
      this.props.onError(error);
    }
    
    // Auto-retry for certain HMR-related errors
    if (this.isHMRError(error) && this.retryCount < this.maxRetries) {
      setTimeout(() => {
        this.retryCount++;
        console.log(`Auto-retrying ThemeGlobe (attempt ${this.retryCount}/${this.maxRetries})`);
        this.setState({ hasError: false, error: null, errorId: '' });
      }, 1000);
    }
  }

  private isHMRError(error: Error): boolean {
    const hmrKeywords = [
      'module factory not available',
      'Cannot read properties of undefined',
      'TypeError: Cannot read property',
      'ChunkLoadError',
      'Loading chunk',
      'Failed to import'
    ];
    
    return hmrKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword.toLowerCase()) ||
      error.stack?.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  componentDidUpdate(prevProps: any) {
    // Reset error boundary when children change (HMR update)
    if (this.state.hasError && prevProps.children !== this.props.children) {
      console.log('Resetting error boundary due to HMR update');
      this.setState({ hasError: false, error: null, errorId: '' });
      this.retryCount = 0;
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, () => {
        this.setState({ hasError: false, error: null, errorId: '' });
        this.retryCount = 0;
      });
    }

    return this.props.children;
  }
}

// Enhanced error fallback component with diagnostics
function ThemeGlobeErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const [diagnostics, setDiagnostics] = useState<string>('');
  
  useEffect(() => {
    // Gather diagnostic information
    const diagInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      href: window.location.href,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace available',
      isHMRError: isHMRRelatedError(error),
      recommendations: getErrorRecommendations(error)
    };
    
    setDiagnostics(JSON.stringify(diagInfo, null, 2));
  }, [error]);
  
  const isHMRRelatedError = (error: Error): boolean => {
    const hmrKeywords = [
      'module factory not available',
      'Cannot read properties of undefined',
      'ChunkLoadError',
      'Loading chunk',
      'Failed to import'
    ];
    
    return hmrKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  const getErrorRecommendations = (error: Error): string[] => {
    const recommendations: string[] = [];
    
    if (isHMRRelatedError(error)) {
      recommendations.push('Try using the "Reload Globe" button above');
      recommendations.push('Switch to stable mode with npm run dev:stable');
      recommendations.push('Clear browser cache and refresh the page');
    }
    
    if (error.message.includes('three') || error.message.includes('Three')) {
      recommendations.push('Three.js modules may need a hard refresh');
      recommendations.push('Consider restarting the development server');
    }
    
    if (error.message.includes('fiber') || error.message.includes('drei')) {
      recommendations.push('React Three Fiber components may need remounting');
      recommendations.push('Try switching tabs and back to trigger remount');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Try reloading the page');
      recommendations.push('Check the browser console for additional errors');
    }
    
    return recommendations;
  };
  
  const handleFullReload = () => {
    window.location.reload();
  };
  
  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    window.location.reload();
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-center text-white max-w-2xl mx-auto p-6">
        <div className="text-6xl mb-4">🌌</div>
        <h2 className="text-xl font-bold mb-2">Theme Globe Error</h2>
        <p className="text-gray-300 mb-4 text-sm">
          The 3D theme globe encountered an error. {isHMRRelatedError(error) ? 'This appears to be HMR-related.' : 'This may be a Three.js rendering issue.'}
        </p>
        
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <button
            onClick={resetErrorBoundary}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            🔄 Reload Globe
          </button>
          <button
            onClick={handleFullReload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            🌍 Full Page Reload
          </button>
          <button
            onClick={handleClearCache}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            🧹 Clear Cache & Reload
          </button>
        </div>
        
        {/* Quick recommendations */}
        <div className="bg-blue-900/20 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">💡 Recommendations:</h3>
          <ul className="text-xs text-gray-300 text-left space-y-1">
            {getErrorRecommendations(error).map((rec, idx) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
        
        <details className="text-left">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-white mb-2">
            🔍 Technical Details & Diagnostics
          </summary>
          <div className="space-y-2">
            <div className="bg-red-900/20 rounded p-3">
              <h4 className="text-xs font-semibold text-red-300 mb-1">Error Message:</h4>
              <pre className="text-xs text-red-200 overflow-auto">{error.message}</pre>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <h4 className="text-xs font-semibold text-gray-300 mb-1">Full Diagnostics:</h4>
              <pre className="text-xs text-gray-300 overflow-auto max-h-40">{diagnostics}</pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

// Loading component
function ThemeGlobeLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/20 border-t-purple-500 mx-auto mb-4"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-2xl">🌌</div>
          </div>
        </div>
        <p className="text-lg font-semibold mb-2">Initializing Theme Globe</p>
        <p className="text-sm text-gray-400">Loading 3D visualization...</p>
      </div>
    </div>
  );
}

// Dynamically import ThemeGlobe with enhanced error handling and retry logic
const ThemeGlobe = dynamic(
  () => import('@/components/ThemeGlobe').catch(error => {
    console.error('Failed to load ThemeGlobe:', error);
    // Return a fallback component for import failures
    return {
      default: () => (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Failed to Load 3D Globe</h3>
            <p className="text-sm text-gray-300 mb-4">The Three.js module failed to load</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    };
  }),
  {
    ssr: false,
    loading: ThemeGlobeLoading,
  }
);

interface ThemeGlobeWrapperProps {
  onCategorySelect?: (category: PuzzleCategory) => void;
}

export default function ThemeGlobeWrapper({ onCategorySelect }: ThemeGlobeWrapperProps) {
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);
  
  const handleError = useCallback((error: Error) => {
    const now = Date.now();
    setLastErrorTime(now);
    setErrorCount(prev => prev + 1);
    
    // Log error with context for debugging
    console.error('ThemeGlobe Error Context:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date(now).toISOString(),
      errorCount: errorCount + 1,
      userAgent: navigator.userAgent,
      href: window.location.href,
    });
  }, [errorCount]);

  return (
    <div className="w-full h-full relative">
      {/* Error count indicator for development */}
      {process.env.NODE_ENV === 'development' && errorCount > 0 && (
        <div className="absolute top-2 right-2 z-50 bg-red-600 text-white text-xs px-2 py-1 rounded">
          Errors: {errorCount}
        </div>
      )}
      
      <ThemeGlobeErrorBoundary
        onError={handleError}
        fallback={(error, reset) => (
          <ThemeGlobeErrorFallback error={error} resetErrorBoundary={reset} />
        )}
      >
        <Suspense fallback={<ThemeGlobeLoading />}>
          <ThemeGlobe onCategorySelect={onCategorySelect} />
        </Suspense>
      </ThemeGlobeErrorBoundary>
    </div>
  );
}