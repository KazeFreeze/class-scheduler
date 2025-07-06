// This is a Vercel serverless function, written in TypeScript.
// It should be placed at /pages/api/getClasses.ts in a Vercel project.
// It fetches the course data from a private GitHub Gist.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  // The request object is not used, but is required by the Vercel function signature.
  // The underscore prefix tells the linter to ignore the unused variable warning.
  _request: VercelRequest,
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
