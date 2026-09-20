import { useState } from "react";
import type { CSSProperties } from "react";

const PARTICLES = ["🎉", "🎊", "✨", "⭐", "🥳"];

/** A one-shot confetti burst from the center of the screen — mount when you want it, it fades on its own. */
export function Celebration() {
  const [particles] = useState(() =>
    Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 80 + Math.random() * 70;
      return {
        id: i,
        emoji: PARTICLES[i % PARTICLES.length],
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - 20,
        rot: Math.random() * 360 - 180,
        delay: Math.random() * 150,
      };
    })
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-2xl animate-confetti"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
              animationDelay: `${p.delay}ms`,
            } as CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
