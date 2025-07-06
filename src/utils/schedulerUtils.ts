import type { CourseSection, Schedule } from "../types";

export const getSectionTimes = (
  section: CourseSection
): { day: number; start: number; end: number }[] => {
  const times: { day: number; start: number; end: number }[] = [];
  const timeStr = section.Time;
  if (!timeStr || String(timeStr).toLowerCase().includes("tba")) return [];

  const daysMap: { [key: string]: number } = {
    M: 1,
    T: 2,
    W: 3,
    TH: 4,
    F: 5,
    SAT: 6,
  };
  const dayTimeParts = String(timeStr)
    .split(";")
    .map((s) => s.trim());

  dayTimeParts.forEach((part) => {
    const timeMatch = part.match(/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/);
    if (!timeMatch) return;

    const start = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
    const end = parseInt(timeMatch[3], 10) * 60 + parseInt(timeMatch[4], 10);

    // Capture the day string part at the beginning of the line.
    const dayStrMatch = part.match(/^([A-Z\s|-]+)/);
    if (!dayStrMatch) return;

    const dayStr = dayStrMatch[1];

    // CORRECTED: This new parsing logic iterates through the day string,
    // correctly identifying multi-letter codes ("SAT", "TH") and single-letter codes,
    // while ignoring delimiters like hyphens, spaces, and pipes.
    const parsedDays: number[] = [];
    let i = 0;
    while (i < dayStr.length) {
      // Check for 3-letter codes first (e.g., "SAT")
      if (i + 2 < dayStr.length && daysMap[dayStr.substring(i, i + 3)]) {
        parsedDays.push(daysMap[dayStr.substring(i, i + 3)]);
        i += 3;
      }
      // Then 2-letter codes (e.g., "TH")
      else if (i + 1 < dayStr.length && daysMap[dayStr.substring(i, i + 2)]) {
        parsedDays.push(daysMap[dayStr.substring(i, i + 2)]);
        i += 2;
      }
      // Then 1-letter codes (e.g., "M", "T", "W", "F")
      else if (daysMap[dayStr[i]]) {
        parsedDays.push(daysMap[dayStr[i]]);
        i += 1;
      }
      // If it's not a recognized day code, skip the character.
      else {
        i += 1;
      }
    }

    // Add the unique parsed days to the times array.
    [...new Set(parsedDays)].forEach((day) => {
      times.push({ day, start, end });
    });
  });
  return times;
};

export const checkForConflict = (
  sectionToCheck: CourseSection,
  currentSelections: Schedule,
  requirementIdToIgnore: string
): CourseSection | null => {
  const sectionTimes = getSectionTimes(sectionToCheck);
  if (sectionTimes.length === 0) return null;

  for (const reqId in currentSelections) {
    if (reqId === requirementIdToIgnore) continue;
    const selectedSection = currentSelections[reqId];
    const existingTimes = getSectionTimes(selectedSection);
    for (const t1 of sectionTimes) {
      for (const t2 of existingTimes) {
        if (t1.day === t2.day && t1.start < t2.end && t1.end > t2.start) {
          return selectedSection; // Conflict found
        }
      }
    }
  }
  return null; // No conflict
};
