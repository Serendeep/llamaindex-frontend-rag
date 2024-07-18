import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import type { ChangeEvent } from "react";
import { backendUrl } from "src/config";
import { MESSAGE_STATUS, Message, ROLE } from "~/types/conversation";
import { RenderConversations as RenderConversations } from "~/components/conversations/RenderConversations";
import { BiArrowBack } from "react-icons/bi";
import { BsArrowUpCircle } from "react-icons/bs";
import { useIntercom } from "react-use-intercom";

export default function Conversation() {
  const router = useRouter();

  const { shutdown } = useIntercom();
  useEffect(() => {
    shutdown();
  }, []);

  const [isMessagePending, setIsMessagePending] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const textFocusRef = useRef<HTMLTextAreaElement | null>(null);


  // Keeping this in this file for now because this will be subject to change
  const submit = () => {
    if (!userMessage) {
      return;
    }

    setIsMessagePending(true);
    const messageEndpoint =
      backendUrl + `api/chat/v2`;    
    var temp = messages;
    temp.push({content: userMessage, role: ROLE.USER, id: (temp.length + 1).toString()});
    setMessages(temp);
    setUserMessage("");
    fetch(messageEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        history: temp,
      }),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("Failed to send message");
      })
      .then((data) => {
        if (data && data.response) {
          // systemSendMessage(data.response.content);
          // Update the conversation history with the new message and the response
          setMessages(data.updated_history);
        } else {
          console.error("Failed to send message");
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setIsMessagePending(false);
      });
  };
  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setUserMessage(event.target.value);
  };

  useEffect(() => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "auto";

      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [userMessage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (!isMessagePending) {
          submit();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [submit]);

  useEffect(() => {
    if (textFocusRef.current) {
      textFocusRef.current.focus();
    }
  }, []);


  return (
      <div className="flex h-[100vh] w-full items-center justify-center">
        <div className="flex h-[100vh] w-full flex-col items-center border-r-2 bg-white">
          <div className="flex h-[44px] w-full items-center justify-between border-b-2 ">
            <div className="flex w-full items-center justify-between">
              <button
                onClick={() => {
                  router
                    .push("/")
                    .catch(() => console.error("error navigating home"));
                }}
                className="ml-4 flex items-center justify-center rounded px-2 font-light text-[#9EA2B0] hover:text-gray-90"
              >
                <BiArrowBack className="mr-1" /> Back to Document Selection
              </button>
            </div>
          </div>
          <div className="flex max-h-[calc(100vh-114px)] w-full px-7 flex-grow flex-col overflow-scroll ">
            <RenderConversations
              messages={messages}
            />
          </div>
          <div className="relative flex h-[70px] w-full items-center border-b-2 border-t">
            <textarea
              ref={textFocusRef}
              rows={1}
              className="box-border w-full flex-grow resize-none overflow-hidden rounded px-5 py-3 pr-10 text-gray-90 placeholder-gray-60 outline-none"
              placeholder={"Start typing your question..."}
              value={userMessage}
              onChange={handleTextChange}
            />
            <button
              disabled={isMessagePending || userMessage.length === 0}
              onClick={submit}
              className="z-1 absolute right-6 top-1/2 mb-1 -translate-y-1/2 transform rounded text-gray-90 opacity-80 enabled:hover:opacity-100 disabled:opacity-30"
            >
              <BsArrowUpCircle size={24} />
            </button>
          </div>
        </div>
      </div>
  );
}
