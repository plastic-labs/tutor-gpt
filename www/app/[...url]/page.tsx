import ChatInterface from "./client";
import { getPromptFromURL } from "@/utils/helpers";

// ? per Next.js routing conventions on accessing dynamic route data
export default async function Page({
  params }: {
    params: { url: string[] }
  }) {
  try {
    // Decode and reconstruct the URL
    const fullUrl = decodeURIComponent(params.url.join('/'));

    // Make sure it's a valid URL
    if (!fullUrl.startsWith('http')) {
      throw new Error('URL must start with http:// or https://');
    }

    const { parsedUrlContent } = await getPromptFromURL(fullUrl);
    return <ChatInterface parsedUrlContent={parsedUrlContent} url={fullUrl} />;
  } catch (error) {
    // Handle the error appropriately
    console.error('Error processing URL:', error);
    return <div>Invalid URL format. Please make sure the URL is properly formatted.</div>;
  }
}
