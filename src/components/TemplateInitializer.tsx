"use client";

import { useEffect } from 'react';
import { useTemplateStore } from '@/store/useTemplateStore';

export default function TemplateInitializer() {
  const fetchTemplates = useTemplateStore((state) => state.fetchTemplates);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return null;
}
