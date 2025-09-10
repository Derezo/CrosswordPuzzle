'use client';

import { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { PuzzleCategory } from '@/types';
import { categoriesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Hook for mouse interaction
function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  return mousePosition;
}

// Individual category text in 3D space
function CategoryText({ 
  category, 
  position, 
  scale, 
  onHover, 
  onSelect,
  isHovered,
  isFavorite 
}: {
  category: PuzzleCategory;
  position: [number, number, number];
  scale: number;
  onHover: (category: PuzzleCategory | null) => void;
  onSelect: (category: PuzzleCategory) => void;
  isHovered: boolean;
  isFavorite: boolean;
}) {
  const textRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (textRef.current) {
      // Reduce floating animation frequency for less flicker
      const floatOffset = Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.015;
      textRef.current.position.set(position[0], position[1] + floatOffset, position[2]);
      
      // Face the camera less frequently to reduce flicker
      if (state.clock.elapsedTime % 0.1 < 0.016) { // Update ~6 times per second instead of 60
        textRef.current.lookAt(state.camera.position);
      }
      
      // Smooth hover scaling effect
      const targetScale = isHovered ? scale * 1.3 : scale;
      textRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    }
  });

  const textColor = useMemo(() => {
    if (isHovered) return '#ffffff'; // White for maximum contrast when hovered
    if (isFavorite) return '#ff6b6b'; // Red for favorite
    return '#e2e8f0'; // Light gray for default
  }, [isHovered, isFavorite]);

  const outlineColor = useMemo(() => {
    if (isHovered) return '#1e293b'; // Dark outline for hovered text
    if (isFavorite) return '#7f1d1d'; // Dark red outline for favorites
    return '#4c1d95'; // Dark purple outline for default
  }, [isHovered, isFavorite]);

  return (
    <group>
      {/* Single text element with stroke for better performance */}
      <Text
        ref={textRef}
        position={position}
        fontSize={0.8}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        strokeWidth={0.02}
        strokeColor={outlineColor}
        fillOpacity={1.0}
        strokeOpacity={isHovered ? 0.8 : 0.5}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover(category);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(category);
        }}
      >
        {category.name}
      </Text>
    </group>
  );
}

// Main globe component with rotating categories
function Globe({ 
  categories, 
  onCategoryHover, 
  onCategorySelect,
  hoveredCategory,
  favoriteCategory 
}: {
  categories: PuzzleCategory[];
  onCategoryHover: (category: PuzzleCategory | null) => void;
  onCategorySelect: (category: PuzzleCategory) => void;
  hoveredCategory: PuzzleCategory | null;
  favoriteCategory: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const mousePos = useMousePosition();
  
  // Handle hover to ensure only one category is highlighted at a time
  const handleCategoryHover = (category: PuzzleCategory | null) => {
    // Clear any existing hover state before setting new one
    if (category !== hoveredCategory) {
      onCategoryHover(category);
    }
  };
  
  // Auto-rotation with mouse influence
  useFrame((state) => {
    if (groupRef.current) {
      // Base rotation
      groupRef.current.rotation.y += 0.005;
      
      // Mouse influence
      const mouseInfluenceX = (mousePos.x / window.innerWidth - 0.5) * 0.5;
      const mouseInfluenceY = (mousePos.y / window.innerHeight - 0.5) * 0.5;
      
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mouseInfluenceY,
        0.05
      );
      
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        mouseInfluenceX * 0.3,
        0.05
      );
    }
  });

  // Calculate stable positions and scales (only recalculate when core data changes)
  const categoryPositions = useMemo(() => {
    if (!categories.length) return [];
    
    const maxWords = Math.max(...categories.map(c => c.wordCount));
    const minWords = Math.min(...categories.map(c => c.wordCount));
    const logMax = Math.log10(maxWords);
    const logMin = Math.log10(minWords);
    
    return categories.map((category) => {
      // Improved logarithmic scaling for text size
      const logWords = Math.log10(category.wordCount);
      const normalizedSize = (logWords - logMin) / (logMax - logMin);
      const scale = 0.3 + Math.pow(normalizedSize, 0.7) * 2.2;
      
      // Generate stable sphere distribution based ONLY on category ID and name
      // Remove wordCount and favoritesCount from position calculation
      const seed1 = category.id.split('').reduce((hash, char, i) => 
        ((hash << 5) - hash + char.charCodeAt(0) * (i + 1)) & 0xffffffff, 17);
      const seed2 = category.name.split('').reduce((hash, char, i) => 
        ((hash << 3) - hash + char.charCodeAt(0) * (i + 7)) & 0xffffffff, 31);
      
      // Create two independent random values [0,1)
      const random1 = Math.abs(Math.sin(seed1 * 12.9898)) % 1;
      const random2 = Math.abs(Math.sin(seed2 * 78.233)) % 1;
      
      // Use Marsaglia method for uniform sphere distribution
      const theta = random1 * 2 * Math.PI; // azimuthal angle
      const phi = Math.acos(2 * random2 - 1); // polar angle for uniform distribution
      
      // Convert spherical to cartesian coordinates
      const baseRadius = 15.0;
      const radiusVariation = normalizedSize * 0.2;
      const radius = baseRadius + radiusVariation;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      return {
        categoryId: category.id,
        position: [x, y, z] as [number, number, number],
        scale
      };
    });
  }, [categories.map(c => `${c.id}-${c.name}-${c.wordCount}`).sort().join('|')]);

  return (
    <group ref={groupRef}>
      {/* Wireframe sphere for reference */}
      <mesh>
        <sphereGeometry args={[15, 64, 64]} />
        <meshBasicMaterial 
          color="#6366f1" 
          wireframe 
          transparent 
          opacity={0.1} 
        />
      </mesh>
      
      {/* Category texts */}
      {categoryPositions.map(({ categoryId, position, scale }) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return null;
        
        return (
          <CategoryText
            key={category.id}
            category={category}
            position={position}
            scale={scale}
            onHover={handleCategoryHover}
            onSelect={onCategorySelect}
            isHovered={hoveredCategory?.id === category.id}
            isFavorite={favoriteCategory === category.id}
          />
        );
      })}
    </group>
  );
}

// Particle background for space effect
function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const colors = new Float32Array(2000 * 3);
    
    for (let i = 0; i < 2000; i++) {
      // Create a more spherical distribution around the larger sphere
      const radius = 25 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Vary colors - purples, blues, and pinks
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        // Purple
        colors[i * 3] = 0.5 + Math.random() * 0.3; // R
        colors[i * 3 + 1] = 0.2 + Math.random() * 0.3; // G
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
      } else if (colorChoice < 0.7) {
        // Blue
        colors[i * 3] = 0.2 + Math.random() * 0.3; // R
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.3; // G
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
      } else {
        // Pink
        colors[i * 3] = 0.8 + Math.random() * 0.2; // R
        colors[i * 3 + 1] = 0.3 + Math.random() * 0.3; // G
        colors[i * 3 + 2] = 0.7 + Math.random() * 0.3; // B
      }
    }
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0005;
      pointsRef.current.rotation.x += 0.0002;
      
      // Gentle pulsing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      pointsRef.current.scale.setScalar(scale);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particles.colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.015} 
        vertexColors
        transparent 
        opacity={0.8}
        sizeAttenuation={true}
      />
    </points>
  );
}

// Constellation lines connecting bright categories
function ConstellationLines({ categories }: { categories: PuzzleCategory[] }) {
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const lines = useMemo(() => {
    if (!categories.length) return new Float32Array(0);
    
    // Connect top categories with constellation lines
    const topCategories = categories.slice(0, 20);
    const positions: number[] = [];
    
    topCategories.forEach((category, index) => {
      if (index < topCategories.length - 1) {
        const nextCategory = topCategories[index + 1];
        
        // Temporarily disable constellation lines to focus on sphere distribution
        // We'll re-enable once the sphere is working properly
      }
    });
    
    return new Float32Array(positions);
  }, [categories]);
  
  useFrame(() => {
    if (linesRef.current) {
      linesRef.current.rotation.y += 0.003;
    }
  });

  return lines.length > 0 ? (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[lines, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color="#6366f1" 
        transparent 
        opacity={0.2} 
      />
    </lineSegments>
  ) : null;
}

// Loading component
function LoadingGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial 
        color="#6366f1" 
        wireframe 
        transparent 
        opacity={0.5} 
      />
    </mesh>
  );
}

// Main ThemeGlobe component
interface ThemeGlobeProps {
  onCategorySelect?: (category: PuzzleCategory) => void;
}

const ThemeGlobe = ({ onCategorySelect }: ThemeGlobeProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<PuzzleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<PuzzleCategory | null>(null);
  const [favoriteCategory, setFavoriteCategory] = useState<string | null>(null);


  useEffect(() => {
    loadCategories();
    if (user) {
      loadUserFavorite();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getCategories({
        sortBy: 'wordCount',
        order: 'desc',
        limit: 300,
        activeOnly: true
      });
      setCategories(response.data);
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserFavorite = async () => {
    try {
      const response = await categoriesAPI.getUserFavoriteCategory();
      setFavoriteCategory(response.data.favoriteCategory?.id || null);
    } catch (err) {
      console.error('Error loading user favorite:', err);
    }
  };

  const handleCategorySelect = async (category: PuzzleCategory) => {
    if (user) {
      try {
        const response = await categoriesAPI.toggleFavoriteCategory(category.id);
        setFavoriteCategory(response.categoryId);
        
        // Update favorites count in local state instead of reloading all data
        setCategories(prevCategories => 
          prevCategories.map(cat => {
            if (cat.id === category.id) {
              const wasFavorite = favoriteCategory === category.id;
              return {
                ...cat,
                favoritesCount: wasFavorite ? cat.favoritesCount - 1 : cat.favoritesCount + 1
              };
            }
            // If there was a previous favorite, decrease its count
            if (cat.id === favoriteCategory && favoriteCategory !== category.id) {
              return {
                ...cat,
                favoritesCount: Math.max(0, cat.favoritesCount - 1)
              };
            }
            return cat;
          })
        );
      } catch (err) {
        console.error('Error toggling favorite:', err);
      }
    }
    
    if (onCategorySelect) {
      onCategorySelect(category);
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadCategories}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Info overlay */}
      <div className="absolute top-4 left-4 z-10 bg-black/20 backdrop-blur-sm rounded-lg p-4 text-white">
        <h3 className="text-lg font-semibold mb-2">🌌 Theme Globe</h3>
        <p className="text-sm text-gray-200 mb-1">
          {categories.length} categories • Top 300 by word count
        </p>
        <p className="text-xs text-gray-300 mb-2">
          Click to favorite • Hover for details
        </p>
        <div className="text-xs text-gray-300">
          <p className="mb-1">📏 Size Scale (logarithmic):</p>
          <div className="flex items-center gap-2">
            <span className="text-xs">Small</span>
            <div className="flex-1 h-1 bg-gradient-to-r from-purple-600 to-yellow-400 rounded"></div>
            <span className="text-sm">Large</span>
          </div>
        </div>
      </div>

      {/* Hovered category info */}
      {hoveredCategory && (
        <div className="absolute top-4 right-4 z-10 bg-black/30 backdrop-blur-sm rounded-lg p-4 text-white">
          <h4 className="text-lg font-semibold text-yellow-300">
            {hoveredCategory.name}
          </h4>
          <p className="text-sm text-gray-200">
            {hoveredCategory.wordCount.toLocaleString()} words
          </p>
          <p className="text-sm text-gray-200">
            ❤️ {hoveredCategory.favoritesCount} favorites
          </p>
          {hoveredCategory.description && (
            <p className="text-xs text-gray-300 mt-2 max-w-xs">
              {hoveredCategory.description}
            </p>
          )}
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas className="w-full h-full">
        <PerspectiveCamera makeDefault position={[0, 0, 35]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        
        {/* Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={false}
          maxDistance={60}
          minDistance={20}
        />
        
        {/* Background particles */}
        <ParticleField />
        
        {/* Main content */}
        <Suspense fallback={<LoadingGlobe />}>
          {loading ? (
            <LoadingGlobe />
          ) : (
            <>
              <ConstellationLines categories={categories} />
              <Globe
                categories={categories}
                onCategoryHover={setHoveredCategory}
                onCategorySelect={handleCategorySelect}
                hoveredCategory={hoveredCategory}
                favoriteCategory={favoriteCategory}
              />
            </>
          )}
        </Suspense>
      </Canvas>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading the cosmic theme universe...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeGlobe;