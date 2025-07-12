import type { VercelRequest, VercelResponse } from "@vercel/node";

// The 'CourseSection' interface was removed from this file because it was
// causing a "declared but never used" error during the build process.
// The data is simply passed through, and the client-side hook handles the typing.

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // The GIST_URL should be the standard Gist URL, not the raw file URL.
  const gistUrl = process.env.GIST_URL;

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

    const gistApiResponse = await fetch(gistApiUrl);
    if (!gistApiResponse.ok) {
      throw new Error(
        `Failed to fetch Gist details from GitHub API: ${gistApiResponse.statusText}`
      );
    }
    const gistData = await gistApiResponse.json();

    const fileKey = Object.keys(gistData.files).find((key) =>
      key.endsWith(".json")
    );
    if (!fileKey) {
      throw new Error("No JSON file found in the Gist.");
    }
    const rawUrl = gistData.files[fileKey].raw_url;

    const dataResponse = await fetch(rawUrl, {
      cache: request.query.force === "true" ? "no-cache" : "default",
    });

    if (!dataResponse.ok) {
      throw new Error(
        `Failed to fetch from Gist raw URL with status: ${dataResponse.status}`
      );
    }
    // The raw data is fetched and passed directly to the client.
    const courses = await dataResponse.json();

    const forceRefresh = request.query.force === "true";
    const cacheHeader = forceRefresh
      ? "no-cache"
      : "s-maxage=900, stale-while-revalidate";

    response.setHeader("Cache-Control", cacheHeader);

    return response.status(200).json(courses);
  } catch (error: any) {
    console.error(error);
    return response
      .status(500)
      .json({ error: "Failed to fetch course data.", details: error.message });
  }
}
