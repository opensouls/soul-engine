import React, { useState, useEffect, useRef } from "react";
import Editor from "../components/editor";
import PlaygroundAPI from "../components/playgroundapi";
import { IoIosSend } from "react-icons/io";
import Layout from "@theme/Layout";
import { useHistory } from "react-router-dom";
import BrowserOnly from "@docusaurus/BrowserOnly";

import * as socialagi from "socialagi";
import * as next from "socialagi/next";
import * as socialagiMemory from "@socialagi/memory";
import * as commonTags from "common-tags";

import "./playground.css";
import ApiKeyPopup from "../components/apikeypopup";
import { HistoryButton, HistoryTimeline } from "../components/historybutton";

const defaultCode = `
// Import a few important pieces from the socialagi library
// check out https://www.socialagi.dev/ for further detail
import { Action, CortexStep, CortexScheduler } from "socialagi";
import playground from "playground";

const samanthaReplies = async (signal, newMemory, lastStep) => {
  let step = lastStep;
  step = step.withMemory([newMemory]);
  const shouts = await step.next(Action.EXTERNAL_DIALOG, {
    action: "shouts in all caps",
  });
  playground.addMessage({
    sender: "Samantha",
    message: shouts.value,
  });
  return shouts;
};
const samanthaRepliesConfig = {
  name: "SamanthaReplies",
  process: samanthaReplies,
};
const initialMemories = [
  {
    role: "system",
    content: "<Context>You are modeling the mind of Samantha</Context>",
  },
];
let firstStep = new CortexStep("Samantha");
firstStep = firstStep.withMemory(initialMemories);
const cortex = new CortexScheduler(firstStep);
cortex.register(samanthaRepliesConfig);

// add initial context messages
setTimeout(() => {
  playground.addMessage({
    sender: "Playground",
    message: "In this example, Samantha is shouts in reply to every message",
  });
  playground.addMessage({
    sender: "Playground",
    message:
      "Try exploring how using the verb 'shouting' changes Samantha's personality",
  });
  playground.log("Playground initialized");
}, 1);

playground.on("userMessage", async (message) => {
  cortex.dispatch("SamanthaReplies", {
    role: "user",
    content: message,
  });
});
`.trim();

const WarningMessage = () => {
  return (
    <div className="warning-message">
      Your browser window is too small for the playground.
    </div>
  );
};

const BrowserPlayground = () => {
  const [isTooSmall, setIsTooSmall] = useState(
    window.matchMedia("(max-width: 768px)").matches
  );

  useEffect(() => {
    const handleResize = () => {
      setIsTooSmall(window.matchMedia("(max-width: 768px)").matches);
    };

    window.addEventListener("resize", handleResize);

    // Clean up function
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const load = params.get("load");
    if (!load) {
      return;
    }
    fetch(`example-code/${load}.js`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((fileContent) => {
        if (fileContent.startsWith("#!/bin/playground")) {
          const trimFirstLine = (str) => str.split("\n").slice(1).join("\n");
          setEditorCode(trimFirstLine(fileContent));
        }
      })
      .catch();
  }, []);

  const chatEndRef = useRef(null);

  const [playground, setPlayground] = React.useState(new PlaygroundAPI());
  useEffect(() => {
    const addMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };
    const addLog = (log) => {
      setMessages((prev) => [...prev, { sender: "log", message: log }]);
    };
    playground.on("message", addMessage);
    playground.on("log", addLog);
    return () => {
      playground.reset();
    };
  }, [playground]);

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
  const saveEditorHistory = () => {
    const history = JSON.parse(localStorage.getItem("editorHistory") || "[]");
    if ((history.slice(-1)[0] || [])?.code !== lastEditorCode.current) {
      history.push({ code: lastEditorCode.current, timestamp: Date.now() });
      localStorage.setItem("editorHistory", JSON.stringify(history));
    }
  };
  useEffect(() => {
    window.addEventListener("beforeunload", saveEditorHistory);

    return () => {
      window.removeEventListener("beforeunload", saveEditorHistory);
    };
  }, []);

  const history = useHistory();
  React.useEffect(() => history.listen(saveEditorHistory), [history]);
  const [showSendMessage, setShowSendMessage] = React.useState(false);

  const codeUpdated = lastRunCode !== editorCode;
  const runUserCode = () => {
    setMessages([]);
    if (!((localStorage.getItem("apiKey")?.length || 0) > 0)) {
      setEnterApiKey(true);
      return;
    }
    const newPlayground = new PlaygroundAPI();
    setPlayground(newPlayground);
    setLastRunCode(editorCode);
    const history = JSON.parse(localStorage.getItem("editorHistory") || "[]");
    if ((history.slice(-1)[0] || [])?.code !== editorCode) {
      history.push({ code: editorCode, timestamp: Date.now() });
      localStorage.setItem("editorHistory", JSON.stringify(history));
    }
    const exposedAPI = {
      addMessage: (message) => {
        newPlayground.addMessage(message);
      },
      log: (log) => {
        newPlayground.log(log);
      },
      on: (eventName, fn) => {
        newPlayground.on(eventName, fn);
      },
    };

    const importMap = {
      socialagi: socialagi,
      "socialagi/next": next,
      "@socialagi/memory": socialagiMemory,
      "common-tags": commonTags,
      playground: exposedAPI,
    };
    let processedCode = editorCode;
    const importRegexPattern =
      /import\s+({[^}]*}|[\w\d_]+)?\s*from\s*['"]([^'"]*)['"]/g;
    processedCode = processedCode.replace(
      importRegexPattern,
      (match, importNames, libraryName) => {
        return `const ${importNames} = importMap['${libraryName}']`;
      }
    );
    if (
      processedCode.includes('playground.on("userMessage"') ||
      processedCode.includes("playground.on('userMessage'") ||
      processedCode.includes("playground.on(`userMessage`")
    ) {
      setShowSendMessage(true);
    } else {
      setShowSendMessage(false);
    }

    try {
      window.process = {
        env: {
          OPENAI_API_KEY: localStorage.getItem("apiKey"),
          DANGEROUSLY_ALLOW_OPENAI_BROWSER: true,
        },
      };
      const func = new Function("importMap", "console", processedCode);
      func(importMap, console);
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
      {isTooSmall ? (
        <WarningMessage />
      ) : (
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
                      : "Show Logs" +
                        (numberLogs > 0 ? ` (${numberLogs})` : "")}
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
                      <div
                        className={
                          "message-container-log" +
                          (!showSendMessage ? " log-container-bright" : "")
                        }
                      >
                        {msg.message}
                      </div>
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
                        style={{
                          marginTop: headingIsSameAsParent ? -12 : null,
                        }}
                      >
                        {msg.message}
                      </div>
                    </p>
                  );
                })}
              </div>
              {showSendMessage && (
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
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        footer {
          display: none;
        }
      `}</style>
    </Layout>
  );
};

function Playground() {
  return <BrowserOnly>{BrowserPlayground}</BrowserOnly>;
}

export default Playground;
