import React from "react";
import styles from "./Button.module.css";
import { motion } from "motion/react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "light_outline" | "ai";
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
  fullWidth?: boolean;
  layoutId?: string;
}

export const MotionButton: React.FC<ButtonProps> = ({
  className = "",
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  layoutId,
  style
}) => {
  const variantClass = styles[variant] || styles.primary;
  const sizeClass = styles[size] || styles.md;

  return (
    <motion.button
      className={`${styles.button} ${variantClass} ${sizeClass} ${fullWidth ? styles.fullWidth : ""} ${className}`}
      style={style ? style : {}}
      layoutId={layoutId}
    >
      {variant === "ai" ? <div className={styles.aiButtonContent}>{children}</div> : children}
    </motion.button>
  );
};