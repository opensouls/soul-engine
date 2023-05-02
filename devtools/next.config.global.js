const path = require("path");

module.exports = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      include: [path.resolve(__dirname, "src")],
      use: {
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-react"],
        },
      },
    });

    return config;
  },
};
