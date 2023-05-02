import React from "react";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <title>Meet SAMANTHA AI</title>
      <meta property="og:title" content="Meet SAMANTHA AI" />
      <meta
        property="og:description"
        content="Share Your World, Discover Hers"
      />
      <meta property="og:url" content="https://meetsamantha.ai" />
      <meta
        property="og:image"
        content="http://meetsamantha.ai/meetSamanthaSocial.png"
      />
      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Meet SAMANTHA AI" />
      <meta
        name="twitter:description"
        content="Share Your World, Discover Hers"
      />
      <meta
        name="twitter:image"
        content="http://meetsamantha.ai/meetSamanthaSocial.png"
      />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
