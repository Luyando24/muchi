import React from "react";

export default function StarGalaxyBG() {
  // Generate random stars with different sizes, positions, and animation delays
  const stars = Array.from({ length: 200 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1, // 1-5px
    x: Math.random() * 100, // 0-100%
    y: Math.random() * 100, // 0-100%
    delay: Math.random() * 5, // 0-5s delay
    duration: Math.random() * 3 + 2, // 2-5s duration
    opacity: Math.random() * 0.7 + 0.3, // 0.3-1.0 opacity
  }));
  
  // Generate a few larger stars/planets
  const planets = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 6, // 6-12px
    x: Math.random() * 100, // 0-100%
    y: Math.random() * 100, // 0-100%
    delay: Math.random() * 5, // 0-5s delay
    duration: Math.random() * 4 + 4, // 4-8s duration
    opacity: 0.9,
  }));

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Dark space background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/90 to-slate-950/95 z-0" />
      
      {/* Stars layer on top of background */}
      <div className="absolute inset-0 z-10">
        {/* Stars */}
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                left: `${star.x}%`,
                top: `${star.y}%`,
                opacity: star.opacity,
                backgroundColor: getStarColor(star.id),
                boxShadow: `0 0 ${star.size * 2}px ${getStarColor(star.id)}`,
                animation: `twinkle ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
              }}
          />
        ))}
        
        {/* Planets/larger stars */}
        {planets.map((planet) => (
          <div
            key={`planet-${planet.id}`}
            className="absolute rounded-full"
            style={{
                width: `${planet.size}px`,
                height: `${planet.size}px`,
                left: `${planet.x}%`,
                top: `${planet.y}%`,
                opacity: planet.opacity,
                backgroundColor: getPlanetColor(planet.id),
                boxShadow: `0 0 ${planet.size * 3}px ${getPlanetColor(planet.id)}`,
                animation: `twinkle ${planet.duration}s ease-in-out infinite`,
                animationDelay: `${planet.delay}s`,
              }}
          />
        ))}
      </div>

      {/* Nebula effects - enhanced with more vibrant colors */}
      <div className="absolute inset-0 z-5">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-purple-500/15 blur-3xl" style={{ animation: 'float-slow 10s ease-in-out infinite' }} />
        <div className="absolute bottom-0 right-0 w-3/4 h-1/2 rounded-full bg-blue-500/15 blur-3xl" style={{ animation: 'float-slow 10s ease-in-out infinite', animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/4 w-1/3 h-1/3 rounded-full bg-pink-500/15 blur-3xl" style={{ animation: 'float-slow 10s ease-in-out infinite', animationDelay: '4s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-1/4 h-1/4 rounded-full bg-indigo-500/15 blur-3xl" style={{ animation: 'float-slow 10s ease-in-out infinite', animationDelay: '3s' }} />
      </div>
      
      {/* Overlay gradient to blend with the rest of the page */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-20" />
    </div>
  );
}

// Helper function to get a random star color from a galaxy palette
function getStarColor(id: number): string {
  const colors = [
    '#ffffff', // White
    '#fffacd', // Cream/Yellow
    '#add8e6', // Light Blue
    '#ffb6c1', // Pink
    '#e6e6fa', // Lavender
    '#87cefa', // Sky Blue
  ];
  
  return colors[id % colors.length];
}

// Helper function to get a planet color
function getPlanetColor(id: number): string {
  const colors = [
    '#ff9d00', // Orange
    '#ff5e62', // Red-Orange
    '#8a2be2', // Blue Violet
    '#00bfff', // Deep Sky Blue
    '#7fffd4', // Aquamarine
  ];
  
  return colors[id % colors.length];
}