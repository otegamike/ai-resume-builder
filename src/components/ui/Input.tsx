import * as React from "react"
import styles from "./Input.module.css"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={`${styles.input} ${className || ""}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"