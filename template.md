# Template System Documentation

## Overview

The AI Resume Builder uses a custom templating system to render dynamic resume previews. Templates are static HTML files loaded from disk, populated with user data using a custom Mustache-like syntax, and rendered in an iframe with responsive scaling.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TEMPLATE FILES                            │
│              src/templates_formatted/template1-7.html           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼读取 (templateServer.ts)
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER                                 │
│  GET /api/templates        → getAllTemplateDefinitions()       │
│  GET /api/templates/:id    → getTemplateDefinition(id)         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼返回 TemplateDefinition (包含 html)
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND USAGE                               │
│  buildTemplateSrcDoc(templateHtml, resumeData)                │
│  ↓                                                              │
│  renderTemplate() → 替换 {{mustache}} 语法                     │
│  ↓                                                              │
│  iframe srcDoc → 显示缩放的 CV                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Template Files

### Location
`src/templates_formatted/`

### Available Templates
| ID | Name | Description |
|----|------|-------------|
| template1 | Emerald | Elegant two-column profile with modern accents |
| template2 | Copper | Warm editorial style for business-facing roles |
| template3 | Sandstone | Balanced professional layout with clean typography |
| template4 | Monochrome | High-contrast minimal style with bold headings |
| template5 | Aurora | Creative geometric style for portfolio-driven roles |
| template6 | Rose | Soft modern design with refined spacing |
| template7 | Slate | Structured corporate style optimized for scanning |

### File Structure
Each template HTML file contains:
1. `<!DOCTYPE html>` + `<head>` with meta, fonts, and embedded CSS
2. `<body>` with the CV markup using template syntax
3. Embedded `<script>` for scaling logic

## Data Structures

Defined in `src/lib/templateCatalog.ts`:

```typescript
type TemplateId = "template1" | "template2" | "template3" | "template4" | "template5" | "template6" | "template7";

interface TemplateData {
  personalInfo: {
    name: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    photo?: string;
  };
  summary: string;
  experience: Array<{
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education: Array<{
    id: string;
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
  }>;
  skills: string[];
}

interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  html: string;
  page: {
    widthPx: number;    // 794 (A4 width in pixels at 96dpi)
    heightPx: number;  // 1123 (A4 height in pixels at 96dpi)
    aspectRatio: number;
  };
}
```

## Server-Side Loading

Located in `src/lib/templateServer.ts`:

```typescript
// 读取指定 ID 的模板 HTML 内容
async function readTemplateHtml(id: TemplateId): Promise<string>

// 获取模板定义（包含 metadata + HTML）
async function getTemplateDefinition(id: TemplateId): TemplateDefinition

// 获取所有模板定义
async function getAllTemplateDefinitions(): TemplateDefinition[]

// 验证是否为有效的模板 ID
function isTemplateId(value: string): value is TemplateId
```

### API Routes
- `GET /api/templates` - Returns all 7 templates with full HTML
- `GET /api/templates/:id` - Returns single template by ID

## Rendering Engine

Located in `src/lib/templateRenderer.ts`:

```typescript
// 主渲染函数：将数据填充到模板 HTML 中
function renderTemplate(templateHtml: string, data: TemplateData): string

// 前端使用的别名，返回可直接放入 iframe srcDoc 的 HTML
function buildTemplateSrcDoc(templateHtml: string, data: TemplateData): string

// 获取预览用的示例数据
function getTemplatePreviewData(): TemplateData

// 将旧版模板 ID 转换为新版格式
function normalizeTemplateId(templateId: string): TemplateId
```

## Template Syntax

The renderer uses a custom Mustache-like syntax:

### 1. Variable Substitution
```html
{{personalInfo.name}}
{{summary}}
{{experience.0.company}}
```

### 2. Array Iteration (Sections)
```html
{{#experience}}
  <div class="job">
    <h3>{{company}}</h3>
    <p>{{role}}</p>
  </div>
{{/experience}}
```

### 3. Conditionals
```html
{{?personalInfo.photo}}
  <img src="{{personalInfo.photo}}" alt="Photo" />
{{/personalInfo.photo}}
```

### 4. Dot Notation (Current Context)
```html
{{#experience}}
  {{company}}     <!-- 当前 item 的 company -->
  {{.}}           <!-- 整个 current object -->
{{/experience}}
```

## Template Scaling System

Each template contains embedded JavaScript that scales the CV to fit the iframe viewport.

### Three-Layer DOM Structure

```html
<div class="cv-viewport">       <!-- fills iframe, centers content -->
  <div class="cv-scaler">       <!-- scaled via CSS transform -->
    <div class="cv">            <!-- fixed dimensions (760x1076 or 780x1076) -->
      <!-- CV CONTENT -->
    </div>
  </div>
</div>
```

### Scaling Algorithm

```javascript
const CV_WIDTH  = 760;   // or 780 depending on template
const CV_HEIGHT = 1076;

function scaleCv() {
  const available = document.documentElement.clientWidth;
  const scale = available / CV_WIDTH;

  scaler.style.transform = `scale(${scale})`;

  const scaledHeight = CV_HEIGHT * scale;
  scaler.style.marginBottom = (scaledHeight - CV_HEIGHT) + 'px';
}
```

### How It Works

1. **Viewport Detection**: Uses `document.documentElement.clientWidth` to get available width
2. **Scale Calculation**: `scale = availableWidth / CV_WIDTH`
3. **CSS Transform**: Applies `transform: scale(n)` to scale the CV visually
4. **Height Compensation**: Adjusts `marginBottom` to maintain proper document flow since CSS transforms don't affect layout

### Event Handling

```javascript
// Debounced resize listener (60ms delay)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(scaleCv, 60);
});

// Initial scale after fonts load
document.fonts.ready.then(scaleCv);
```

### Template Dimensions by ID

| Template | CV_WIDTH | CV_HEIGHT |
|----------|---------|-----------|
| template1 | 760 | 1076 |
| template2 | 780 | 1076 |
| template3 | 780 | 1076 |
| template4 | 780 | 1076 |
| template5 | 780 | 1076 |
| template6 | 760 | 1076 |
| template7 | 780 | 1076 |

## Frontend Integration

### Editor Page (`src/app/editor/[id]/page.tsx`)

```typescript
const selectedTemplate = useMemo(
  () => templateDefinitions.find((entry) => entry.id === template),
  [templateDefinitions, template]
);

const renderedTemplate = useMemo(() => {
  if (!selectedTemplate?.html) return "";
  return buildTemplateSrcDoc(selectedTemplate.html, resume);
}, [resume, selectedTemplate]);

// Rendered into iframe
<iframe srcDoc={renderedTemplate} />
```

### Templates Gallery (`src/app/templates/page.tsx`)

```typescript
const previewData = useMemo(() => getTemplatePreviewData(), []);

<iframe
  srcDoc={buildTemplateSrcDoc(template.html, previewData)}
/>
```

## PDF Export

The editor uses `html2pdf.js` to export rendered resumes:

```typescript
import html2pdf from 'html2pdf.js';

const element = iframeDocument.querySelector(".page") as HTMLElement;

html2pdf().set({
  margin: 0,
  filename: 'resume.pdf',
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: 'px', format: 'a4', orientation: 'portrait' }
}).from(element).save();
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/templateCatalog.ts` | Type definitions and template metadata |
| `src/lib/templateServer.ts` | File loading and template retrieval |
| `src/lib/templateRenderer.ts` | Template syntax parsing and rendering |
| `src/templates_formatted/*.html` | Static template HTML files |
| `src/app/api/templates/route.ts` | GET /api/templates endpoint |
| `src/app/api/templates/[id]/route.ts` | GET /api/templates/:id endpoint |
| `src/app/editor/[id]/page.tsx` | Resume editor with live preview |
| `src/app/templates/page.tsx` | Template gallery page |

## Common Patterns

### Adding a New Template

1. Create HTML file in `src/templates_formatted/templateN.html`
2. Add entry to `templateDefinitions` array in `src/lib/templateCatalog.ts`
3. Template automatically available via API and in editor

### Modifying Template Syntax

Edit regex patterns in `src/lib/templateRenderer.ts`:

```typescript
const SECTION_PATTERN = /\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const CONDITIONAL_PATTERN = /\{\{\?([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const TOKEN_PATTERN = /\{\{([\w.]+|\.)\}\}/g;
```

### Debugging Rendered Output

```typescript
import { renderTemplate } from '@/lib/templateRenderer';

console.log(renderTemplate(templateHtml, resumeData));
// Output: fully rendered HTML with substituted values
```