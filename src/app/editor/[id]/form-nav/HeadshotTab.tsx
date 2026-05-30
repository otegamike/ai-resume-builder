import React, { useState } from "react";
import { Loader2, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "../page.module.css";
import formNavStyles from './formNav.module.css';

interface HeadshotTabProps {
  photo?: string;
  onChange: (photoUrl: string) => void;
}

export default function HeadshotTab({ photo, onChange }: HeadshotTabProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image.");
      }

      const data = await response.json();
      if (data.secure_url) {
        onChange(data.secure_url);
      } else {
        throw new Error("Invalid response from server.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.formSection}>
      <div className={styles.formTitleHeader}>
        <h2 className={styles.formSectionTitle}>Headshot</h2>
        <p className={`${formNavStyles.headshot_description} ${styles.formSectionDescription}`}>Add a professional headshot to your resume to help you stand out from the rest.</p>
      </div>
      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', border: '2px dashed #e5e7eb', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
            {photo ? (
              <div style={{ position: 'relative', width: '128px', height: '128px', borderRadius: '9999px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
                <img src={photo} alt="Headshot" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                     onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                     onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <Button
                    variant="light_outline"
                    onClick={(e) => { e.preventDefault(); onChange(""); }}
                    title="Remove photo"
                    style={{ borderRadius: '9999px', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={18} color="white" />
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ width: '128px', height: '128px', borderRadius: '9999px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <ImageIcon size={48} color='var(--ai-accent-300)' />
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              {uploading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
                  <Loader2 className={styles.loadingIcon} size={20} />
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <label htmlFor="photo-upload" style={{ cursor: 'pointer' }}>
                    <div className={styles.uploadButton}>
                      <Upload size={16} color="var(--neutral-100)" />
                      {photo ? "Change Photo" : "Upload Photo"}
                    </div>
                    
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </>
              )}
            </div>
            
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
