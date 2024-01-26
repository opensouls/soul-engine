import React from "react";
import "./historybutton.css";
import { FiRotateCw } from "react-icons/fi";

const HistoryButton = ({ visible, toggleHistory }) => {
  return (
    <div className="history">
      <button
        className={"history-button" + (visible ? " active" : "")}
        onClick={toggleHistory}
      >
        <FiRotateCw size={15} />
      </button>
    </div>
  );
};

const HistoryTimeline = ({ currentCode, visible, updateEditorCode }) => {
  const [history, setHistory] = React.useState([]);
  const [lastCode, setLastCode] = React.useState(currentCode);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  React.useEffect(() => {
    let fetchedHistory = JSON.parse(
      localStorage.getItem("editorHistory") || "[]"
    );
    fetchedHistory = fetchedHistory.sort((a, b) => -a.timestamp + b.timestamp);
    setHistory(fetchedHistory);
    setLastCode(currentCode);
    if (visible) {
      setActiveIndex(-1);
    }
  }, [visible]);
  return (
    <div className="history">
      <div className={`history-timeline ${visible ? "visible" : ""}`}>
        <div>
          <button
            className={
              "history-button-update" +
              (activeIndex === -1 ? " active history-active" : "")
            }
            onClick={() => {
              setActiveIndex(-1);
              updateEditorCode(lastCode);
            }}
          >
            Current Editor
          </button>
        </div>
        {history.map((item, index) => (
          <div key={index}>
            <button
              className={
                "history-button-update" +
                (activeIndex === index ? " active history-active" : "")
              }
              onClick={() => {
                setActiveIndex(index);
                updateEditorCode(item.code);
              }}
            >
              {new Date(item.timestamp).toLocaleString()}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export { HistoryButton, HistoryTimeline };
