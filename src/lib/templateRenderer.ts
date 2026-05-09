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

    function cleanupEmptySections(page) {
      const labels = Array.from(page.querySelectorAll('.section-label, .section-title'));
      labels.forEach(label => {
        const parent = label.parentElement;
        if (!parent) return;
        
        const clone = parent.cloneNode(true);
        const cloneLabel = clone.querySelector('.section-label, .section-title');
        if (cloneLabel) cloneLabel.remove();
        
        if (clone.textContent.trim() === '' && clone.querySelectorAll('img').length === 0) {
          parent.remove();
        }
      });
    }

    function paginateResume() {
      const scaler = document.querySelector('.cv-scaler');
      if (!scaler) return;
      
      const sourceCv = scaler.querySelector('.cv');
      if (!sourceCv) return;

      const pageHeight = sourceCv.clientHeight; // unscaled A4 height
      
      // If content fits completely, don't paginate
      if (sourceCv.scrollHeight <= pageHeight + 1) return;

      const cvRect = sourceCv.getBoundingClientRect();
      const scale = cvRect.height / sourceCv.offsetHeight;

      const leftColSelector = sourceCv.querySelector('.left-body') ? '.left-body' : '.left';
      const rightColSelector = sourceCv.querySelector('.right-body') ? '.right-body' : '.right';
      
      const remainingContent = {
         left: [],
         right: []
      };
      
      const leftCol = sourceCv.querySelector(leftColSelector);
      if (leftCol) {
          Array.from(leftCol.children).forEach(child => remainingContent.left.push(child.cloneNode(true)));
      }
      
      const rightCol = sourceCv.querySelector(rightColSelector);
      if (rightCol) {
          Array.from(rightCol.children).forEach(child => remainingContent.right.push(child.cloneNode(true)));
      }
      
      // Hide original
      sourceCv.style.display = 'none';

      let pageCount = 0;
      const maxPages = 10;

      function fillColumn(pageCv, colSelector, remainingSections) {
         const col = pageCv.querySelector(colSelector);
         if (!col) return remainingSections;
         
         let columnFull = false;
         
         while (remainingSections.length > 0 && !columnFull) {
            const section = remainingSections.shift();
            col.appendChild(section);
            
            const cvRectNow = pageCv.getBoundingClientRect();
            const sectionRect = section.getBoundingClientRect();
            
            const sectionTop = (sectionRect.top - cvRectNow.top) / scale;
            const sectionHeight = sectionRect.height / scale;
            const sectionBottom = sectionTop + sectionHeight;
            
            const BOTTOM_MARGIN = 50; // 2.5rem padding
            const effectivePageHeight = pageHeight - BOTTOM_MARGIN;
            
            if (sectionBottom > effectivePageHeight) {
                const visibleHeight = effectivePageHeight - sectionTop;
                const fitsRatio = visibleHeight / sectionHeight;
                
                if (fitsRatio > 0.5) {
                    const children = Array.from(section.querySelectorAll(BLOCK_SELECTOR));
                    if (children.length > 0) {
                        const leftoverSection = section.cloneNode(true);
                        const leftoverChildren = Array.from(leftoverSection.querySelectorAll(BLOCK_SELECTOR));
                        
                        let childToMoveIndex = children.length - 1;
                        let movedAny = false;
                        
                        while (childToMoveIndex >= 0) {
                            const child = children[childToMoveIndex];
                            child.remove();
                            movedAny = true;
                            
                            const newSectionRect = section.getBoundingClientRect();
                            const newSectionBottom = ((newSectionRect.top - cvRectNow.top) / scale) + (newSectionRect.height / scale);
                            
                            if (newSectionBottom <= effectivePageHeight) {
                                break;
                            }
                            childToMoveIndex--;
                        }
                        
                        if (!movedAny) {
                           section.remove();
                           remainingSections.unshift(section);
                           columnFull = true;
                        } else {
                           for(let i=0; i<=childToMoveIndex; i++) {
                              if (leftoverChildren[i]) leftoverChildren[i].remove();
                           }
                           remainingSections.unshift(leftoverSection);
                           columnFull = true;
                        }
                    } else {
                        section.remove();
                        remainingSections.unshift(section);
                        columnFull = true;
                    }
                } else {
                    section.remove();
                    remainingSections.unshift(section);
                    columnFull = true;
                }
            }
         }
         return remainingSections;
      }

      while ((remainingContent.left.length > 0 || remainingContent.right.length > 0) && pageCount < maxPages) {
         pageCount++;
         const newPage = sourceCv.cloneNode(true);
         newPage.style.display = 'flex';
         newPage.classList.add('paginated-page');
         
         const newLeftCol = newPage.querySelector(leftColSelector);
         if (newLeftCol) newLeftCol.innerHTML = '';
         
         const newRightCol = newPage.querySelector(rightColSelector);
         if (newRightCol) newRightCol.innerHTML = '';
         
         if (pageCount > 1) {
            const firstPageOnlySelectors = [
              '.header', '.right-hero', '.left-hero', '.photo-col', '.photo-wrapper',
              '.name', '.name-block', '.job-title', '.title', '.contact-grid',
              '.contact-item', '.left-top'
            ];
            newPage.querySelectorAll(firstPageOnlySelectors.join(',')).forEach(el => el.remove());
         }
         
         scaler.appendChild(newPage);
         
         if (remainingContent.left.length > 0) {
            remainingContent.left = fillColumn(newPage, leftColSelector, remainingContent.left);
         }
         
         if (remainingContent.right.length > 0) {
            remainingContent.right = fillColumn(newPage, rightColSelector, remainingContent.right);
         }
         
         cleanupEmptySections(newPage);
         
         if (newPage.querySelectorAll('.left > *, .left-body > *, .right > *, .right-body > *').length === 0) {
            break;
         }
      }
      
      sourceCv.remove();
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

export function buildTemplateSrcDoc(templateHtml: string, data: TemplateData, options: { isMultipage?: boolean } = {}): string {
  const rendered = renderTemplate(templateHtml, data);
  if (options.isMultipage) {
    return injectPaginationSupport(rendered);
  }
  return rendered;
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
