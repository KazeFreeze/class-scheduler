import type { CourseSection } from "../types";

// Hashing function to get a consistent color for a course
export const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    const brightenedValue = Math.floor((value + 255 * 2) / 3);
    color += ("00" + brightenedValue.toString(16)).substr(-2);
  }
  return color;
};

export const parseCourseToEvents = (course: CourseSection) => {
  const timeStr = course.Time;
  if (!timeStr || String(timeStr).toLowerCase().includes("tba")) return [];

  const daysMap: { [key: string]: number } = {
    M: 1,
    T: 2,
    W: 3,
    TH: 4,
    F: 5,
    SAT: 6,
  };
  const courseEvents: any[] = [];
  const dayTimeParts = String(timeStr)
    .split(";")
    .map((s) => s.trim());

  dayTimeParts.forEach((part) => {
    const timeMatch = part.match(/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/);
    if (!timeMatch) return;

    const startTime = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
    const endTime = `${timeMatch[3].padStart(2, "0")}:${timeMatch[4]}`;

    const dayStrMatch = part.match(/^([A-Z\s|-]+)/);
    if (!dayStrMatch) return;

    const dayStr = dayStrMatch[1];

    // CORRECTED: This new parsing logic mirrors the one in schedulerUtils,
    // ensuring consistency between conflict detection and calendar display.
    const parsedDays: number[] = [];
    let i = 0;
    while (i < dayStr.length) {
      if (i + 2 < dayStr.length && daysMap[dayStr.substring(i, i + 3)]) {
        parsedDays.push(daysMap[dayStr.substring(i, i + 3)]);
        i += 3;
      } else if (i + 1 < dayStr.length && daysMap[dayStr.substring(i, i + 2)]) {
        parsedDays.push(daysMap[dayStr.substring(i, i + 2)]);
        i += 2;
      } else if (daysMap[dayStr[i]]) {
        parsedDays.push(daysMap[dayStr[i]]);
        i += 1;
      } else {
        i += 1;
      }
    }

    [...new Set(parsedDays)].forEach((day) => {
      if (day) {
        courseEvents.push({
          id: `${course["Subject Code"]}-${course.Section}-${day}`,
          title: `${course["Subject Code"]} (${course.Section})`,
          startTime: startTime,
          endTime: endTime,
          daysOfWeek: [day],
          extendedProps: {
            instructor: course.Instructor,
            room: course.Room,
          },
          backgroundColor: stringToColor(course["Subject Code"]),
          borderColor: stringToColor(course["Subject Code"]),
        });
      }
    });
  });

  return courseEvents;
};
