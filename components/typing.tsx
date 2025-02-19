export default function Typing() {
  return (
    <div className="typing_indicator flex flex-row gap-2 h-7 px-3 rounded-full bg-gray-100 justify-center items-center w-min dark:bg-gray-800">
      <div className="typing_dot bg-gray-500 rounded-full h-2 w-2"></div>
      <div className="typing_dot bg-gray-500 rounded-full h-2 w-2"></div>
      <div className="typing_dot bg-gray-500 rounded-full h-2 w-2"></div>
    </div>
  );
}
