export default function Typing() {
  return (
    <div className="typing_indicator flex h-7 w-min flex-row items-center justify-center gap-2 rounded-full bg-gray-100 px-3 dark:bg-gray-800">
      <div className="typing_dot h-2 w-2 rounded-full bg-gray-500"></div>
      <div className="typing_dot h-2 w-2 rounded-full bg-gray-500"></div>
      <div className="typing_dot h-2 w-2 rounded-full bg-gray-500"></div>
    </div>
  );
}
