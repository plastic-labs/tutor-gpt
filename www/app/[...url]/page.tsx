import ChatInterface from "./client";
import { getPromptFromURL } from "@/utils/helpers";

// ? per Next.js routing conventions on accessing dynamic route data
export default async function Page({
  params,
}: {
  params: { url: string[] };
}) {
  try {
    // Handle the protocol separately
    if (params.url.length < 2) {
      throw new Error('Invalid URL format');
    }
    // Extract and fix the protocol
    const protocol = params.url[0].replace('%3A', ':');
    // Join the rest of the URL parts
    const restOfUrl = params.url.slice(1).join('/');
    // Construct the full URL with proper protocol separator
    const fullUrl = `${protocol}//${restOfUrl}`;
    console.log(`Processing URL: ${fullUrl}`);
    // Validate the URL starts with http or https
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    const { parsedUrlContent } = await getPromptFromURL(fullUrl);

    return (
      <ChatInterface
        parsedUrlContent={parsedUrlContent}
        url={fullUrl}
      />
    );
  } catch (error) {
    console.error('Error processing URL:', error);
    return (
      <div className="p-4 text-red-600">
        Error: {error instanceof Error ? error.message : 'Invalid URL format. Please make sure the URL is properly formatted.'}
      </div>
    );
  }
}