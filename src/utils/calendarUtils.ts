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
    S: 6,
    H: 4,
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
    const dayStrMatch = part.match(/^([A-Z]+)/);
    if (!dayStrMatch) return;

    const dayStr = dayStrMatch[1];
    const days: number[] = [];
    let i = 0;
    while (i < dayStr.length) {
      if (dayStr[i] === "T" && i + 1 < dayStr.length && dayStr[i + 1] === "H") {
        days.push(daysMap["TH"]);
        i += 2;
      } else if (daysMap[dayStr[i]]) {
        days.push(daysMap[dayStr[i]]);
        i += 1;
      } else {
        i += 1;
      }
    }

    days.forEach((day) => {
      if (day) {
        courseEvents.push({
          id: `${course["Subject Code"]}-${course.Section}`,
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
