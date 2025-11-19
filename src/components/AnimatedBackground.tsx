import { useEffect, useState } from "react";
import { Circle, Square, Triangle, Sparkles, Heart, Star } from "lucide-react";

interface Shape {
  id: number;
  Icon: typeof Circle | typeof Square | typeof Triangle | typeof Sparkles | typeof Heart | typeof Star;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
}

export const AnimatedBackground = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);

  useEffect(() => {
    // Ícones relacionados a nail design: estrelas, corações, sparkles, formas geométricas
    const icons = [Sparkles, Heart, Star, Circle, Square, Triangle];
    const newShapes: Shape[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      Icon: icons[Math.floor(Math.random() * icons.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 30,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
      rotation: Math.random() * 360,
    }));
    setShapes(newShapes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.15] z-0">
      {shapes.map((shape) => {
        const Icon = shape.Icon;
        return (
          <div
            key={shape.id}
            className="absolute animate-float"
            style={{
              left: `${shape.x}%`,
              top: `${shape.y}%`,
              animationDuration: `${shape.duration}s`,
              animationDelay: `${shape.delay}s`,
              transform: `rotate(${shape.rotation}deg)`,
            }}
          >
            <Icon
              className="text-primary"
              size={shape.size}
              strokeWidth={1.5}
            />
          </div>
        );
      })}
    </div>
  );
};
