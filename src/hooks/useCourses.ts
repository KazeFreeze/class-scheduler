import { useState, useEffect, useCallback } from "react";
import type { CourseSection, UniqueCourse } from "../types";

/**
 * Custom hook to fetch and process course data from the API.
 * It initializes each course section with default values for priority and exclusion.
 */
export const useCourses = () => {
  const [allCoursesData, setAllCoursesData] = useState<CourseSection[]>([]);
  const [uniqueCourses, setUniqueCourses] = useState<Map<string, UniqueCourse>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Add a cache-busting query parameter to ensure fresh data is fetched.
      const response = await fetch(`/api/getClasses?t=${new Date().getTime()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${
            errorData.error || "Unknown error"
          }`
        );
      }
      const data = await response.json();

      const coursesWithDefaults = data.courses.map(
        (c: any): CourseSection => ({
          ...c,
          Slots: c["Free Slots"] ?? 0,
          Remarks: c.Remarks ?? "",
          priority: 100,
          excluded: false,
        })
      );

      setAllCoursesData(coursesWithDefaults);

      const newUniqueCourses = new Map<string, UniqueCourse>();
      coursesWithDefaults.forEach((course: CourseSection) => {
        const code = course["Subject Code"];
        if (!newUniqueCourses.has(code)) {
          newUniqueCourses.set(code, { code, title: course["Course Title"] });
        }
      });
      setUniqueCourses(newUniqueCourses);
    } catch (e: any) => {
      setError(
        `Failed to fetch course data. Please ensure the API is running and the Gist URL is correct. Details: ${e.message}`
      );
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []); // useCallback with an empty dependency array makes this function stable.

  useEffect(() => {
    // Fire-and-forget request to the notification endpoint.
    fetch("/api/notifyLoad", { method: "POST" }).catch((err) => {
      // Log error to console if the notification fails, but don't bother the user.
      console.error("Failed to send load notification:", err);
    });

    fetchCourses();
  }, [fetchCourses]); // This effect runs once on mount because fetchCourses is stable.

  return { allCoursesData, setAllCoursesData, uniqueCourses, loading, error, refetchCourses: fetchCourses };
};
