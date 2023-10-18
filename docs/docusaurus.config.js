// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const path = require("path");
const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");
const webpack = require('webpack');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "SocialAGI",
  tagline: "The library for creating AI Souls",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://socialagi.dev",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "opensouls", // Usually your GitHub org/user name.
  projectName: "SocialAGI", // Usually your repo name.

  onBrokenLinks: "ignore",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: ["docusaurus-webpack"],

  clientModules: [path.resolve(__dirname, "src/plugins/vercelAnalytics.js")],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars.js"),
        },
        blog: {
          showReadingTime: true,
          blogSidebarTitle: "All posts",
          blogSidebarCount: "ALL",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: "img/socialagi-social-card.jpg",
      colorMode: {
        defaultMode: "dark",
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: "SocialAGI",
        logo: {
          alt: "SocialAGI Logo",
          src: "img/socialagi.png",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "docsSidebar",
            position: "left",
            label: "Docs",
          },
          {
            to: "examples",
            label: "Examples",
            position: "left",
          },
          {
            to: "playground",
            label: "Playground",
            position: "left",
          },
          { to: "/blog", label: "Blog", position: "left" },
          {
            href: "https://github.com/opensouls/SocialAGI",
            label: "⭐ Star us on GitHub",
            position: "right",
          },
          {
            href: "https://discord.gg/FCPcCUbw3p",
            label: "Discord",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Resources",
            items: [
              {
                label: "Docs",
                to: "/docs",
              },
              {
                to: "examples",
                label: "Examples",
              },
              {
                to: "playground",
                label: "Playground",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Discord",
                href: "https://discord.gg/FCPcCUbw3p",
              },
              {
                label: "Twitter",
                href: "https://twitter.com/SocialAGI",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Blog",
                to: "/blog",
              },
              {
                label: "GitHub",
                href: "https://github.com/opensouls/SocialAGI",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Open Souls Co.`,
      },
    }),
};

module.exports = config;
