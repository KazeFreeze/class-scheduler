// This is a Vercel serverless function, written in TypeScript.
// It should be placed at /api/getClasses.ts in a Vercel project.
// It fetches the course data from a private GitHub Gist.

// If using Vercel, you can import the types from the Vercel SDK.
// For other platforms, you might use types from Express or other frameworks.
// Example for Vercel:
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // It's recommended to store the Gist URL in an environment variable for security.
  const gistUrl = process.env.GIST_URL;

  if (!gistUrl) {
    return response.status(500).json({ error: "Gist URL is not configured." });
  }

  try {
    // Fetch the data from the Gist
    const dataResponse = await fetch(gistUrl);
    if (!dataResponse.ok) {
      throw new Error(
        `Failed to fetch from Gist with status: ${dataResponse.status}`
      );
    }
    const courses = await dataResponse.json();

    // Set caching headers to improve performance and reduce costs.
    // s-maxage=3600: Cache on the CDN for 1 hour.
    // stale-while-revalidate: Serve stale content while re-fetching in the background.
    response.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate"
    );

    // Return the course data as a JSON response
    return response.status(200).json(courses);
  } catch (error: any) {
    console.error(error);
    return response
      .status(500)
      .json({ error: "Failed to fetch course data.", details: error.message });
  }
}
