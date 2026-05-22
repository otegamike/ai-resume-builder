import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

function registerFamily(family: string, src: string, fontWeight: number) {
  Font.register({ family, src, fontWeight });
}

export function registerPdfFonts() {
  if (fontsRegistered) return;

  // Primary deterministic local font bundle for PDF export.
  // Falls back gracefully to built-in PDF fonts if these assets are unavailable.
  try {
    registerFamily("Raleway", "/fonts/raleway/Raleway-Regular.ttf", 400);
    registerFamily("Raleway", "/fonts/raleway/Raleway-Medium.ttf", 500);
    registerFamily("Raleway", "/fonts/raleway/Raleway-SemiBold.ttf", 600);
    registerFamily("Raleway", "/fonts/raleway/Raleway-Bold.ttf", 700);

    registerFamily("PlayfairDisplay", "/fonts/playfair-display/PlayfairDisplay-Regular.ttf", 400);
    registerFamily("PlayfairDisplay", "/fonts/playfair-display/PlayfairDisplay-Bold.ttf", 700);
  } catch {
    // No-op; renderer will fallback to default fonts.
  }

  fontsRegistered = true;
}

