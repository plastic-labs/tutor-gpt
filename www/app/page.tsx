"use client";
import Image from "next/image";

import banner from "@/public/bloom2x1.svg";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";

import { FaLightbulb, FaPaperPlane } from "react-icons/fa";
import { GrClose } from "react-icons/gr";
import { useState } from "react";

export default function Home() {
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);

  return (
    <main className="flex h-[100dvh] w-screen flex-col pb-[env(keyboard-inset-height)] lg:container lg:mx-auto text-sm lg:text-2xl overflow-hidden relative">
      <nav className="flex justify-between items-center p-4 border-b border-gray-300">
        <Image src={banner} alt="banner" className="h-10  w-auto" />
        <button
          className="bg-neon-green rounded-lg px-4 py-2 flex justify-center items-center gap-2"
          onClick={() => setIsThoughtsOpen(true)}
        >
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
            doesn’t use the words &apos;like&apos; or &apos;as&apos;. It
            basically states one thing IS the other. For example, in the
            metaphor &quot;Time is a thief&quot;, time isn&apos;t literally
            stealing anything, but this helps us understand it can take away
            things never to be retrieved again. Why might you be seeking to
            expand your understanding of metaphors?
          </p>
        </Message>
        <Message isUser>
          <p>I want to write better poetry.</p>
        </Message>
      </section>
      <section
        id="send"
        className="flex p-3 lg:p-5 gap-3 border-t border-gray-300"
      >
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 text-gray-400 rounded-2xl"
        />
        <button className="bg-dark-green text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2">
          <FaPaperPlane className="inline" />
        </button>
      </section>
      <section
        className={
          "absolute h-[100dvh] flex flex-col w-4/5 right-0 top-0 bg-neon-green transition-all duration-300 ease-in-out " +
          (isThoughtsOpen ? "translate-x-0 shadow-lg" : "translate-x-full")
        }
      >
        <div className="flex flex-row-reverse p-4">
          <button
            className="text-dark-green text-xl"
            onClick={() => setIsThoughtsOpen(false)}
          >
            <GrClose className="inline" />
          </button>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto px-4 gap-2">
          <h1 className="text-2xl font-bold">Thoughts</h1>
          <p>
            The user is interested in improving their poetry writing skills.
            They might need guidance on not only the specific literary elements
            such as metaphors, but also cues on other features of effective
            poetry like rhythm, rhyme, imagery, and effective use of words.
          </p>
          <p>
            Based on the conversation so far, they would likely appreciate
            practical examples or exercises they could immediately apply to
            their writing. Understanding more about the user's exposure level
            and familiarity with other poetic elements, their preferred styles
            or poets, and any specific areas they're struggling with could help
            me tailor advice to their unique needs better.
          </p>
        </div>
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
    <article
      className={
        "flex p-5 lg:p-8 gap-2 lg:gap-5 lg:rounded-2xl " +
        (isUser ? "bg-gray-100" : "")
      }
    >
      <Image
        src={isUser ? usericon : icon}
        alt="icon"
        className="rounded-full w-6 h-6 lg:w-12 lg:h-12"
      />
      <div className=" flex flex-col gap-2">{children}</div>
    </article>
  );
}
