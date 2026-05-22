import type { MappedPdfStyles, TemplateStyleSpec, TemplateTextToken } from "@/lib/pdf/types";

function px(value: number): number {
  return value;
}

function mapText(token: TemplateTextToken) {
  return {
    fontFamily: token.fontFamily,
    fontSize: px(token.fontSize),
    fontWeight: token.fontWeight,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    textTransform: token.textTransform,
    color: token.color,
  };
}

export function mapTemplateSpecToStyles(spec: TemplateStyleSpec): MappedPdfStyles {
  const sidebarWidth = `${spec.sidebarWidthPct}%`;
  const mainWidth = `${100 - spec.sidebarWidthPct}%`;
  return {
    page: {
      padding: spec.pagePadding,
      backgroundColor: spec.pageBackground,
      color: spec.primaryText,
    },
    root: {
      width: "100%",
      height: "100%",
      flexDirection: "row",
    },
    sidebar: {
      width: sidebarWidth,
      backgroundColor: spec.sidebarBackground,
      paddingHorizontal: px(16),
      paddingVertical: px(16),
      gap: px(spec.sectionGap),
      borderRightColor: spec.borderColor,
      borderRightWidth: 1,
    },
    main: {
      width: mainWidth,
      backgroundColor: spec.mainBackground,
      paddingHorizontal: px(18),
      paddingVertical: px(16),
      gap: px(spec.sectionGap),
    },
    divider: {
      height: 1,
      backgroundColor: spec.divider,
      marginVertical: px(6),
    },
    section: {
      gap: px(spec.sectionSpacing),
    },
    sectionHeader: {
      marginBottom: px(2),
    },
    itemWrap: {
      marginBottom: px(spec.rowSpacing),
      gap: px(3),
    },
    photo: {
      width: px(spec.photoSize),
      height: px(spec.photoSize),
      borderRadius: px(spec.photoSize / 2),
      borderWidth: spec.photoBorderWidth,
      borderColor: "#ffffff",
      objectFit: "cover",
      alignSelf: "flex-end",
    },
    name: mapText(spec.text.name),
    title: mapText(spec.text.title),
    sectionTitle: mapText(spec.text.sectionLabel),
    text: mapText(spec.text.body),
    muted: mapText(spec.text.muted),
    itemHeading: mapText(spec.text.itemHeading),
    itemSubheading: mapText(spec.text.itemSubheading),
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 4,
      paddingRight: 2,
    },
    bulletSymbol: {
      ...mapText(spec.text.bullet),
      width: px(spec.bulletIndent),
      textAlign: "left",
      color: spec.accent,
    },
    bulletText: {
      ...mapText(spec.text.bullet),
      flexGrow: 1,
      flexShrink: 1,
      maxWidth: "95%",
    },
    skill: mapText(spec.text.skill),
  };
}

