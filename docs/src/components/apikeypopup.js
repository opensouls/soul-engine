import React, { useState } from "react";
import "./ApiKeyPopup.css";

function ApiKeyPopup({ showPopupOverride, resetShowPopupOverride }) {
  const [showPopup, setShowPopup] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const handleChange = (event) => {
    setApiKey(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem("apiKey", apiKey);
    setShowPopup(false);
  };

  React.useEffect(() => {
    setApiKey(localStorage.getItem("apiKey"));
  }, []);

  const handleClick = () => {
    setShowPopup(true);
    resetShowPopupOverride();
  };

  React.useEffect(() => {
    setShowPopup(showPopupOverride);
  }, [showPopupOverride]);

  return (
    <div className="ApiKeyPopup">
      <button onClick={handleClick} className="apiButton">
        API Key
      </button>

      {showPopup && (
        <div className="overlay">
          <div className="popup">
            <form onSubmit={handleSubmit}>
              <label>
                Add OpenAI API Key to Browser:
                <input type="text" value={apiKey} onChange={handleChange} />
              </label>
              <input type="submit" value="Save" />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiKeyPopup;
