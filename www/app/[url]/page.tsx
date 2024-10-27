import ChatInterface from "./client";
import { getPromptFromURL } from "@/utils/helpers";

// ? per Next.js routing conventions on accessing dynamic route data
export default async function Page({
  params }: {
    params: { url: string }
  }) {
  const url = params.url
  const { parsedUrlContent } = await getPromptFromURL(params.url);
  console.log(parsedUrlContent)

  return (
    <div>hmmm</div>
  )

  //<ChatInterface url={url} parsedUrlContent={parsedUrlContent} />;
}