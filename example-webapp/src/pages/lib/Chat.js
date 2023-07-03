// Chat.js
import React, { useCallback, useState, useEffect, useRef } from "react";
import { useSoul } from "./socialagiConnection";

function Chat() {
  const [message, setMessage] = useState("");
  const { tellSoul, messages, soulThoughts } = useSoul();

  const soulMessagesEndRef = useRef(null);

  const handleSendMessage = (event) => {
    event.preventDefault();
    tellSoul(message);
    if (message.trim() !== "") {
      setMessage("");
    }
  };

  const scrollToBottomThoughts = () => {
    soulMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottomThoughts();
  }, [soulThoughts]);

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 relative flex justify-center">
      <div className="flex container px-4 py-12 justify-center">
        <div>
          <h1
            className={`text-4xl text-white font-semibold mb-4 text-center pb-7 orbitron`}
          >
            Social AGI
          </h1>
          <Messages
            handleMessageChange={handleMessageChange}
            message={message}
            messages={messages}
            handleSendMessage={handleSendMessage}
          />
        </div>
        <SoulThoughts
          soulThoughts={soulThoughts}
          soulMessagesEndRef={soulMessagesEndRef}
        />
      </div>
    </div>
  );
}

function Messages({
  handleMessageChange,
  message,
  messages,
  handleSendMessage,
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setTimeout(() => scrollToBottom(), 100);
    setTimeout(() => scrollToBottom(), 250);
  }, [messages]);
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-96">
      <h1 className="text-xl font-semibold mb-4 text-center">
        Share with Samantha
      </h1>
      <div className="flex flex-col space-y-4 h-96 overflow-y-auto mb-4 min-h-40 hide-scrollbar">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === "soul" ? "" : "justify-end"}`}
          >
            {message.sender === "soul" && (
              <img
                src={"/samantha.png"}
                style={{
                  height: "35px",
                  width: "35px",
                  objectFit: "cover",
                  borderRadius: "50%",
                  marginRight: 7,
                  marginTop: 2,
                }}
                alt="description"
              />
            )}
            <div
              className={`${
                message.sender === "soul"
                  ? "bg-purple-200 text-black"
                  : "bg-purple-600 text-white"
              } px-4 py-2 rounded-lg shadow-md`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div />
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSendMessage}
        className="flex items-center space-x-4"
      >
        <input
          type="text"
          className="text-black w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          placeholder="Type your message here..."
          value={message}
          onChange={handleMessageChange}
        />
        <button
          type="submit"
          className="rounded-lg bg-purple-600 text-white px-4 py-2 font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function SoulThoughts({ soulThoughts, soulMessagesEndRef }) {
  return (
    <div className="bg-white bg-opacity-0 rounded-lg w-96">
      <div className="h-full overflow-y-auto fixed ml-10 w-96 mx-auto hide-scrollbar">
        <div className="flex-col space-y-4 overflow-y-auto mb-4 hide-scrollbar pb-60 mr-4">
          {soulThoughts.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.sender === "soul" ? "" : "justify-end"
              }`}
            >
              <div
                className={`text-white bg-purple-100 bg-opacity-30 px-4 py-2 rounded-[35px] shadow-sm opacity-0 transition-all duration-500 ease-in-out animate-fade-in`}
              >
                {message.thought}
              </div>
            </div>
          ))}
          <div ref={soulMessagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function ChatApp() {
  return <Chat />;
}
