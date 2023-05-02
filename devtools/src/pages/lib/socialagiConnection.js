import React, { useRef, useEffect } from "react";

const SOCIALAGI_PORT = process.env.SOCIALAGI_PORT || 5001;
const SOCIALAGI_SERVER = `http://localhost:${SOCIALAGI_PORT}`;

function tellSocialAGI(message) {
  return fetch(`${SOCIALAGI_SERVER}/tell`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
}

export function useSocialAGI({ messageHandler, thoughtHandler }) {
  const registered = useRef(false);
  useEffect(() => {
    if (!registered.current) {
      registered.current = true;
      const messagesSource = new EventSource(
        `${SOCIALAGI_SERVER}/listenMessages`
      );
      const thoughtsSource = new EventSource(
        `${SOCIALAGI_SERVER}/listenThoughts`
      );
      messagesSource.addEventListener("message", ({ data: message }) => {
        messageHandler(message);
      });
      thoughtsSource.addEventListener("message", ({ data: thought }) => {
        thoughtHandler(thought);
      });
    }
  }, []);
  return tellSocialAGI;
}
