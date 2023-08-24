import Image from "next/image";

import banner from "@/public/bloom2x1.svg";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";

import { FaLightbulb, FaPaperPlane } from "react-icons/fa";

export default function Home() {
  return (
    <main className="flex h-[100dvh] flex-col pb-[env(keyboard-inset-height)]">
      <nav className="flex justify-between items-center p-4 border-b border-gray-300">
        <Image src={banner} alt="banner" className="w-[30vw]" />
        <button className="bg-neon-green rounded-lg px-4 py-2 flex justify-center items-center gap-2 text-sm">
          See Thoughts
          <FaLightbulb className="inline" />
        </button>
      </nav>
      <section className="flex flex-col flex-1 overflow-y-auto">
        <Message>
          <p>
            I’m your Aristotelian learning companion — here to help you follow
            your curiosity in whatever direction you like. My engineering makes
            me extremely receptive to your needs and interests. You can reply
            normally, and I’ll always respond!
          </p>
          <p>If I&apos;m off track, just say so!</p>
          <p>
            Need to leave or just done chatting? Let me know! I’m conversational
            by design so I’ll say goodbye 😊.
          </p>
        </Message>
        <Message isUser>
          <p>Can you explain what a metaphor is?</p>
        </Message>
        <Message>
          <p>
            A metaphor is a figure of speech that directly compares one thing to
            another for dramatic, more powerful effect. Unlike simile, it
            doesn’t use the words 'like' or 'as'. It basically states one thing
            IS the other. For example, in the metaphor "Time is a thief", time
            isn't literally stealing anything, but this helps us understand it
            can take away things never to be retrieved again. Why might you be
            seeking to expand your understanding of metaphors?
          </p>
        </Message>
        <Message isUser>
          <p>I want to write better poetry.</p>
        </Message>
      </section>
      <section id="send" className="flex p-3 gap-3 border-t border-gray-300">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-3 py-1 text-sm bg-gray-100 text-gray-400 rounded-2xl"
        />
        <button className="bg-dark-green text-neon-green rounded-full px-4 py-2 flex justify-center items-center gap-2 text-sm">
          <FaPaperPlane className="inline" />
        </button>
      </section>
    </main>
  );
}

function Message({
  children,
  isUser,
}: {
  children: React.ReactNode;
  isUser?: boolean;
}) {
  return (
    <article className={"flex p-5 gap-2 " + (isUser ? "bg-gray-100" : "")}>
      <Image
        src={isUser ? usericon : icon}
        alt="icon"
        className="rounded-full w-6 h-6"
      />
      <div className="text-sm flex flex-col gap-2">{children}</div>
    </article>
  );
}
