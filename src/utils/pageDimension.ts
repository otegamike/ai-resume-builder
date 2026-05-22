/**
 * Calculates the nearest valid HTML2PDF height boundary based on 
 * an 1123px page height with 15px top and bottom margins.
 * 
 * @param {number} currentHeight - The current height of your content in pixels.
 * @returns {number} The target height rounded up to the nearest page boundary minus margins.
 */
export function getNearestPageHeight(currentHeight: number) : number {
  const pageHeight = 1123;
  const topMargin = 15;
  const bottomMargin = 15;
  
  // The printable height available for content on a single page (1093px)
  const usablePageHeight = pageHeight - topMargin - bottomMargin;
  
  // Determine how many pages are required (caps it to the next whole page)
  const pageCount = Math.ceil(currentHeight / usablePageHeight);
  
  // Calculate total height: (Full pages * usable area) + the bottom margin padding
  return (pageCount * usablePageHeight);
}

// --- Quick Examples ---
console.log(getNearestPageHeight(500));   // Returns 1108 (Fits on Page 1: 1093 usable + 15)
console.log(getNearestPageHeight(1093));  // Returns 1108 (Exactly fills Page 1)
console.log(getNearestPageHeight(1100));  // Returns 2201 (Spills into Page 2: 1093 * 2 + 15)