export const getUniqueLocations = (locations: string[]): string[] => {
  const locationSuffixes = new Set([
    "city",
    "state",
    "town",
    "village",
    "county",
    "province",
    "region",
    "fct",
  ]);

  const result = new Set<string>();

  for (const location of locations) {
    if (!location || typeof location !== "string") {
      continue;
    }

    // Normalize common remote variations
    const normalized = location
      .toLowerCase()
      .replace(/\b100\s*%\s*remote\b/g, "remote")
      .replace(/\bfully\s+remote\b/g, "remote");

    // Remove numbers and symbols
    const words = normalized
      .replace(/[^a-zA-Z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    let currentLocation: string[] = [];

    for (const word of words) {
      // Ignore geographic suffixes.
      //
      // Lagos State   -> Lagos
      // Lagos City    -> Lagos
      // Benin City    -> Benin
      // New York City -> New York
      if (locationSuffixes.has(word)) {
        continue;
      }

      currentLocation.push(word);

      /*
       * "Remote" and "Nigeria" should remain separate locations.
       *
       * So:
       * "Remote Nigeria"
       * becomes:
       * Remote
       * Nigeria
       *
       * rather than:
       * Remote Nigeria
       */
      if (word === "remote" || currentLocation.length === 1) {
        result.add(word);
        currentLocation = [];
      }
    }

    // Add any remaining words individually
    for (const word of currentLocation) {
      result.add(word);
    }
  }

  // Capitalize each word
  const formattedLocations = [...result].map((location) =>
    location
      .split(" ")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ")
  );

  // Remove duplicates again after formatting
  // and sort alphabetically
  return [...new Set(formattedLocations)].sort((a, b) =>
    a.localeCompare(b)
  );
};