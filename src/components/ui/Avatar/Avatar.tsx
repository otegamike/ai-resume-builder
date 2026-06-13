import React from "react";
import styles from "./Avatar.module.css";
import { motion } from "framer-motion";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).slice(-2);
  }
  return color;
}

function getContrastYIQ(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "",
  size = 32,
  className = "",
}) => {
  const letter = alt.charAt(0).toUpperCase();
  const backgroundColor = alt ? stringToColor(alt) : "#ccc";
  const textColor = alt ? getContrastYIQ(backgroundColor) : "#fff";

  if (src) {
    return (
      <div
        className={`${styles.avatar} ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt={alt}
          className={styles.image}
        />
      </div>
    );
  }

  return (
    <motion.div
      className={`${styles.avatar} ${styles.letter} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor,
        color: textColor,
        fontSize: size * 0.5,
      }}
      title={alt}
      layoutId='avatar'
    >
      <span style={{ color: textColor }}>{letter}</span>
    </motion.div>
  );
};
