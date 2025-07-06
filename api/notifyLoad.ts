import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only proceed if the request method is POST
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  // If the webhook URL is not configured in environment variables, silently succeed.
  if (!webhookUrl) {
    return response.status(200).json({ message: "Webhook not configured." });
  }

  try {
    const ip =
      (request.headers["x-forwarded-for"] as string) ||
      request.socket.remoteAddress ||
      "N/A";
    const userAgent = request.headers["user-agent"] || "N/A";
    const timestamp = new Date().toISOString();

    // Construct a rich embed object for the Discord message
    const embed = {
      title: "Website Loaded",
      color: 0x3498db, // A nice blue color
      fields: [
        { name: "Timestamp (UTC)", value: timestamp, inline: false },
        { name: "IP Address", value: `||${ip}||`, inline: true }, // Use spoiler tags for privacy
        {
          name: "User Agent",
          value: `\`\`\`${userAgent}\`\`\``,
          inline: false,
        },
      ],
      footer: {
        text: "Class Scheduler Notification",
      },
      timestamp: timestamp,
    };

    // Send the data to the Discord webhook
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    // Respond to the client that the notification was sent
    return response.status(200).json({ message: "Notification sent." });
  } catch (error: any) {
    console.error("Error sending Discord webhook:", error);
    // Don't block the user, just log the error server-side.
    return response.status(500).json({ error: "Failed to send notification." });
  }
}
