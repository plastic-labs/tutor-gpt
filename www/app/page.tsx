"use client";
import Image from "next/image";

import banner from "@/public/bloom2x1.svg";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";

import { FaLightbulb, FaPaperPlane, FaBars, FaTrash, FaEdit } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";
import { GrClose } from "react-icons/gr";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";
import Typing from "@/components/typing";

// Supabase 
import { createClient, Session } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Message {
  text: string;
  isUser: boolean;
}

interface Conversation {
  conversation_id: string;
  name: string;
}

const URL = process.env.NEXT_PUBLIC_URL;

export default function Home() {
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [thought, setThought] = useState("");
  const [userId, setUserId] = useState(`anon_${uuidv4()}`);
  const defaultMessage: Message = {
    text: `I&apos;m your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!\n\nIf I&apos;m off track, just say so!\n\nNeed to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊.`,
    isUser: false,
  }

  const [messages, setMessages] = useState<Array<Message>>([
    defaultMessage,
  ]);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [conversations, setConversations] = useState<Array<Conversation>>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation>({ "conversation_id": "", "name": "" })
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthSession(session);
      if (session) {
        setUserId(session.user.id)
        // console.log("User Id", userId)
      }
      // console.log("Session 1", session)
    })

    //const { data: { subscription },
    //} = supabase.auth.onAuthStateChange((_event, session) => {
    //  console.log(_event)
    //  if (_event === "SIGNED_OUT") {
    //    setAuthSession(session);
    //  }
    //})

    //return () => subscription.unsubscribe();
  }, [])

  useEffect(() => {
    if (authSession) {
      // console.log(userId)
      // const response = fetch("http://localhost:8000")
      getConversations()
        .then((conversations) => {
          // console.log("Conversations", conversations)
          // console.log(userId)
          if (conversations.length > 0) {
            setConversations(conversations)
            setCurrentConversation(conversations[0])
            // console.log("Current Conversation", currentConversation)
          } else {
            newChat().then((conversation_id) => {
              let newConversation: Conversation = {
                name: "",
                conversation_id
              }
              // console.log("Conversation ID", conversation_id)
              // console.log(userId)
              setCurrentConversation(newConversation)
              // console.log("Current Conversation", currentConversation)
              setConversations([...conversations, newConversation])
            })
          }
        })
    } else {
      // TODO store anonymous chats in localstorage or cookies
      newChat().then((conversation_id) => {
        // console.log("Conversation ID", conversation_id)
        setCurrentConversation(conversation_id)
        // console.log("Current Conversation", currentConversation)
        setConversations([...conversations, conversation_id])
      })
    }
  }, [authSession])

  useEffect(() => {
    getMessages().then((messages) => {
      setMessages([defaultMessage, ...messages])
    })

  }, [currentConversation])

  async function handleSignOut() {
    await supabase.auth.signOut()
    console.log("Signed out")
    location.reload()
  }

  async function newChat() {
    return await fetch(`${URL}/api/conversations/insert?user_id=${userId}`)
      .then((res) => res.json())
      .then(({ conversation_id }) => {
        return conversation_id
      })
      .catch((err) => console.error(err))
  }

  async function addChat() {
    const conversationId = await newChat();
    const newConversation: Conversation = {
      name: "Untitled",
      conversation_id: conversationId
    }

    setConversations([...conversations, newConversation])
  }

  async function getConversations() {
    return await fetch(`${URL}/api/conversations/get?user_id=${userId}`)
      .then((res) => res.json())
      .then(({ conversations }) => {
        // console.log(conversations)
        return conversations
      })
  }

  async function deleteConversation(conversation: Conversation) {
    const check = confirm("Are you sure you want to delete this conversation, this action is irreversible?")
    if (!check)
      return
    const { conversation_id } = conversation
    await fetch(`${URL}/api/conversations/delete?user_id=${userId}&conversation_id=${conversation_id}`)
      .then((res) => res.json())
    // Delete the conversation_id from the conversations state variable
    setConversations(conversations.filter(cur => cur.conversation_id !== conversation_id));

    // If it was the currentConversation, change the currentConversation to the next one in the list
    if (conversation === currentConversation) {
      if (conversations.length > 1) {
        setCurrentConversation(conversations[0]);
        console.log("Current Conversation", currentConversation)
      } else {
        // If there is no current conversation create a new one
        const newConversationId = await newChat();
        setCurrentConversation(newConversationId);
        console.log("Current Conversation", currentConversation)
        setConversations([newConversationId]);
      }
    }

  }

  async function editConversation(cur: Conversation) {
    const newName = prompt("Enter a new name for the conversation")
    if (!newName)
      return
    fetch(`${URL}/api/conversations/update`, {
      method: "POST",
      body: JSON.stringify({
        conversation_id: cur.conversation_id,
        name: newName
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((data) => {
        const copy = { ...currentConversation }
        copy.name = newName
        setCurrentConversation(copy)
        setConversations(conversations.map(conversation =>
          conversation.conversation_id === copy.conversation_id ? copy : conversation
        ))
      })

  }

  async function getMessages() {
    return await fetch(`${URL}/api/messages?user_id=${userId}&conversation_id=${currentConversation.conversation_id}`)
      .then((res) => res.json())
      .then(({ messages }) => {
        const formattedMessages = messages.map((message: any) => {
          return {
            text: message.data.content,
            isUser: message.type === "human",
          }
        })
        return formattedMessages
      })
  }

  async function chat() {
    const textbox = input.current!;
    const message = textbox.value;
    textbox.value = "";

    setMessages((prev) => [
      ...prev,
      {
        text: message,
        isUser: true,
      },
      {
        text: "",
        isUser: false,
      },
    ]);

    const data = await fetch(`${URL}/api/stream`, {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        conversation_id: currentConversation.conversation_id,
        message: message,
      }),
      // no cors
      // mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const reader = data.body?.pipeThrough(new TextDecoderStream()).getReader()!;

    // clear the last message
    setMessages((prev) => {
      prev[prev.length - 1].text = "";
      return [...prev];
    });

    let isThinking = true;
    setThought("");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // console.log(value);
      if (isThinking) {
        if (value.includes("❀")) {
          // a bloom delimiter
          isThinking = false;
          continue;
        }
        setThought((prev) => prev + value);
      } else {
        setMessages((prev) => {
          prev[prev.length - 1].text += value;
          return [...prev];
        });
      }
    }
  }

  return (
    <main className="flex h-[100dvh] w-screen flex-col pb-[env(keyboard-inset-height)] text-sm lg:text-xl overflow-hidden relative">
      <div className={`fixed z-20 inset-0 flex-none h-full w-full lg:absolute lg:h-auto lg:overflow-visible lg:pt-0 lg:w-60 xl:w-72 lg:block ${isSidebarOpen ? "" : "hidden"}`}>
        <div className={`h-full scrollbar-trigger overflow-hidden bg-white lg:w-full w-4/5 flex flex-col ${isSidebarOpen ? "fixed" : "sticky"} top-0 left-0`}>
          {/* Section 1: Top buttons */}
          <div className="flex justify-between items-center p-4 gap-2 border-b border-gray-300">
            <button className="bg-neon-green rounded-lg px-4 py-2 w-full lg:w-full h-11" onClick={addChat}>New Chat</button>
            <button className="lg:hidden bg-neon-green rounded-lg px-4 py-2 h-11" onClick={() => setIsSidebarOpen(false)}><GrClose /></button>
          </div>

          {/* Section 2: Scrollable items */}
          <div className="flex flex-col flex-1 overflow-y-auto divide-y divide-gray-300">
            {/* Replace this with your dynamic items */}
            {conversations.map((cur, i) => (
              <div key={i} className={`flex justify-between items-center p-4 cursor-pointer hover:bg-gray-200 ${currentConversation === cur ? "bg-gray-200" : ""}`} onClick={() => setCurrentConversation(cur)}>
                <div>
                  <h2 className="font-bold text-base overflow-ellipsis overflow-hidden">{cur.name || "Untitled"}</h2>
                </div>
                <div className="flex flex-row justify-end gap-2 items-center w-1/5">
                  <button className="text-gray-500" onClick={() => editConversation(cur)}>
                    <FaEdit />
                  </button>
                  <button className="text-red-500" onClick={() => deleteConversation(cur)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Section 3: Authentication information */}
          <div className="border-t border-gray-300 p-4 w-full">
            {/* Replace this with your authentication information */}
            {authSession ?
              (<button className="bg-neon-green rounded-lg px-4 py-2 w-full" onClick={handleSignOut}>Sign Out</button>) :
              (<button className="bg-neon-green rounded-lg px-4 py-2 w-full" onClick={() => router.push("/auth")}>Sign In</button>)}
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full h-[100dvh] lg:pl-60 xl:pl-72">
        <nav className="flex justify-between items-center p-4 border-b border-gray-300">
          <FaBars className="inline lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <Image src={banner} alt="banner" className="h-10  w-auto" />
          <button
            className="bg-neon-green rounded-lg px-4 py-2 flex justify-center items-center gap-2"
            onClick={() => setIsThoughtsOpen(true)}
          >
            See Thoughts
            <FaLightbulb className="inline" />
          </button>
        </nav>
        {!authSession && (
          <section className="bg-neon-green text-black text-center py-4">
            To save your conversation history and personalize your messages <span className="cursor-pointer hover:cursor-pointer font-bold underline" onClick={() => router.push("/auth")}>sign in here</span>
          </section>
        )}
        <section className="flex flex-col flex-1 overflow-y-auto">
          {messages.map((message, i) => {
            return (
              <Message isUser={message.isUser} key={i}>
                {message.text ? (
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                ) : (
                  <Typing />
                )}
              </Message>
            );
          })}
        </section>
        <form
          id="send"
          className="flex p-3 lg:p-5 gap-3 border-gray-300"
          onSubmit={(e) => {
            e.preventDefault();
            chat();
          }}
        >
          {/* TODO: validate input */}
          <input
            type="text"
            ref={input}
            placeholder="Type a message..."
            className="flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 text-gray-400 rounded-2xl"
          />
          <button
            className="bg-dark-green text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
            type="submit"
          >
            <FaPaperPlane className="inline" />
          </button>
        </form>
      </div>
      <section
        className={
          "absolute h-[100dvh] flex flex-col lg:w-3/5 w-4/5 right-0 top-0 bg-neon-green transition-all duration-300 ease-in-out " +
          (isThoughtsOpen ? "translate-x-0 shadow-lg" : "translate-x-full")
        }
      >
        <div className="flex flex-row-reverse p-4">
          <button
            className="text-dark-green text-xl"
            onClick={() => {
              setIsThoughtsOpen(false)
            }
            }
          >
            <GrClose className="inline" />
          </button>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto px-4 gap-2">
          <h1 className="text-2xl font-bold">Thoughts</h1>
          <ReactMarkdown>{thought}</ReactMarkdown>
          <button>
            View More <IoIosArrowDown />{" "}
          </button>
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
