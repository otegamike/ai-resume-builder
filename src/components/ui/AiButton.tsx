import React from "react";
import { Loader2, Zap } from "lucide-react";
import { Button } from "./Button";
import styles from "./AiButton.module.css";

interface AiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  cost?: number;
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const AiButton: React.FC<AiButtonProps> = ({
  size = "md",
  variant = "secondary",
  fullWidth = false,
  cost,
  loading = false,
  loadingText = "Generating...",
  children,
  className = "",
  disabled,
  ...props
}) => {
  const zapSize = size === "sm" ? 12 : 16;

  return (
    <Button
      variant="ai"
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      className={`${variant === "primary" ? styles.primary : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={zapSize} className={styles.spinner} />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          {cost !== undefined && cost > 0 && (
            <><Zap size={zapSize} />{cost}</>
          )}
        </>
      )}
    </Button>
  );
};
