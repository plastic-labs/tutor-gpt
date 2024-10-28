import { GrClose } from 'react-icons/gr';
import ReactMarkdown from 'react-markdown';

export default function Thoughts({
  thought,
  isThoughtsOpen,
  setIsThoughtsOpen,
}: {
  thought: string;
  isThoughtsOpen: boolean;
  setIsThoughtsOpen: Function;
}) {
  return (
    <section
      className={
        'absolute right-0 top-0 flex h-[100dvh] w-4/5 flex-col bg-neon-green transition-all duration-300 ease-in-out lg:w-3/5 ' +
        (isThoughtsOpen ? 'translate-x-0 shadow-lg' : 'translate-x-full')
      }
    >
      <div className="flex flex-row-reverse p-4">
        <button
          className="text-xl text-dark-green"
          onClick={() => {
            setIsThoughtsOpen(false);
          }}
        >
          <GrClose className="inline" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4">
        <h1 className="text-2xl font-bold">Thoughts</h1>
        <ReactMarkdown>{thought}</ReactMarkdown>
        {/*
          <button>
            View More <IoIosArrowDown />{" "}
          </button>
 */}{' '}
      </div>
    </section>
  );
}
