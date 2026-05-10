import React from "react";
import styles from "./Button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "light_outline" | "ai";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  className = "",
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  ...props
}) => {
  const variantClass = styles[variant] || styles.primary;
  const sizeClass = styles[size] || styles.md;

  return (
    <button
      className={`${styles.button} ${variantClass} ${sizeClass} ${fullWidth ? styles.fullWidth : ""} ${className}`}
      {...props}
    >
      {variant === "ai" ? <div className={styles.aiButtonContent}>{children}</div> : children}
    </button>
  );
};