import { describe, expect, it } from "vitest";
import { mapTemplateSpecToStyles } from "@/lib/pdf/styleMapper";
import { resolvePdfTemplate } from "@/lib/pdf/themes";

describe("mapTemplateSpecToStyles", () => {
  it("maps core spacing and palette tokens into react-pdf style objects", () => {
    const spec = resolvePdfTemplate("template1").style;
    const mapped = mapTemplateSpecToStyles(spec);

    expect(mapped.page.backgroundColor).toBe(spec.pageBackground);
    expect(mapped.sidebar.backgroundColor).toBe(spec.sidebarBackground);
    expect(mapped.main.backgroundColor).toBe(spec.mainBackground);
    expect(mapped.section.gap).toBe(spec.sectionSpacing);
    expect(mapped.bulletSymbol.width).toBe(spec.bulletIndent);
  });

  it("maps text token typography into text styles", () => {
    const spec = resolvePdfTemplate("template3").style;
    const mapped = mapTemplateSpecToStyles(spec);

    expect(mapped.name.fontFamily).toBe(spec.text.name.fontFamily);
    expect(mapped.name.fontSize).toBe(spec.text.name.fontSize);
    expect(mapped.sectionTitle.letterSpacing).toBe(spec.text.sectionLabel.letterSpacing);
    expect(mapped.bulletText.lineHeight).toBe(spec.text.bullet.lineHeight);
  });
});

