import React from "react";
import Layout from "@theme/Layout";
import { useHistory } from "@docusaurus/router";

import "./examples.css";

function Card({ title, subtitle, quote, link }) {
  const history = useHistory();

  return (
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

const Examples = () => {
  const data = [
    {
      title: "🚀 ElonAI Mars Interview",
      subtitle: "Do you have what it takes to go on the Mars mission?",
      quote:
        '"Wow. I guess we\'re just hiring anyone off the road now..." —ElonAI',
      link: "elonAI",
    },
    {
      title: "The 👼 Angel & 👿 Devil",
      subtitle:
        "Explore a multi-soul conversation where each soul decides when to participate",
      quote: '"Oh spare me your sanctimonious lectures, Angel" —Devil',
      link: "angelAndDevil",
    },
    {
      title: "🎯 Goal-driven agentic dialog",
      subtitle:
        "Persista needs to learn 3 things from you and won't take no for an answer",
      quote:
        "\"Now that you've told me your name, what's your favorite color?\" —Persista",
      link: "persista",
    },
    {
      title: "🤔 Speaking is a choice",
      subtitle:
        "Samantha is given the option on whether she wants to speak with you",
      quote: '"Samantha has exited the conversation"',
      link: "samanthaConsidersSpeaking",
    },
    {
      title: "😡 Don't anger Samantha",
      subtitle: "Samantha is given the option to shout if she's angry",
      quote: '"I DON\'T WANT TO ENGAGE IN A POINTLESS CONVERSATION" —Samantha',
      link: "samanthaEscalates",
    },
    {
      title: "🗣️ Samantha shouts",
      subtitle:
        "Explore how a soul that can only shout changes their personality",
      quote: '"I COULD BE THAT FRIEND FOR YOU" —Samantha',
      link: "samanthaShouts",
    },
  ];

  return (
    <Layout title="Demos" description="Try out the SocialAGI Demos">
      <div className="app">
        <div className="title">
          <h className="heading">SocialAGI Examples</h>
          <p className="subheading">
            Learn important SocialAGI concepts with runnable examples!
          </p>
        </div>
        {data.map((item, index) => (
          <Card key={index} {...item} />
        ))}
      </div>
    </Layout>
  );
};

export default Examples;
