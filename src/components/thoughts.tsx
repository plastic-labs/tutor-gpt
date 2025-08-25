import localFont from 'next/font/local'
import { GrClose } from 'react-icons/gr'
import ReactMarkdown from 'react-markdown'

const departureMono = localFont({
  src: '../fonts/DepartureMono-Regular.woff2',
})

export default function Thoughts({
  thought,
  isThoughtsOpen,
  setIsThoughtsOpen,
}: {
  thought: string
  isThoughtsOpen: boolean
  setIsThoughtsOpen: (isOpen: boolean) => void
}) {
  return (
    <section
      className={
        'absolute top-0 right-0 flex h-[100dvh] w-4/5 flex-col bg-neon-green text-black transition-all duration-300 ease-in-out lg:w-3/5 ' +
        (isThoughtsOpen ? 'z-30 translate-x-0 shadow-lg' : 'translate-x-full')
      }
    >
      <div className="flex flex-row-reverse p-4">
        <button
          className="text-dark-green text-xl"
          onClick={() => {
            setIsThoughtsOpen(false)
          }}
        >
          <GrClose className="inline" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4">
        <h1 className={`${departureMono.className} font-bold text-2xl`}>
          Thoughts
        </h1>
        <ReactMarkdown>{thought}</ReactMarkdown>
        {/*
          <button>
            View More <IoIosArrowDown />{" "}
          </button>
 */}{' '}
      </div>
    </section>
  )
}
