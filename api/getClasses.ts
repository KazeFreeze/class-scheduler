import type { VercelRequest, VercelResponse } from "@vercel/node";

// This interface correctly matches the structure of the source JSON data.
interface CourseSection {
  "Subject Code": string;
  "Course Title": string;
  Section: string;
  Time: string;
  Room: string;
  Instructor: string;
  "Free Slots"?: number;
  Remarks?: string;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const gistUrl = process.env.GIST_URL;
  // The new code will use a GitHub token from your environment variables if it exists.
  const githubToken = process.env.GITHUB_TOKEN;

  if (!gistUrl) {
    return response.status(500).json({ error: "Gist URL is not configured." });
  }

  try {
    const gistId = gistUrl.split("/").pop();
    if (!gistId) {
      throw new Error(
        "Could not extract Gist ID from the provided URL. Please use the standard Gist URL."
      );
    }
    const gistApiUrl = `https://api.github.com/gists/${gistId}`;

    // Set up headers for the GitHub API request.
    // It will include the Authorization token if you've provided one.
    const apiHeaders: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
    };
    if (githubToken) {
      apiHeaders["Authorization"] = `token ${githubToken}`;
    }

    // Fetch Gist details from the GitHub API
    const gistApiResponse = await fetch(gistApiUrl, { headers: apiHeaders });
    if (!gistApiResponse.ok) {
      const rateLimitRemaining = gistApiResponse.headers.get(
        "x-ratelimit-remaining"
      );
      // This throws a much more descriptive error if the GitHub API call fails.
      throw new Error(
        `GitHub API error: ${gistApiResponse.status} ${
          gistApiResponse.statusText
        }. (Rate limit remaining: ${rateLimitRemaining ?? "N/A"})`
      );
    }
    const gistData = await gistApiResponse.json();

    // Find the first JSON file in the Gist to get its raw URL.
    const fileKey = Object.keys(gistData.files).find((key) =>
      key.endsWith(".json")
    );
    if (!fileKey) {
      throw new Error(
        "No JSON file found in the Gist. Please ensure your Gist contains one file ending with '.json'."
      );
    }
    const rawUrl = gistData.files[fileKey].raw_url;

    // Fetch the actual course data from the raw URL
    const dataResponse = await fetch(rawUrl, {
      cache: request.query.force === "true" ? "no-cache" : "default",
    });

    if (!dataResponse.ok) {
      throw new Error(
        `Failed to fetch content from Gist raw URL (${rawUrl}) with status: ${dataResponse.status}`
      );
    }
    const courses = await dataResponse.json();

    // Caching logic remains the same (15 minutes)
    const forceRefresh = request.query.force === "true";
    const cacheHeader = forceRefresh
      ? "no-cache"
      : "s-maxage=900, stale-while-revalidate";
    response.setHeader("Cache-Control", cacheHeader);

    return response.status(200).json(courses);
  } catch (error: any) {
    console.error("Error in getClasses API:", error.message);
    // Pass the more detailed error message to the frontend
    return response
      .status(500)
      .json({ error: "Failed to fetch course data.", details: error.message });
  }
}
