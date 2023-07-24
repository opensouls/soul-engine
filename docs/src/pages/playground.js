import React, { useState, useEffect, useRef } from "react";
import Editor from "../components/editor";
import PlaygroundAPI from "../components/playgroundapi";
import { IoIosSend } from "react-icons/io";

import * as socialagi from "socialagi";

import "./playground.css";
import ApiKeyPopup from "../components/apikeypopup";

const defaultCode = `
import {Blueprints, Soul} from 'socialagi';
import playground from 'playground';

const blueprint = Blueprints.SAMANTHA;
const soul = new Soul(Blueprints.SAMANTHA);
const conversation = soul.getConversation("example");

conversation.on("says", (text) => {
  playground.addMessage({sender: "samantha", message: text})
});

playground.on("userMessage", text => {
  conversation.tell(text)
})

conversation.on("thinks", (text) => {
  playground.log(text)
});`.trim();

function Playground() {
  const [messages, setMessages] = useState([
    // {sender: "user", message: "here's a bunch of text. Hello! Welcome!!!"},
    // {sender: "log", message: "here's a bunch of text. Hello! Welcome!!!"},
    //   {sender: "log", message: "here's a bunch of text. Hello! Welcome!!!"},
    //   {sender: "samantha", message: "Hey, yo! what up"}
  ]);
  const [inputText, setInputText] = useState("");
  const [editorCode, setEditorCode] = useState(defaultCode);

  const chatEndRef = useRef(null);

  const playground = useRef(new PlaygroundAPI()).current;

  useEffect(() => {
    playground.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    playground.on("log", (log) => {
      setMessages((prev) => [...prev, { sender: "log", message: log }]);
    });
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChatInput = (e) => {
    if (inputText?.length > 0) {
      e.preventDefault();
      playground.addUserMessage(inputText);
      setInputText("");
    }
  };

  const handleEditorChange = (newValue) => {
    setEditorCode(newValue);
  };

  const [lastRunCode, setLastRunCode] = React.useState("");
  const [enterApiKey, setEnterApiKey] = React.useState(false);

  const codeUpdated = lastRunCode !== editorCode;
  const runUserCode = () => {
    if (!codeUpdated) {
      return;
    }
    setMessages([]);
    if ((localStorage.getItem("apiKey")?.length || 0) === 0) {
      setEnterApiKey(true);
      return;
    }
    setLastRunCode(editorCode);
    const exposedAPI = {
      addMessage: (message) => {
        playground.addMessage(message);
      },
      log: (log) => {
        playground.log(log);
      },
      on: (eventName, fn) => {
        playground.on(eventName, fn);
      },
    };

    const importMap = {
      socialagi: socialagi,
      playground: exposedAPI,
    };
    let processedCode = editorCode;
    const importRegexPattern =
      /import\s+({[^}]*}|[\w\d_]+)?\s*from\s*'([^']*)'/g;
    processedCode = processedCode.replace(
      importRegexPattern,
      (match, importNames, libraryName) => {
        return `const ${importNames} = importMap['${libraryName}']`;
      }
    );

    try {
      window.process = {
        env: {
          OPENAI_API_KEY: localStorage.getItem("apiKey"),
        },
      };
      const func = new Function("importMap", "console", processedCode);
      func(importMap, console, socialagi);
    } catch (err) {
      console.error("Error executing user-submitted code:", err);
    }
  };

  const [showLogs, setShowLogs] = useState(true);

  const handleToggle = () => {
    setShowLogs(!showLogs);
    chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
  };

  const numberLogs = messages.filter((msg) => msg.sender !== "log").length;
  const shownMessages = messages.filter(
    (msg) => (!showLogs && msg.sender !== "log") || showLogs
  );

  return (
    <div className="App">
      <div className="containerTest">
        <div className="panel">
          <div className="runBtnContainer">
            <button
              className={`runBtn` + (codeUpdated ? " runBtnEmph" : "")}
              onClick={runUserCode}
            >
              <div className="clean-btn tocCollapsibleButton_node_modules-@docusaurus-theme-classic-lib-theme-TOCCollapsible-CollapseButton-styles-module run-code-button-chevron">
                {codeUpdated
                  ? lastRunCode?.length > 0
                    ? `Restart SocialAGI`
                    : "Run SocialAGI"
                  : `Run${lastRunCode?.length > 0 ? "ning" : ""} SocialAGI${
                      lastRunCode?.length > 0 ? "..." : ""
                    }`}
              </div>
            </button>
          </div>
          <div className="ace-editor-div">
            <Editor
              editorCode={editorCode}
              handleEditorChange={handleEditorChange}
            />
          </div>
        </div>
        <div className="panelDivider" />
        <div
          className="panel"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div className="settings">
            <button onClick={handleToggle} className="apiButton">
              {showLogs
                ? "Hide Logs"
                : "Show Logs" + (numberLogs > 0 ? ` (${numberLogs})` : "")}
            </button>
            <ApiKeyPopup
              showPopupOverride={enterApiKey}
              resetShowPopupOverride={() => setEnterApiKey(false)}
            />
          </div>
          <div className="messages" ref={chatEndRef}>
            {shownMessages.map((msg, index) => {
              const isLog = msg.sender === "log";
              const isUser = msg.sender === "user";
              const headingIsSameAsParent =
                (shownMessages[index - 1] || {}).sender === msg.sender;
              return isLog ? (
                <p className="log-container" key={index}>
                  <div
                    className={
                      "message-heading-log" +
                      (headingIsSameAsParent ? " transparent" : "")
                    }
                  >
                    {msg.sender}
                  </div>
                  <div className="message-container-log">{msg.message}</div>
                </p>
              ) : (
                <p key={index}>
                  {!headingIsSameAsParent && (
                    <div
                      className={"message-heading" + (isUser ? "" : " active")}
                    >
                      {isUser ? "you" : msg.sender}
                    </div>
                  )}
                  <div
                    className="message-container"
                    style={{ marginTop: headingIsSameAsParent ? -12 : null }}
                  >
                    {msg.message}
                  </div>
                </p>
              );
            })}
          </div>
          <div className="submit-group">
            <form onSubmit={handleChatInput}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Send message..."
              />
            </form>
            <button
              onClick={handleChatInput}
              type="submit"
              className="submit-btn"
            >
              <IoIosSend
                className={"send-btn" + (inputText.length > 0 ? " active" : "")}
                size={26}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Playground;
