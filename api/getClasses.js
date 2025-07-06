// This is a Vercel serverless function.
// It fetches the course data from a private GitHub Gist.
export default async function handler(request, response) {
  // It's recommended to store the Gist URL in an environment variable for security.
  const gistUrl = process.env.GIST_URL;

  if (!gistUrl) {
    return response.status(500).json({ error: "Gist URL is not configured." });
  }

  try {
    // Fetch the data from the Gist
    const data = await fetch(gistUrl);
    const courses = await data.json();
    // Set caching headers to improve performance
    response.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate"
    );
    // Return the course data as a JSON response
    return response.status(200).json(courses);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to fetch course data." });
  }
}
