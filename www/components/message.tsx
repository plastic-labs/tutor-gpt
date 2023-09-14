import Image from "next/image";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";

export default function Message({ children, isUser }: {
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
