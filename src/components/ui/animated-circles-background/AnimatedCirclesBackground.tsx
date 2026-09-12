"use client";

import { motion } from "motion/react";
import styles from "./animated-bg.module.css";

type Density = "low" | "medium" | "high";

interface AnimatedCirclesBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  density?: Density;
  motion?: boolean;
}

type CircleConfig = {
  size: number;
  color: string;
  x: string;
  y: string;
  x2: string;
  y2: string;
  durX: number;
  durY: number;
};

const CIRCLES: CircleConfig[] = [
  { size: 80, color: "#c4b5fd", x: "10%", y: "15%", x2: "82%", y2: "78%", durX: 7, durY: 5 },
  { size: 130, color: "#84b179", x: "55%", y: "8%", x2: "22%", y2: "88%", durX: 11, durY: 9 },
  { size: 55, color: "#a78bfa", x: "82%", y: "72%", x2: "12%", y2: "28%", durX: 6, durY: 8 },
  { size: 110, color: "#a2c499", x: "28%", y: "85%", x2: "72%", y2: "18%", durX: 13, durY: 7 },
  { size: 95, color: "#8b5cf6", x: "68%", y: "38%", x2: "38%", y2: "68%", durX: 9, durY: 11 },
  { size: 70, color: "#779f6d", x: "18%", y: "52%", x2: "82%", y2: "12%", durX: 8, durY: 14 },
  { size: 150, color: "#7c3aed", x: "62%", y: "92%", x2: "12%", y2: "42%", durX: 15, durY: 6 },
  { size: 45, color: "#6a8e61", x: "88%", y: "22%", x2: "32%", y2: "78%", durX: 10, durY: 13 },
  { size: 105, color: "#6d28d9", x: "42%", y: "48%", x2: "62%", y2: "22%", durX: 5, durY: 10 },
  { size: 65, color: "#5b21b6", x: "5%", y: "60%", x2: "90%", y2: "40%", durX: 12, durY: 4 },
  { size: 120, color: "#5d7c55", x: "75%", y: "5%", x2: "20%", y2: "80%", durX: 4, durY: 12 },
  { size: 85, color: "#4c1d95", x: "50%", y: "95%", x2: "85%", y2: "50%", durX: 16, durY: 7 },
];

function AnimatedCirclesBackground({ className, children, density = "high", motion: useMotion = false }: AnimatedCirclesBackgroundProps) {
  if (useMotion) {
    const count = density === "low" ? 4 : density === "medium" ? 8 : 12;
    const circles = CIRCLES.slice(0, count);
    return (
      <div className={`${styles.motionRoot} ${className || ""}`}>
        <div className={styles.motionLayer} aria-hidden="true">
          {circles.map((c, i) => (
            <motion.div
              key={i}
              className={styles.motionCircle}
              style={{
                width: c.size * 2,
                height: c.size * 2,
                background: `radial-gradient(circle ${c.size}px at 50% 50%, ${c.color}cc, transparent 70%)`,
                left: c.x,
                top: c.y,
              }}
              animate={{
                left: [c.x, c.x2],
                top: [c.y, c.y2],
              }}
              transition={{
                left: { duration: c.durX, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                top: { duration: c.durY, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
              }}
            />
          ))}
        </div>
        <div className={styles.motionOverlay} aria-hidden="true" />
        <div className={styles.motionContent}>{children}</div>
      </div>
    );
  }

  const densityClass =
    density === "low"
      ? styles.animated_circles_bg_low
      : density === "medium"
        ? styles.animated_circles_bg_meduim
        : styles.animated_circles_bg;
  return <div className={`${densityClass} ${className || ""}`}>{children}</div>;
}

export default AnimatedCirclesBackground;
