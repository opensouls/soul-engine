import React, { useState, useEffect, useRef } from "react";
import Editor from "../components/editor";
import PlaygroundAPI from "../components/playgroundapi";
import { IoIosSend } from "react-icons/io";
import Layout from "@theme/Layout";

import * as socialagi from "socialagi";

import "./playground.css";
import ApiKeyPopup from "../components/apikeypopup";
import { HistoryButton, HistoryTimeline } from "../components/historybutton";

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
    // { sender: "user", message: "here's a bunch of text. Hello! Welcome!!!" },
    // { sender: "log", message: "here's a bunch of text. Hello! Welcome!!!" },
    // { sender: "log", message: "here's a bunch of text. Hello! Welcome!!!" },
    // { sender: "samantha", message: "Hey, yo! what up" },
  ]);
  const [inputText, setInputText] = useState("");
  const [editorCode, setEditorCode] = useState(
    JSON.parse(localStorage.getItem("editorHistory") || "[{}]").slice(-1)[0]
      ?.code || defaultCode
  );

  // React.useEffect(() => {
  //   localStorage.setItem("editorHistory", "[]");
  // }, []);

  const chatEndRef = useRef(null);

  const playground = useRef(new PlaygroundAPI()).current;

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

  const lastEditorCode = React.useRef();
  lastEditorCode.current = editorCode;
  useEffect(() => {
    const handleBeforeUnload = () => {
      const history = JSON.parse(localStorage.getItem("editorHistory") || "[]");
      if ((history.slice(-1)[0] || [])?.code !== lastEditorCode.current) {
        history.push({ code: lastEditorCode.current, timestamp: Date.now() });
        localStorage.setItem("editorHistory", JSON.stringify(history));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const codeUpdated = lastRunCode !== editorCode;
  const runUserCode = () => {
    setMessages([]);
    if (!((localStorage.getItem("apiKey")?.length || 0) > 0)) {
      setEnterApiKey(true);
      return;
    }
    playground.reset();
    playground.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });
    playground.on("log", (log) => {
      setMessages((prev) => [...prev, { sender: "log", message: log }]);
    });
    setLastRunCode(editorCode);
    const history = JSON.parse(localStorage.getItem("editorHistory") || "[]");
    if ((history.slice(-1)[0] || [])?.code !== editorCode) {
      history.push({ code: editorCode, timestamp: Date.now() });
      localStorage.setItem("editorHistory", JSON.stringify(history));
    }
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

  const numberLogs = messages.filter((msg) => msg.sender === "log").length;
  const shownMessages = messages.filter(
    (msg) => (!showLogs && msg.sender !== "log") || showLogs
  );

  const [historyVisible, setHistoryVisible] = useState(false);
  const toggleHistory = () => setHistoryVisible(!historyVisible);

  return (
    <Layout
      title="Playground"
      description="Try out SocialAGI in the Playground"
    >
      <div className="App">
        <div className="containerTest">
          <div className="panel">
            <div className="editor-container">
              <div className="editor-plus-run">
                <div className="runBtnContainer">
                  <HistoryButton
                    visible={historyVisible}
                    toggleHistory={toggleHistory}
                  />
                  <button className={`runBtn`} onClick={runUserCode}>
                    <div className="clean-btn tocCollapsibleButton run-code-button-chevron">
                      {codeUpdated
                        ? lastRunCode?.length > 0
                          ? `Restart SocialAGI`
                          : "Run SocialAGI"
                        : lastRunCode?.length > 0
                        ? `Restart SocialAGI`
                        : "Run SocialAGI"}
                    </div>
                  </button>
                </div>
                <div className="ace-editor-div">
                  <HistoryTimeline
                    currentCode={editorCode}
                    visible={historyVisible}
                    updateEditorCode={setEditorCode}
                  />
                  <Editor
                    editorCode={editorCode}
                    handleEditorChange={handleEditorChange}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="panelDivider" />
          <div
            className="panel"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div className="settings">
              {numberLogs > 0 && (
                <button onClick={handleToggle} className="apiButton">
                  {showLogs
                    ? "Hide Logs"
                    : "Show Logs" + (numberLogs > 0 ? ` (${numberLogs})` : "")}
                </button>
              )}
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
                        className={
                          "message-heading" + (isUser ? "" : " active")
                        }
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
                  className="inter-font"
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
                  className={
                    "send-btn" + (inputText.length > 0 ? " active" : "")
                  }
                  size={26}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      <style global jsx>{`
        footer {
          display: none;
        }
      `}</style>
    </Layout>
  );
}

export default Playground;
