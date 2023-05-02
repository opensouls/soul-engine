// Chat.js
import React, { useState, useEffect, useRef } from "react";
import { Orbitron } from "next/font/google";
import { isMobile } from "react-device-detect";
import { Analytics } from "@vercel/analytics/react";
import { Samantha, OpenaiConfig, OpenaiModel } from "socialagi";

// const config = new OpenaiConfig({ model: OpenaiModel.gpt_3_5_turbo });
// const samantha = new Samantha(config);



const orbitron = Orbitron({ subsets: ["latin"] });

const samanthaServer = 'http://localhost:5001'

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const aiMessagesEndRef = useRef(null);
  const [aiThoughts, setAiThoughts] = useState([]);

  const tellSamantha = () => {
    fetch(`${samanthaServer}/tell`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({message}),
    })

    // clear message on send
    if (message.trim() !== "") {
      setMessages([...messages, { text: message, sender: "user" }]);
      setMessage("");
    }
  }

  const scrollToBottomThoughts = () => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;

      const samanthaMessages = new EventSource(`${samanthaServer}/listenMessages`);
      samanthaMessages.addEventListener('message', (event) => {
        setMessages(prevMessages => [...prevMessages, { text: event.data, sender: "ai" }])
        setAiThoughts(prevThoughts => [...prevThoughts, `I sent the message: ${event.data}`])
      });

      const samanthaThoughts = new EventSource(`${samanthaServer}/listenThoughts`);
      samanthaThoughts.addEventListener('message', (event) => {
        setAiThoughts(prevThoughts => [...prevThoughts, event.data])
      });

      setTimeout(() => tellSamantha("Hi Samantha!"), 200);
    }
  }, [])

  useEffect(() => {
    scrollToBottomThoughts();
  }, [aiThoughts]);

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    tellSamantha(message)
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 relative flex justify-center">
      <div className="flex container px-4 py-12 justify-center">
        <div>
          <h1
            className={`text-4xl text-white font-semibold mb-4 text-center pb-7 ${orbitron.className}`}
          >
            SAMANTHA AGI
          </h1>
          <Messages
            handleMessageChange={handleMessageChange}
            message={message}
            messages={messages}
            handleSendMessage={handleSendMessage}
          />
        </div>
        {!isMobile && (
          <AIThoughts
            aiThoughts={aiThoughts}
            aiMessagesEndRef={aiMessagesEndRef}
          />
        )}
      </div>
    </div>
  );
};

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
  }, [messages]);
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-96">
      <h1 className="text-xl font-semibold mb-4 text-center">Share</h1>
      <div className="flex flex-col space-y-4 h-96 overflow-y-auto mb-4 min-h-40 hide-scrollbar">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === "ai" ? "" : "justify-end"}`}
          >
            <div
              className={`${
                message.sender === "ai"
                  ? "bg-purple-200 text-black"
                  : "bg-purple-600 text-white"
              } px-4 py-2 rounded-lg shadow-md`}
            >
              {message.text}
            </div>
          </div>
        ))}
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
      <Analytics />
    </div>
  );
}

function AIThoughts({ aiThoughts, aiMessagesEndRef }) {
  return (
    <div className="bg-white bg-opacity-0 rounded-lg w-96">
      <div className="h-full overflow-y-auto fixed ml-10 w-96 mx-auto hide-scrollbar">
        <div className="flex-col space-y-4 overflow-y-auto mb-4 hide-scrollbar pb-60 mr-4">
          {aiThoughts.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === "ai" ? "" : "justify-end"}`}
            >
              <div
                className={`text-white bg-purple-100 bg-opacity-30 px-4 py-2 rounded-[35px] shadow-sm opacity-0 transition-all duration-500 ease-in-out animate-fade-in`}
              >
                {message}
              </div>
            </div>
          ))}
          <div ref={aiMessagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function ChatApp() {
  return <Chat />;
}
