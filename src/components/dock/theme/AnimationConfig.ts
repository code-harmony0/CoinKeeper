// Animation configuration for glass dock
export const AnimationConfig = {
  // Spring physics
  spring: {
    default: { stiffness: 200, damping: 18 },
    snappy: { stiffness: 280, damping: 22 },
    bouncy: { stiffness: 150, damping: 12 },
    magnetic: { stiffness: 300, damping: 24 },
  },
  
  // Timing
  timing: {
    fast: 120,
    normal: 180,
    slow: 280,
    tooltip: 150,
    glow: 1200,
  },
  
  // Scale ranges
  scale: {
    pressed: 0.88,
    hover: 1.08,
    active: 1.2,
    inactive: 0.85,
    centerActive: 1.35,
    centerInactive: 1.1,
  },
  
  // Glow pulse
  glow: {
    min: 0.2,
    max: 0.5,
    duration: 1600,
  },
  
  // Magnetic distance threshold
  magnetic: {
    threshold: 80,
    maxScale: 1.15,
  },
};
