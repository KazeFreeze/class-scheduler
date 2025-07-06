import type { CourseSection, Schedule } from "../types";

export const getSectionTimes = (
  section: CourseSection
): { day: number; start: number; end: number }[] => {
  const times: { day: number; start: number; end: number }[] = [];
  const timeStr = section.Time;
  if (!timeStr || String(timeStr).toLowerCase().includes("tba")) return [];

  // CORRECTED: The day mapping is now more specific.
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

    const dayStrMatch = part.match(/^([A-Z\s|]+)\s\d/);
    if (!dayStrMatch) return;

    const dayStr = dayStrMatch[1].replace(/\|/g, "").trim();

    // CORRECTED: The parsing logic now correctly handles codes like 'SAT'.
    const dayCodes = dayStr.split(/\s+/);
    dayCodes.forEach((code) => {
      if (daysMap[code]) {
        times.push({ day: daysMap[code], start, end });
      }
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
