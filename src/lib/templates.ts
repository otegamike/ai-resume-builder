export type TemplateId = 'modern' | 'classic' | 'minimal' | 'creative';

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
}

export const templates: Template[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean and professional with a contemporary feel',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional resume layout, perfect for corporate roles',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant, focuses on content',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Stand out with unique design elements',
  },
];

export function getTemplateStyles(templateId: TemplateId): string {
  const baseStyles = "font-serif text-gray-900";
  
  switch (templateId) {
    case 'modern':
      return `${baseStyles} tracking-wide`;
    case 'classic':
      return `${baseStyles} font-times`;
    case 'minimal':
      return `${baseStyles} font-sans text-sm`;
    case 'creative':
      return `${baseStyles} font-mono`;
    default:
      return baseStyles;
  }
}