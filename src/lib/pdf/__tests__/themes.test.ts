import { describe, expect, it } from "vitest";
import { resolvePdfTemplate } from "@/lib/pdf/themes";
import type { TemplateId } from "@/lib/templateCatalog";

const templateIds: TemplateId[] = [
  "template1",
  "template2",
  "template3",
  "template4",
  "template5",
  "template6",
  "template7",
];

describe("resolvePdfTemplate", () => {
  it("returns a complete style/layout contract for each template", () => {
    for (const id of templateIds) {
      const resolved = resolvePdfTemplate(id);
      expect(resolved.id).toBe(id);
      expect(resolved.style.sidebarWidthPct).toBeGreaterThan(0);
      expect(resolved.style.sidebarWidthPct).toBeLessThan(100);
      expect(resolved.style.text.name.fontFamily).toBeTruthy();
      expect(resolved.layout.bulletPrefix.length).toBeGreaterThan(0);
    }
  });
});

