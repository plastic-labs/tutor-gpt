import Image from "next/image";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";
import Skeleton from "react-loading-skeleton";

interface MessageBoxRegularProps {
  children: React.ReactNode;
  isUser?: boolean;
  loading?: false;
}

interface MessageBoxLoadingProps {
  children?: React.ReactNode;
  isUser?: boolean;
  loading: true;
}

// merge the two types
type MessageBoxProps = MessageBoxRegularProps | MessageBoxLoadingProps;

export default function MessageBox({
  children,
  isUser,
  loading,
}: MessageBoxProps) {
  return (
    <article
      className={
        "flex p-5 lg:p-8 gap-2 lg:gap-5 lg:rounded-2xl " +
        (isUser ? "bg-gray-100 dark:bg-gray-800" : "")
      }
    >
      {loading ? (
        <Skeleton circle={true} className="lg:!w-12 lg:!h-12 !w-6 !h-6 " />
      ) : (
        <Image
          src={isUser ? usericon : icon}
          alt="icon"
          className="rounded-full w-6 h-6 lg:w-12 lg:h-12"
        />
      )}
      <div className="flex flex-col gap-2 w-full">
        {loading ? <Skeleton count={4} /> : children}
        {/* <Skeleton count={3} className="" /> */}
      </div>
    </article>
  );
}
