"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImagePlus, X, Sparkles } from "lucide-react";
import TipTapEditor from "@/components/blog/TipTapEditor";
import { AiButton } from "@/components/ui/AiButton";
import { useAiCreditStore } from "@/store/useAiCreditStore";
import { useAlertStore } from "@/store/useAlertStore";
import { CREDIT_COST } from "@/lib/creditCosts";
import styles from "./PostForm.module.css";

interface PostFormProps {
  mode: "create" | "edit";
  initialValues?: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    coverImageUrl?: string;
    tags?: string[];
    published?: boolean;
  };
  editSlug?: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function PostForm({
  mode,
  initialValues,
  editSlug,
}: PostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!initialValues?.slug);
  const [excerpt, setExcerpt] = useState(initialValues?.excerpt ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialValues?.coverImageUrl ?? "");
  const [coverImagePublicId, setCoverImagePublicId] = useState("");
  const [tagsInput, setTagsInput] = useState((initialValues?.tags ?? []).join(", "));
  const [published, setPublished] = useState(initialValues?.published ?? false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "agentic-cv/blog");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      setCoverImageUrl(data.secure_url);
      setCoverImagePublicId(data.public_id ?? "");
      } catch {
        setError("Failed to upload cover image. Please try again.");
      } finally {
        setUploadingCover(false);
      }
  };

  const handleAutoGenerate = async () => {
    const plainText = content
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!plainText) {
      setError("Write some content first, then auto-generate the title, excerpt, and tags.");
      return;
    }

    setAiGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "generateBlogMeta",
          data: { content: plainText },
        }),
      });

      const json = await res.json();

      if (res.status === 402) {
        useAlertStore.getState().addAlert("error", json.error);
        return;
      }

      if (!res.ok) {
        throw new Error(json.error ?? "AI generation failed");
      }

      if (typeof json.newAiCredits === "number") {
        useAiCreditStore.getState().setCredits(json.newAiCredits);
      }

      const { title: generatedTitle, excerpt: generatedExcerpt, tags } = json.result ?? {};

      if (generatedTitle) {
        setTitle(generatedTitle);
        if (!slugEdited) {
          setSlug(slugify(generatedTitle));
        }
      }
      if (generatedExcerpt) {
        setExcerpt(generatedExcerpt);
      }
      if (Array.isArray(tags) && tags.length > 0) {
        setTagsInput(tags.join(", "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      content,
      coverImageUrl,
      coverImagePublicId,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      published,
    };

    try {
      const url =
        mode === "create"
          ? "/api/blog/posts"
          : `/api/blog/posts/${editSlug}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save post");
      }

      router.push("/blog/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save post.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="title">
          Title *
        </label>
        <input
          id="title"
          className={styles.input}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. How to Beat ATS Screening in 2026"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="slug">
          Slug *
        </label>
        <input
          id="slug"
          className={styles.input}
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugEdited(true);
          }}
          placeholder="how-to-beat-ats-screening"
        />
        <span className={styles.fieldHint}>Auto-generated from title. Editable.</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="excerpt">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          className={styles.textarea}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="A short summary shown on the blog index and in search results."
          rows={3}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Cover Image</label>
        {coverImageUrl ? (
          <div className={styles.coverPreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImageUrl} alt="Cover preview" className={styles.coverPreviewImg} />
            <button
              type="button"
              className={styles.coverRemove}
              onClick={() => {
                setCoverImageUrl("");
                setCoverImagePublicId("");
              }}
              title="Remove cover image"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label className={styles.coverUpload}>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCoverUpload(file);
                e.target.value = "";
              }}
            />
            {uploadingCover ? (
              <>
                <Loader2 size={20} className={styles.spinner} />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <ImagePlus size={20} />
                <span>Upload cover image</span>
              </>
            )}
          </label>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Content</label>
        <TipTapEditor
          content={content}
          onChange={setContent}
          placeholder="Write your post content here..."
        />
        <div className={styles.generateRow}>
          <AiButton
            type="button"
            onClick={handleAutoGenerate}
            loading={aiGenerating}
            loadingText="Generating..."
            cost={CREDIT_COST.generateBlogMeta}
          >
            <Sparkles size={16} />
            Auto-generate title, excerpt & tags
          </AiButton>
          <span className={styles.fieldHint}>
            Generates an SEO-friendly title, excerpt, and tags from your content.
          </span>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="tags">
          Tags
        </label>
        <input
          id="tags"
          className={styles.input}
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="resume, ATS, cover letters"
        />
        <span className={styles.fieldHint}>Comma-separated.</span>
      </div>

      <div className={styles.publishRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span>Published</span>
        </label>
        <span className={styles.fieldHint}>
          Unpublished posts are saved as drafts and hidden from the public blog.
        </span>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={() => router.push("/blog/admin")}
        >
          Cancel
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={18} className={styles.spinner} />
              Saving...
            </>
          ) : mode === "create" ? (
            "Create Post"
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
}
