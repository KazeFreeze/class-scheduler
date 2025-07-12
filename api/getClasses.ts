import type { VercelRequest, VercelResponse } from "@vercel/node";

// Define the necessary types directly within the API route file.
// This interface now correctly matches the structure of the source JSON data.
interface CourseSection {
  "Subject Code": string;
  "Course Title": string;
  Section: string;
  Time: string;
  Room: string;
  Instructor: string;
  "Free Slots"?: number; // Added to match the source JSON
  Remarks?: string; // Added to match the source JSON
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // The GIST_URL should now be the standard Gist URL, not the raw file URL.
  // e.g., https://gist.github.com/username/gist_id
  const gistUrl = process.env.GIST_URL;

  if (!gistUrl) {
    return response.status(500).json({ error: "Gist URL is not configured." });
  }

  try {
    // 1. Extract the Gist ID from the URL.
    const gistId = gistUrl.split("/").pop();
    if (!gistId) {
      throw new Error(
        "Could not extract Gist ID from the provided URL. Please use the standard Gist URL."
      );
    }
    const gistApiUrl = `https://api.github.com/gists/${gistId}`;

    // 2. Fetch Gist details from the GitHub API to find the raw URL.
    // Note: To avoid GitHub API rate limits, you can add an Authorization header.
    // For public gists, this is usually not an issue for moderate traffic.
    const gistApiResponse = await fetch(gistApiUrl);
    if (!gistApiResponse.ok) {
      throw new Error(
        `Failed to fetch Gist details from GitHub API: ${gistApiResponse.statusText}`
      );
    }
    const gistData = await gistApiResponse.json();

    // 3. Find the first file in the Gist and get its raw URL.
    // This assumes the Gist contains at least one JSON file.
    const fileKey = Object.keys(gistData.files).find((key) =>
      key.endsWith(".json")
    );
    if (!fileKey) {
      throw new Error("No JSON file found in the Gist.");
    }
    const rawUrl = gistData.files[fileKey].raw_url;

    // 4. Fetch the actual course data from the dynamically found raw URL.
    const dataResponse = await fetch(rawUrl, {
      // Use cache-busting for the fetch itself if force refresh is requested
      cache: request.query.force === "true" ? "no-cache" : "default",
    });

    if (!dataResponse.ok) {
      throw new Error(
        `Failed to fetch from Gist raw URL with status: ${dataResponse.status}`
      );
    }
    const courses: { courses: CourseSection[] } = await dataResponse.json();

    // Allow forcing a refresh via query parameter.
    const forceRefresh = request.query.force === "true";
    // Set cache to 15 minutes (900 seconds). This is a good balance.
    const cacheHeader = forceRefresh
      ? "no-cache"
      : "s-maxage=900, stale-while-revalidate";

    response.setHeader("Cache-Control", cacheHeader);

    // Return the course data as a JSON response
    return response.status(200).json(courses);
  } catch (error: any) {
    console.error(error);
    return response
      .status(500)
      .json({ error: "Failed to fetch course data.", details: error.message });
  }
}
