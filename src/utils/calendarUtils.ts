import type { CourseSection } from "../types";

/**
 * Generates a consistent, vibrant color from a string hash.
 * Uses HSL color space for better control over saturation and lightness.
 * @param str The input string (e.g., course code).
 * @returns An HSL color string.
 */
export const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Ensure 32bit integer
  }
  // Use the hash to generate a hue, and keep saturation/lightness constant for vibrancy.
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 45%)`;
};

/**
 * Converts an HSL color string to its RGB components.
 * @param hslColor The HSL color string (e.g., "hsl(120, 50%, 50%)").
 * @returns An object with r, g, b components (0-255), or null if conversion fails.
 */
const hslToRgb = (
  hslColor: string
): { r: number; g: number; b: number } | null => {
  const match = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/.exec(hslColor);
  if (!match) return null;

  let h = parseInt(match[1]);
  let s = parseInt(match[2]) / 100;
  let l = parseInt(match[3]) / 100;

  let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2,
    r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return { r, g, b };
};

/**
 * Determines whether black or white text has better contrast on a given background color.
 * @param hslColor The HSL background color string.
 * @returns '#000000' for black text or '#ffffff' for white text.
 */
export const getContrastTextColor = (hslColor: string): string => {
  const rgb = hslToRgb(hslColor);
  if (!rgb) return "#ffffff"; // Default to white on error

  // Formula to calculate perceived brightness (YIQ)
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
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
    const parsedDays: number[] = [];
    let i = 0;
    while (i < dayStr.length) {
      if (i + 2 < dayStr.length && daysMap[dayStr.substring(i, i + 3)]) {
        // SAT
        parsedDays.push(daysMap[dayStr.substring(i, i + 3)]);
        i += 3;
      } else if (i + 1 < dayStr.length && daysMap[dayStr.substring(i, i + 2)]) {
        // TH
        parsedDays.push(daysMap[dayStr.substring(i, i + 2)]);
        i += 2;
      } else if (daysMap[dayStr[i]]) {
        // M, T, W, F
        parsedDays.push(daysMap[dayStr[i]]);
        i += 1;
      } else {
        i += 1; // Skip delimiters
      }
    }

    [...new Set(parsedDays)].forEach((day) => {
      if (day) {
        const bgColor = stringToColor(course["Subject Code"]);
        const textColor = getContrastTextColor(bgColor);

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
          backgroundColor: bgColor,
          borderColor: bgColor,
          textColor: textColor, // Set contrasting text color
        });
      }
    });
  });

  return courseEvents;
};
