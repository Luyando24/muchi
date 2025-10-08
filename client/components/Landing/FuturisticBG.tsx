import React from "react";

export default function FuturisticBG() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Diagonal moving lines */}
        <g
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        >
          {[0, 120, 240, 360, 480, 600, 720, 840, 960, 1080].map((y, i) => (
            <line
              key={y}
              x1={-100}
              y1={y}
              x2={1300}
              y2={y - 120}
              style={{ stroke: "hsl(var(--primary) / 0.12)" }}
              className="animate-dash-slow"
              strokeDasharray="6 12"
              strokeDashoffset={i * 40}
            />
          ))}
        </g>
        {/* Soft orbiting circles */}
        <g opacity="0.5">
          <g className="animate-orbit-slow" transform="translate(300 300)">
            <circle
              r="90"
              style={{ stroke: "hsl(var(--primary) / 0.18)" }}
              strokeWidth="1"
              fill="none"
            />
            <circle
              r="60"
              style={{ stroke: "hsl(var(--accent) / 0.18)" }}
              strokeWidth="1"
              fill="none"
            />
            <circle
              r="3"
              cx="60"
              cy="0"
              style={{ fill: "hsl(var(--primary) / 0.5)" }}
            />
          </g>
          <g
            className="animate-orbit-slow"
            style={{ animationDelay: "-8s" }}
            transform="translate(900 500)"
          >
            <circle
              r="70"
              style={{ stroke: "hsl(var(--primary) / 0.14)" }}
              strokeWidth="1"
              fill="none"
            />
            <circle
              r="45"
              style={{ stroke: "hsl(var(--accent) / 0.14)" }}
              strokeWidth="1"
              fill="none"
            />
            <circle
              r="2.5"
              cx="45"
              cy="0"
              style={{ fill: "hsl(var(--accent) / 0.5)" }}
            />
          </g>
        </g>
        {/* Corner glow accents */}
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="160" fill="url(#glow)" />
        <circle cx="1140" cy="740" r="180" fill="url(#glow)" />
      </svg>
    </div>
  );
}
