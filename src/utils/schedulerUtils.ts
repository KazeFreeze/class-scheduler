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
    S: 6,
  };
  const dayTimeParts = String(timeStr)
    .split(";")
    .map((s) => s.trim());

  dayTimeParts.forEach((part) => {
    const timeMatch = part.match(/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/);
    if (!timeMatch) return;

    const start = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
    const end = parseInt(timeMatch[3], 10) * 60 + parseInt(timeMatch[4], 10);
    const dayStrMatch = part.match(/^([A-Z]+)/);
    if (!dayStrMatch) return;

    const dayStr = dayStrMatch[1];
    let i = 0;
    while (i < dayStr.length) {
      let dayChar = dayStr[i];
      if (dayChar === "T" && i + 1 < dayStr.length && dayStr[i + 1] === "H") {
        times.push({ day: daysMap["TH"], start, end });
        i += 2;
      } else if (daysMap[dayChar]) {
        times.push({ day: daysMap[dayChar], start, end });
        i += 1;
      } else {
        i++;
      }
    }
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
