import { GrClose } from "react-icons/gr";
import ReactMarkdown from "react-markdown";

export default function Thoughts({ thought, isThoughtsOpen, setIsThoughtsOpen }: { thought: string, isThoughtsOpen: boolean, setIsThoughtsOpen: Function }) {
  return (
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
        {/*
          <button>
            View More <IoIosArrowDown />{" "}
          </button>
 */}       </div>
    </section>
  );
}
