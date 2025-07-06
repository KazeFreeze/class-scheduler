/**
 * Represents a single class section with all its details.
 * Includes new fields for scheduling logic and display.
 */
export interface CourseSection {
  "Subject Code": string;
  "Course Title": string;
  Section: string;
  Time: string;
  Room: string;
  Instructor: string;
  Slots: number; // Number of available slots
  Remarks: string; // Special remarks for the section or course

  // Client-side properties for scheduling and UI
  isLocked?: boolean; // If user manually selects it, it's locked in the schedule
  priority: number; // Scheduling priority for this section (lower is higher)
  excluded: boolean; // Whether to exclude this section from auto-scheduling
}

/**
 * Represents a unique course, used for the initial selection list.
 */
export interface UniqueCourse {
  code: string;
  title: string;
}

/**
 * Represents a requirement, which can be a single course or a group of courses.
 * Includes new fields for course-level priority and exclusion.
 */
export interface Requirement {
  id: string; // course code or a unique group ID
  type: "course" | "group";
  name: string; // course code or the custom group name
  courses?: string[]; // List of course codes for a group requirement
  priority: number; // Scheduling priority for this requirement (lower is higher)
  excluded: boolean; // Whether to exclude this entire requirement from auto-scheduling
}

/**
 * Represents a generated schedule, mapping a requirement ID to a chosen CourseSection.
 */
export interface Schedule {
  [requirementId: string]: CourseSection;
}

/**
 * Defines the possible steps in the application's UI flow.
 */
export type AppStep = 1 | 2 | 3;
