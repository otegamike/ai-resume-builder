import type { TemplateData, TemplateId } from "@/lib/templateCatalog";

type RenderContext = Record<string, unknown> | string | number | boolean | null | undefined;

const SECTION_PATTERN = /\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const CONDITIONAL_PATTERN = /\{\{\?([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const TOKEN_PATTERN = /\{\{([\w.]+|\.)\}\}/g;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolvePath(path: string, context: RenderContext, root: Record<string, unknown>): unknown {
  if (path === ".") return context;

  const fromObject = (source: unknown): unknown => {
    if (!source || typeof source !== "object") return undefined;
    return path.split(".").reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[key];
    }, source);
  };

  const fromContext = fromObject(context);
  if (fromContext !== undefined) return fromContext;
  return fromObject(root);
}

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function renderInternal(template: string, context: RenderContext, root: Record<string, unknown>): string {
  const withSections = template.replace(SECTION_PATTERN, (_, path: string, block: string) => {
    const value = resolvePath(path, context, root);
    if (!Array.isArray(value) || value.length === 0) return "";
    return value.map((item) => renderInternal(block, item as RenderContext, root)).join("");
  });

  const withConditionals = withSections.replace(CONDITIONAL_PATTERN, (_, path: string, block: string) => {
    const value = resolvePath(path, context, root);
    return isTruthy(value) ? renderInternal(block, context, root) : "";
  });

  return withConditionals.replace(TOKEN_PATTERN, (_, path: string) => {
    const value = resolvePath(path, context, root);
    return escapeHtml(value ?? "");
  });
}

export function renderTemplate(templateHtml: string, data: TemplateData): string {
  return renderInternal(templateHtml, data as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>);
}

function injectPaginationSupport(html: string): string {
  const pageStyle = `
<style id="multi-page-resume-style">
  html, body { overflow: auto !important; }
  .cv-scaler { display: flex; flex-direction: column; gap: 24px; }
  .cv { flex-shrink: 0; }
</style>`;

  const paginationScript = `
<script>
  (function () {
    const BLOCK_SELECTOR = [
      '[data-page-block]',
      '.exp-entry',
      '.experience-entry',
      '.experience-item',
      '.edu-entry',
      '.education-entry',
      '.education-item',
      '.project-entry',
      '.achievement-item',
      '.bullet-list li',
      '.skill-item'
    ].join(',');

    function markBlocks(cv) {
      const blocks = Array.from(cv.querySelectorAll(BLOCK_SELECTOR));
      blocks.forEach((block, index) => {
        if (!block.dataset.pgid) {
          block.dataset.pgid = String(index + 1);
        }
      });
      return blocks;
    }

    function splitOverflow(cv) {
      const pageHeight = cv.clientHeight;
      if (cv.scrollHeight <= pageHeight + 1) return null;

      const blocks = markBlocks(cv);
      if (!blocks.length) return null;

      let splitIndex = -1;
      for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i];
        const blockBottom = block.offsetTop + block.offsetHeight;
        if (blockBottom > pageHeight) {
          splitIndex = i;
        }
      }

      if (splitIndex < 0) return null;

      const nextPage = cv.cloneNode(true);
      const currentBlocks = Array.from(cv.querySelectorAll('[data-pgid]'));
      const nextBlocks = Array.from(nextPage.querySelectorAll('[data-pgid]'));

      for (let i = 0; i < splitIndex; i++) {
        if (nextBlocks[i]) nextBlocks[i].remove();
      }

      for (let i = splitIndex; i < currentBlocks.length; i++) {
        if (currentBlocks[i]) currentBlocks[i].remove();
      }

      return nextPage;
    }

    function paginateResume() {
      const scaler = document.querySelector('.cv-scaler');
      if (!scaler) return;

      let index = 0;
      const maxPages = 10;

      while (index < scaler.children.length && scaler.children.length < maxPages) {
        const page = scaler.children[index];
        if (!(page instanceof HTMLElement) || !page.classList.contains('cv')) {
          index++;
          continue;
        }

        const overflowPage = splitOverflow(page);
        if (overflowPage) {
          scaler.insertBefore(overflowPage, page.nextSibling);
        } else {
          index++;
        }
      }
    }

    const run = () => paginateResume();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run);
    } else {
      window.addEventListener('load', run);
    }
  })();
</script>`;

  const withStyle = html.includes("</head>") ? html.replace("</head>", `${pageStyle}\n</head>`) : `${pageStyle}\n${html}`;
  return withStyle.includes("</body>") ? withStyle.replace("</body>", `${paginationScript}\n</body>`) : `${withStyle}\n${paginationScript}`;
}

export function buildTemplateSrcDoc(templateHtml: string, data: TemplateData): string {
  return injectPaginationSupport(renderTemplate(templateHtml, data));
}

export function getTemplatePreviewData(): TemplateData {
  return {
    personalInfo: {
      name: "Avery Johnson",
      jobTitle: "Senior Product Designer",
      email: "avery@example.com",
      phone: "+1 (555) 180-4091",
      location: "Austin, TX",
      website: "avery.design",
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop",
    },
    summary:
      "Results-oriented designer with 7+ years of experience leading product strategy, design systems, and end-to-end UX for B2B SaaS products.",
    experience: [
      {
        id: "1",
        company: "Nimbus Labs",
        role: "Lead Product Designer",
        startDate: "2022",
        endDate: "Present",
        description:[
          "Led redesign of onboarding and activation flows, improving trial-to-paid conversion by 24% while reducing support tickets by 31%.",
          "Established and scaled a centralized design system, reducing design-to-engineering handoff time by 40% and ensuring visual consistency across web and mobile platforms.",
          "Mentored a team of 4 junior designers and spearheaded weekly design critiques, fostering a culture of feedback that increased overall sprint velocity by 15%."
        ]
      },
      {
        id: "2",
        company: "Orbit Commerce",
        role: "Product Designer",
        startDate: "2019",
        endDate: "2022",
        description:[
          "Shipped scalable checkout and account experiences across web and mobile, reducing cart abandonment and increasing retention.",
          "Collaborated with cross-functional teams to define product strategy, roadmap, and design execution for key growth initiatives.",
          "Conducted 20+ user interviews and usability tests to identify pain points and inform design decisions."
        ]
      },
    ],
    education: [
      {
        id: "1",
        school: "University of Washington",
        degree: "B.Sc. Human Centered Design",
        startDate: "2013",
        endDate: "2017",
      },
    ],
    skills: ["Figma", "Design Systems", "User Research", "Prototyping", "Product Strategy", "Accessibility"],
  };
}

export function normalizeTemplateId(templateId: string): TemplateId {
  const legacyMap: Record<string, TemplateId> = {
    modern: "template1",
    classic: "template2",
    minimal: "template3",
    creative: "template4",
  };

  if (templateId in legacyMap) return legacyMap[templateId];
  if (templateId.startsWith("template")) {
    const casted = templateId as TemplateId;
    return casted;
  }

  return "template1";
}
