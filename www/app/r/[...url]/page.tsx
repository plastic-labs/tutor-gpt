import Home from "@/app/home";
import { getPromptFromURL } from "@/utils/helpers";

// This page performs server-side rendering to process the URL using jina reader
// and return the parsed content to the core Chat react component as input
export default async function Page({
  params,
}: {
  params: { url: string[] };
}) {
  // Ensure URL has at least protocol and domain parts
  if (params.url.length < 2) {
    throw Error("Page not found");
  }
  // Check for JINA API key
  if (!process.env.NEXT_PUBLIC_JINA_API_KEY) {
    throw new Error("JINA API key is not configured");
  }
  // Reconstruct the full URL from parts
  // Protocol comes as first parameter with encoded colon (e.g., "https%3A")
  const protocol = params.url[0].replace(/%3A/g, ':');
  // Combine remaining parts with forward slashes
  const restOfUrl = params.url.slice(1).join('/');
  // Create properly formatted URL (e.g., "https://example.com/page")
  const fullUrl = `${protocol}//${restOfUrl}`;

  // Validate that the URL is accessible before processing
  try {
    const controller = new AbortController();
    // Set timeout to prevent hanging on slow responses
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    // Perform lightweight HEAD request to check URL validity
    const response = await fetch(fullUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId); // Clean up timeout

    if (!response.ok) {
      throw new Error(`URL returned status: ${response.status}`);
    }
  } catch (error) {
    // Log validation errors for debugging in production
    console.error('URL validation failed:', error);
    if (error instanceof Error) {
      throw new Error(error.name === 'AbortError'
        ? 'Request timed out'
        : 'Unable to access the provided URL'
      );
    }
    throw new Error('Unable to access the provided URL');
  }

  // Parse the URL content and render the home page with results
  const { parsedUrlContent } = await getPromptFromURL(fullUrl);
  return (
    <Home
      parsedUrlContent={parsedUrlContent}
      url={fullUrl}
    />
  );
}