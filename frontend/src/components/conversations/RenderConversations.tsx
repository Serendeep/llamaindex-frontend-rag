import React, { useEffect, useRef } from "react";
import { ROLE } from "~/types/conversation";
import type { Message } from "~/types/conversation";
import { LoadingSpinnerChat } from "~/components/basics/Loading";
import { HiOutlineChatAlt2 } from "react-icons/hi";
import { FaUserTie } from "react-icons/fa6";
import { BsRobot } from "react-icons/bs";



interface UserDisplayProps {
  message: Message;
  showLoading: boolean;
}
const UserDisplay: React.FC<UserDisplayProps> = ({ message, showLoading }) => {
  return (
    <>
      <div className="flex flex-row-reverse  pb-4">
        <div className="mt-4 w-fit content-center px-2 mx-2 rounded-r-md bg-gray-200">
          <FaUserTie size={20} color="teal" />
        </div>

        <div className="mt-4 w-fit bg-emerald-200 py-2 pr-4 pl-8 rounded-l-md font-nunito font-bold text-gray-90">
          {message.content}
        </div>
      </div>
      {showLoading && (
        <div className="flex border-b-2 pb-4 justify-center">
          <div className="ml-2.5 mt-1 ">
            <LoadingSpinnerChat />
          </div>
        </div>
      )}
    </>
  );
};



interface AssistantDisplayProps {
  message: Message;
}
const AssistantDisplay: React.FC<AssistantDisplayProps> = ({
  message,
}) => {

  return (
    <div className="flex flex-row  pb-4">
      <div className="mt-4 w-fit content-center px-2 mx-2 rounded-l-md bg-gray-200">
        <BsRobot size={20} color="blue" />
      </div>

      <div className="mt-4 w-fit bg-blue-200 py-2 pl-4 pr-8 rounded-r-md font-nunito font-bold text-gray-90">
        {message.content}
      </div>

    </div>
  );
};

interface IRenderConversation {
  messages: Message[];
}

export const RenderConversations: React.FC<IRenderConversation> = ({
  messages,
}) => {
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lastElementRef.current) {
      lastElementRef.current.scrollIntoView();
    }
  }, [messages]);

  const showLoading = messages[messages.length - 1]?.role === ROLE.USER;
  return (
    <div className="box-border flex h-full flex-col justify-start font-nunito text-sm text-[#2B3175]">
      {messages.map((message, index) => {
        let display;
        if (message.role == ROLE.ASSISTANT) {
          display = (
            <AssistantDisplay
              message={message}
              key={`${message.id}-answer-${index}`}
            />
          );
        } else if (message.role == ROLE.USER) {
          display = (
            <UserDisplay
              message={message}
              key={`${message.id}-question-${index}-user`}
              showLoading={index === messages.length - 1 ? showLoading : false}
            />
          );
        } else {
          display = <div>Sorry, there is a problem.</div>;
        }
        if (index === messages.length - 1) {
          return (
            <div className="mb-4 flex flex-col" key={`message-${message.id}`}>
              {display}
            </div>
          );
        } else {
          return (
            <div className="flex flex-col" key={`${message.id}-${index}`}>
              {display}
            </div>
          );
        }
      })}
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center ">
          <div className="flex w-full flex-col items-center justify-center">
            <div>
              <HiOutlineChatAlt2 size={40} />
            </div>
            <div className="mb-2 w-3/4 text-center text-lg font-bold">
              Ask the bot questions about the documents you&apos;ve
              selected.
            </div>
          </div>
        </div>
      )}
      <div ref={lastElementRef}></div>
    </div>
  );
};
