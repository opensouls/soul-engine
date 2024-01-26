import { useHistory } from "@docusaurus/router";
import React from "react";

function ExampleCard({ title, subtitle, quote, link }) {
  const history = useHistory();

  return (
    // eslint-disable-next-line react/react-in-jsx-scope
    <button
      className="card"
      onClick={() => history.push(`/playground?load=${link}`)}
    >
      <h2 className="card-title">{title}</h2>
      <h3 className="card-subtitle">{subtitle}</h3>
      <p className="card-quote">{quote}</p>
    </button>
  );
}

export default ExampleCard;