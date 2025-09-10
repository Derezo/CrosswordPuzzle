# Development Environment Guide

This guide provides comprehensive instructions for setting up and troubleshooting the Galactic Crossword development environment, with special focus on resolving HMR (Hot Module Replacement) issues and Three.js component stability.

## Quick Start

### Option 1: Interactive Mode Selector (Recommended)
```bash
./dev-selector.sh
```
This interactive script will help you choose the best development mode for your needs.

### Option 2: Direct Mode Selection

**For Maximum Stability (Recommended):**
```bash
./scripts/dev-stable.sh
```

**For Fast Development with Turbopack:**
```bash
./scripts/dev.sh
```

**For Docker Environment:**
```bash
./scripts/dev-utils.sh start
```

**For Troubleshooting:**
```bash
./scripts/dev-troubleshoot.sh
```

## Development Modes Explained

### 1. 🛡️ Stable Mode (`dev-stable.sh`)
- **Best for**: Reliable development without crashes
- **Features**:
  - Uses standard Webpack instead of Turbopack
  - Enhanced error boundaries for Three.js components
  - Process cleanup on startup
  - Longer polling intervals for stability
  - Fast Refresh disabled for Three.js files
- **When to use**: When you need consistent development without HMR crashes

### 2. ⚡ Turbopack Mode (`dev.sh`)
- **Best for**: Fast builds and latest features
- **Features**:
  - Uses Turbopack for faster builds
  - Latest Next.js 15 optimizations
  - Experimental features enabled
- **When to use**: For quick iterations when stability is less critical
- **Note**: May experience HMR issues with Three.js components

### 3. 🐳 Docker Mode (`dev-utils.sh`)
- **Best for**: Production-like development
- **Features**:
  - Runs in isolated containers
  - Includes full stack (frontend, backend, Redis)
  - Consistent across different systems
- **When to use**: When you need a production-like environment

### 4. 🔧 Troubleshoot Mode (`dev-troubleshoot.sh`)
- **Best for**: Diagnosing and fixing issues
- **Features**:
  - Comprehensive system diagnostics
  - Automated problem detection
  - Recovery actions and recommendations
- **When to use**: When something is broken or not working as expected

## Common Issues and Solutions

### HMR (Hot Module Replacement) Crashes

**Symptoms:**
- "Module factory not available" errors
- Three.js components crashing on code changes
- Frontend becomes unresponsive after edits

**Solutions:**
1. **Switch to Stable Mode**: `./scripts/dev-stable.sh`
2. **Clear caches**: `rm -rf frontend/.next`
3. **Use error boundary recovery**: Click "Reload Globe" button in UI
4. **Hard refresh browser**: Ctrl+F5 or Ctrl+Shift+R
5. **Restart development server**: Kill processes and restart

### Three.js Component Issues

**Symptoms:**
- 3D globe fails to render
- WebGL context lost errors
- Black screen instead of globe

**Solutions:**
1. **Check WebGL support**: Visit https://get.webgl.org/
2. **Update graphics drivers**
3. **Try different browser** (Chrome/Firefox recommended)
4. **Disable hardware acceleration** in browser settings
5. **Use fallback components**: Built-in error boundaries will show alternatives

### Port Conflicts

**Symptoms:**
- "Port already in use" errors
- Cannot start development servers

**Solutions:**
```bash
# Kill all Node processes
pkill -f node

# Free specific ports
lsof -ti :3000 | xargs kill -9
lsof -ti :5000 | xargs kill -9

# Or use different ports
PORT=3001 npm run dev
```

### Build or Dependency Issues

**Symptoms:**
- Module not found errors
- TypeScript compilation errors
- Build failures

**Solutions:**
```bash
# Full reset (nuclear option)
./scripts/dev-troubleshoot.sh  # Select option 6

# Or manual steps:
rm -rf {frontend,backend}/node_modules
rm -f {frontend,backend}/package-lock.json
cd backend && npm install && npx prisma generate
cd frontend && npm install
```

## Package.json Scripts

### Frontend Scripts
- `npm run dev` - Standard Turbopack development
- `npm run dev:stable` - Stable development without Turbopack
- `npm run dev:experimental` - Experimental Turbopack features
- `npm run build` - Production build with Turbopack
- `npm run build:stable` - Production build without Turbopack
- `npm run type-check` - TypeScript validation

### Backend Scripts
- `npm run dev` - Development with nodemon
- `npm run build` - TypeScript compilation
- `npm start` - Production server

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_TELEMETRY_DISABLED=1
```

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=your-super-secret-jwt-key
# ... other backend vars
```

## Next.js Configuration Highlights

The project includes specialized Next.js configuration for Three.js stability:

- **Turbopack Configuration**: Optimized for Three.js modules
- **Webpack Optimizations**: Custom rules for shader files and Three.js
- **Bundle Splitting**: Separate chunks for Three.js libraries
- **Server-side Externals**: Proper SSR handling for Three.js
- **Performance Limits**: Increased for Three.js bundle sizes

## Three.js Component Architecture

### Error Boundary System
- **ThemeGlobeErrorBoundary**: Enhanced error boundary with HMR recovery
- **Auto-retry Logic**: Attempts to recover from HMR-related errors
- **Diagnostic Information**: Detailed error reporting for debugging

### Dynamic Loading
- **Dynamic Imports**: Three.js components loaded only on client
- **Fallback Components**: Graceful degradation when Three.js fails
- **Loading States**: Proper loading indicators during component initialization

## Troubleshooting Checklist

When development environment issues occur, follow this checklist:

1. **Check System Requirements**
   - Node.js 18+ installed
   - Sufficient RAM (4GB+ recommended)
   - Updated graphics drivers for WebGL

2. **Verify Project State**
   - All dependencies installed (`node_modules` present)
   - No port conflicts (3000, 5000 available)
   - No hanging processes

3. **Try Recovery Actions** (in order)
   - Use stable mode: `./scripts/dev-stable.sh`
   - Clear browser cache completely
   - Run troubleshooter: `./scripts/dev-troubleshoot.sh`
   - Full environment reset (nuclear option)

4. **Check Browser Compatibility**
   - WebGL 2.0 support enabled
   - Hardware acceleration enabled
   - No interfering browser extensions

## Performance Optimization

### Development Performance
- Use stable mode for consistent performance
- Close unnecessary browser tabs
- Increase Node.js memory: `NODE_OPTIONS='--max-old-space-size=4096'`
- Use production build for performance testing

### Three.js Performance
- Components use object pooling and efficient rendering
- Optimized shader compilation
- Proper cleanup of WebGL resources
- Frame rate limiting and adaptive quality

## Advanced Configuration

### Custom Webpack Rules
The Next.js config includes custom rules for:
- GLSL shader files (`.glsl`, `.vert`, `.frag`)
- Three.js module optimization
- Development vs production bundle splitting

### HMR Customization
- Selective Fast Refresh disabling for Three.js files
- Custom watch options for stability
- Polling intervals optimized for different file types

## Getting Help

If you're still experiencing issues after following this guide:

1. **Run the troubleshooter**: `./scripts/dev-troubleshoot.sh`
2. **Check browser console** for additional error details
3. **Try different browsers** to isolate WebGL issues
4. **Use the error boundaries** - they provide specific recovery options
5. **Check system resources** - ensure sufficient RAM and CPU

## File Structure

```
├── dev-selector.sh              # Interactive mode selector
├── scripts/
│   ├── dev-stable.sh           # Stable development mode
│   ├── dev-troubleshoot.sh     # Comprehensive diagnostics
│   ├── dev-utils.sh            # Docker development utilities
│   └── dev.sh                  # Standard Turbopack mode
├── frontend/
│   ├── next.config.js          # Enhanced Next.js config
│   ├── src/components/
│   │   ├── ThemeGlobe.tsx      # Main Three.js component
│   │   └── ThemeGlobeWrapper.tsx # Error boundary wrapper
│   └── package.json            # Multiple dev scripts
└── backend/
    └── ... (backend files)
```

This development environment is designed to be robust, recoverable, and developer-friendly. The stable mode should provide a consistently working development experience, while the troubleshooter can help diagnose and fix any issues that arise.