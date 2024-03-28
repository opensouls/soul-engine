// A JavaScript function that returns an object.
// `context` is provided by Docusaurus. Example: siteConfig can be accessed from context.
// `opts` is the user-defined options.
async function myPlugin(context, opts) {
  console.warn("ignoring @xenova/transformers in webpack build")
  return {
    // A compulsory field used as the namespace for directories to cache
    // the intermediate data for each plugin.
    // If you're writing your own local plugin, you will want it to
    // be unique in order not to potentially conflict with imported plugins.
    // A good way will be to add your own project name within.
    name: "docusaurus-webpack",

    configureWebpack(config, isServer, utils) {
      return {
        externals: {
          "@xenova/transformers": "empty",
        },
      };
    },
  };
}

module.exports = myPlugin;