"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import styles from "./Modal.module.css";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  dismissible?: boolean;
  children: React.ReactNode;
}

const sizeClass: Record<ModalSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

export default function Modal({
  open,
  onClose,
  title,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  dismissible = true,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, dismissible]);

  if (typeof document === "undefined") return null;

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 8 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
  };

  const canCloseOnOverlay = dismissible && closeOnOverlayClick;
  const canShowCloseButton = dismissible && showCloseButton;
  const showHeader = Boolean(title || canShowCloseButton);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          onClick={canCloseOnOverlay ? onClose : undefined}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.div
            className={`${styles.card} ${sizeClass[size]}`}
            onClick={(e) => e.stopPropagation()}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", stiffness: 340, damping: 28, mass: 0.8 }}
          >
            {showHeader && (
              <div className={styles.header}>
                {title ? <h2 className={styles.title}>{title}</h2> : <span />}
                {canShowCloseButton && (
                  <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
                    &times;
                  </button>
                )}
              </div>
            )}
            <div className={styles.body}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
