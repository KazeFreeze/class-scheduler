export interface CourseSection {
  "Subject Code": string;
  "Course Title": string;
  Section: string;
  Time: string;
  Room: string;
  Instructor: string;
  // Client-side properties
  priority?: number;
  excluded?: boolean;
  isLocked?: boolean;
}

export interface UniqueCourse {
  code: string;
  title: string;
}

export interface Requirement {
  id: string; // course code or group ID
  type: "course" | "group";
  name: string; // course code or group name
  courses?: string[]; // For groups
}

export interface Schedule {
  [requirementId: string]: CourseSection;
}

export type AppStep = 1 | 2 | 3;
