import { useState, useEffect, useCallback } from "react";
import type { CourseSection, UniqueCourse } from "../types";

export const useCourses = () => {
  const [allCoursesData, setAllCoursesData] = useState<CourseSection[]>([]);
  // The error about 'setUniqueCourses' being unused is often a linter quirk or
  // a caching issue when the build process gets confused. The function is
  // clearly used below. This updated, cleaner version should resolve it.
  const [uniqueCourses, setUniqueCourses] = useState<Map<string, UniqueCourse>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const timestamp = new Date().getTime();
      let apiUrl = `/api/getClasses?t=${timestamp}`;
      if (forceRefresh) {
        apiUrl += `&force=true`;
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.details ||
          errorData.error ||
          `The server responded with status ${response.status}.`;
        throw new Error(errorMessage);
      }
      const data = await response.json();

      const coursesWithDefaults = data.courses.map(
        (c: any): CourseSection => ({
          ...c,
          Slots:
            typeof c["Free Slots"] === "string"
              ? parseInt(c["Free Slots"], 10)
              : c["Free Slots"] ?? 0,
          Remarks: c.Remarks ?? "-",
          priority: 100,
          excluded: false,
        })
      );

      setAllCoursesData(coursesWithDefaults);

      const newUniqueCourses = new Map<string, UniqueCourse>();
      coursesWithDefaults.forEach((course: CourseSection) => {
        const code = course["Subject Code"];
        // Ensure the map is populated correctly with both code and title
        if (!newUniqueCourses.has(code)) {
          newUniqueCourses.set(code, {
            code: code,
            title: course["Course Title"],
          });
        }
      });
      setUniqueCourses(newUniqueCourses);
    } catch (e: any) {
      setError(`Failed to fetch course data. Reason: ${e.message}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/notifyLoad", { method: "POST" }).catch((err) => {
      console.error("Failed to send load notification:", err);
    });

    fetchCourses();
  }, [fetchCourses]);

  return {
    allCoursesData,
    setAllCoursesData,
    uniqueCourses,
    loading,
    error,
    refetchCourses: fetchCourses,
  };
};
