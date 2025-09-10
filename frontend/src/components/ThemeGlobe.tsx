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
  const outlineRef = useRef<THREE.Mesh>(null);
  const backgroundRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (textRef.current) {
      // Gentle floating animation
      const floatOffset = Math.sin(state.clock.elapsedTime + position[0]) * 0.02;
      textRef.current.position.y = position[1] + floatOffset;
      
      // Face the camera
      textRef.current.lookAt(state.camera.position);
      
      // Hover scaling effect
      const targetScale = isHovered ? scale * 1.4 : scale;
      textRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
    
    // Sync outline and background with main text
    if (outlineRef.current && textRef.current) {
      outlineRef.current.position.copy(textRef.current.position);
      outlineRef.current.rotation.copy(textRef.current.rotation);
      outlineRef.current.scale.copy(textRef.current.scale);
    }
    
    if (backgroundRef.current && textRef.current) {
      backgroundRef.current.position.copy(textRef.current.position);
      backgroundRef.current.rotation.copy(textRef.current.rotation);
      backgroundRef.current.scale.copy(textRef.current.scale);
      backgroundRef.current.position.z -= 0.001; // Slightly behind text
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
      {/* Background/border effect - only show when hovered */}
      {isHovered && (
        <Text
          ref={backgroundRef}
          position={position}
          fontSize={0.82}
          color={outlineColor}
          anchorX="center"
          anchorY="middle"
          font={undefined}
          fillOpacity={0.3}
        >
          {category.name}
        </Text>
      )}
      
      {/* Outline text for border effect */}
      <Text
        ref={outlineRef}
        position={position}
        fontSize={0.81}
        color={outlineColor}
        anchorX="center"
        anchorY="middle"
        font={undefined}
        fillOpacity={isHovered ? 0.8 : 0.4}
      >
        {category.name}
      </Text>
      
      {/* Main text */}
      <Text
        ref={textRef}
        position={position}
        fontSize={0.8}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        font={undefined}
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

  // Calculate logarithmic sizes and positions
  const categoryPositions = useMemo(() => {
    if (!categories.length) return [];
    
    const maxWords = Math.max(...categories.map(c => c.wordCount));
    const minWords = Math.min(...categories.map(c => c.wordCount));
    const logMax = Math.log10(maxWords);
    const logMin = Math.log10(minWords);
    
    return categories.map((category, index) => {
      // Improved logarithmic scaling for text size (base 10 for better distribution)
      const logWords = Math.log10(category.wordCount);
      const normalizedSize = (logWords - logMin) / (logMax - logMin);
      // Enhanced scaling with more dramatic size differences
      const scale = 0.3 + Math.pow(normalizedSize, 0.7) * 2.2; // Size range: 0.3 to 2.5 with power curve
      
      // Simple random sphere distribution using category ID as seed
      // This completely avoids any sequential patterns that cause spirals
      
      // Create a simple hash from category ID for consistent positioning
      let hash = 0;
      for (let i = 0; i < category.id.length; i++) {
        const char = category.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Use hash to generate two independent random values
      const random1 = Math.abs(Math.sin(hash * 0.1234567)) % 1;
      const random2 = Math.abs(Math.sin(hash * 0.9876543)) % 1;
      
      // Standard method for uniform distribution on sphere
      const u = random1; // Random value 0-1
      const v = random2; // Random value 0-1
      
      const theta = 2 * Math.PI * u; // Azimuthal angle
      const phi = Math.acos(2 * v - 1); // Polar angle (ensures uniform distribution)
      
      // Vary radius based on category importance (larger categories closer to surface)
      const baseRadius = 15.0; // Significantly increased for much larger sphere
      const radiusVariation = normalizedSize * 0.3; // Minimal variation for very uniform sphere
      const radius = baseRadius + radiusVariation;
      
      // Convert spherical coordinates to Cartesian coordinates
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const yPos = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      return {
        category,
        position: [x, yPos, z] as [number, number, number],
        scale
      };
    });
  }, [categories]);

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
      {categoryPositions.map(({ category, position, scale }, index) => (
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
      ))}
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
        
        // Reload categories to get accurate favorites counts from server
        await loadCategories();
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