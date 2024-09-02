"use client";
import Image from "next/image";
import useSWR from "swr";

import dynamic from "next/dynamic";

import banner from "@/public/bloom2x1.svg";
import darkBanner from "@/public/bloom2x1dark.svg";
import MessageBox from "@/components/messagebox";
// import Thoughts from "@/components/thoughts";
import Sidebar from "@/components/sidebar";
import MarkdownWrapper from "@/components/markdownWrapper";
import { DarkModeSwitch } from "react-toggle-dark-mode";
import { FaLightbulb, FaPaperPlane, FaBars } from "react-icons/fa";
import Swal from "sweetalert2";

import { useRef, useEffect, useState, ElementRef } from "react";
import { redirect } from "next/navigation";
import { usePostHog } from "posthog-js/react";

import { API } from "@/utils/api";
import { createClient } from "@/utils/supabase/client";

const Thoughts = dynamic(() => import("@/components/thoughts"));

const URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [userId, setUserId] = useState<string>();

  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [thought, setThought] = useState("");
  const [canSend, setCanSend] = useState(false);

  const [conversationId, setConversationId] = useState<string>();

  const supabase = createClient();
  const posthog = usePostHog();
  const input = useRef<ElementRef<"textarea">>(null);
  //const input = useRef<ElementRef<"input">>(null);
  const isAtBottom = useRef(true);
  const messageContainerRef = useRef<ElementRef<"section">>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
  };

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      // Check for an error or no user
      if (!user || error) {
        await Swal.fire({
          title: "Notice: Bloombot now requires signing in for usage",
          text: "Due to surging demand for Bloom we are requiring users to stay signed in to user Bloom",
          icon: "warning",
          confirmButtonColor: "#3085d6",
          confirmButtonText: "Sign In",
        })
        redirect("/auth");
      }
      setUserId(user.id);
      setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      posthog?.identify(userId, { email: user.email });
    })();
  }, []);

  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (!messageContainer) return;

    const func = () => {
      const val =
        Math.round(
          messageContainer.scrollHeight - messageContainer.scrollTop
        ) === messageContainer.clientHeight;
      isAtBottom.current = val;
    };

    messageContainer.addEventListener("scroll", func);

    return () => {
      messageContainer.removeEventListener("scroll", func);
    };
  }, []);

  const conversationsFetcher = async (userId: string) => {
    const api = new API({ url: URL!, userId });
    return api.getConversations();
  };

  const {
    data: conversations,
    mutate: mutateConversations,
    error,
  } = useSWR(userId, conversationsFetcher, {
    onSuccess: (conversations) => {
      setConversationId(conversations[0].conversationId);
      setCanSend(true);
    },
    revalidateOnFocus: false,
  });

  const messagesFetcher = async (conversationId: string) => {
    if (!userId) return Promise.resolve([]);
    if (!conversationId) return Promise.resolve([]);

    const api = new API({ url: URL!, userId });
    return api.getMessages(conversationId);
  };

  const {
    data: messages,
    mutate: mutateMessages,
    isLoading: messagesLoading,
    error: _,
  } = useSWR(conversationId, messagesFetcher, { revalidateOnFocus: false });

  async function chat() {
    const textbox = input.current!;
    // process message to have double newline for markdown
    const message = textbox.value.replace(/\n/g, "\n\n");
    textbox.value = "";

    setCanSend(false); // Disable sending more messages until the current generation is done

    const newMessages = [
      ...messages!,
      {
        text: message,
        isUser: true,
      },
      {
        text: "",
        isUser: false,
      },
    ];
    mutateMessages(newMessages, { revalidate: false });

    // sleep for 1 second to give the user the illusion of typing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // const reader = await currentConversation!.chat(message);
    const reader = await conversations!
      .find((conversation) => conversation.conversationId === conversationId)!
      .chat(message);

    const messageContainer = messageContainerRef.current;
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    let isThinking = true;
    setThought("");

    let currentModelOutput = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(thought);
        setCanSend(true);
        break;
      }
      if (isThinking) {
        if (value.includes("❀")) {
          // a bloom delimiter
          isThinking = false;
          // setThought((prev) => prev + "\n" + value + "\n");
          continue;
        }
        setThought((prev) => prev + value);
        // mutateMessages(newMessages, { revalidate: false });
      } else {
        // if (value.includes("❀Response❀")) {
        //   // a bloom delimiter
        //   isThinking = true;
        //   continue;
        // }
        if (value.includes("❀")) {
          setCanSend(true); // Bloom delimeter
          continue;
        }
        // setMessages((prev) => {
        //   prev[prev.length - 1].text += value;
        //   return [...prev];
        // });

        currentModelOutput += value;

        mutateMessages(
          [
            ...newMessages?.slice(0, -1)!,
            {
              text: currentModelOutput,
              isUser: false,
            },
          ],
          { revalidate: false }
        );

        if (isAtBottom.current) {
          const messageContainer = messageContainerRef.current;
          if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
          }
        }
      }
    }

    mutateMessages();
  }

  return (
    <main
      className={`flex h-[100dvh] w-screen flex-col pb-[env(keyboard-inset-height)] text-sm lg:text-base overflow-hidden relative ${isDarkMode ? "dark" : ""
        }`}
    >
      <Sidebar
        conversations={conversations || []}
        mutateConversations={mutateConversations}
        conversationId={conversationId}
        setConversationId={setConversationId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        api={new API({ url: URL!, userId: userId! })}
      // session={session}
      />
      <div className="flex flex-col w-full h-[100dvh] lg:pl-60 xl:pl-72 dark:bg-gray-900">
        <nav className="flex justify-between items-center p-4 border-b border-gray-300 dark:border-gray-700">
          <FaBars
            className="inline lg:hidden dark:text-white"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          <Image
            src={isDarkMode ? darkBanner : banner}
            alt="banner"
            className="h-10  w-auto"
          />
          <div className="flex justify-between items-center gap-4">
            <DarkModeSwitch checked={isDarkMode} onChange={toggleDarkMode} />
            <button
              className="bg-neon-green rounded-lg px-4 py-2 flex justify-center items-center gap-2"
              onClick={() => setIsThoughtsOpen(true)}
            >
              See Thoughts
              <FaLightbulb className="inline" />
            </button>
          </div>
        </nav>
        {/* <section className="bg-neon-green text-black text-center py-4"> */}
        {/*   <p> */}
        {/*     Help inform the future of Bloom by filling out this{" "} */}
        {/*     <Link */}
        {/*       className="cursor-pointer hover:cursor-pointer font-bold underline" */}
        {/*       href={"https://form.typeform.com/to/se0tN3J6"} */}
        {/*       target="_blank" */}
        {/*     > */}
        {/*       survey */}
        {/*     </Link> */}
        {/*   </p> */}
        {/* </section> */}
        <section
          className="flex flex-col flex-1 overflow-y-auto lg:px-5 dark:text-white"
          ref={messageContainerRef}
        >
          {
            messagesLoading || messages === undefined ? (
              <MessageBox loading />
            ) : (
              messages.map((message, i) => (
                <MessageBox isUser={message.isUser} key={i}>
                  <MarkdownWrapper text={message.text} />
                </MessageBox>
              ))
            )
          }
        </section >
        <form
          id="send"
          className="flex p-3 lg:p-5 gap-3 border-gray-300"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend && input.current?.value) {
              posthog.capture("user_sent_message");
              chat();
            }
          }}
        >
          {/* TODO: validate input */}
          <textarea
            ref={input}
            placeholder="Type a message..."
            className={`flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl border-2 resize-none ${canSend ? " border-green-200" : "border-red-200 opacity-50"
              }`}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend && input.current?.value) {
                  posthog.capture("user_sent_message");
                  chat();
                }
              }
            }}
          />
          <button
            className="bg-dark-green text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
            type="submit"
            disabled={!canSend}
          >
            <FaPaperPlane className="inline" />
          </button>
        </form>
      </div >
      <Thoughts
        thought={thought}
        setIsThoughtsOpen={setIsThoughtsOpen}
        isThoughtsOpen={isThoughtsOpen}
      />
    </main >
  );
}
