import React from 'react';
import { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  useNextSeoProps() {
    return {
      title: 'Soul Engine Docs',
      description: "Learn how to create AI souls",
      openGraph: {
        url: 'https://docs.souls.chat/',
        title: 'Soul Engine Docs',
        description: 'Learn how to create AI souls',
        image: {
          url: 'https://docs.souls.chat/images/os_forest.jpg',
          width: 1200,
          height: 686,
          alt: 'A forest of hidden souls',
          type: 'image/jpeg',
        },
      }
    }
  },
  nextThemes: {
    defaultTheme: "dark",
    forcedTheme: "dark"
  },
  darkMode: false, // this shows the button to toggle themes... does not set it
  logo: (
    <img src="/images/logo_horizontal.svg" alt="Open Souls" style={{ height: '24px' }} />
  ),
  project: {
    link: 'https://github.com/opensouls/souls',
  },
  chat: {
    link: 'https://discord.com/invite/opensouls',
  },
  docsRepositoryBase: 'https://github.com/opensouls/souls',
  footer: {
    text: 'OPEN SOULS - Soul Engine 2024',
  },
  editLink: {
    component: () => <></>,
  },
  feedback: {
    content: () => <></>,
  },
  sidebar: {
    autoCollapse: false,
    defaultMenuCollapseLevel: 2
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Soul Engine Docs" />
      <meta property="og:description" content="Learn how to create AI souls" />
      <meta property="og:image" content="/images/os_forest.jpg" />
      <link rel="icon" href="/icon.png" />
    </>
  )
};

export default config;
