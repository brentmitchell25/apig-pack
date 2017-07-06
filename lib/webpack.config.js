const glob = require("glob");
const webpack = require("webpack");
const path = require("path");
const _ = require("lodash");
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
  entry: _.flatten(
    glob
      .sync(path.join(__dirname, "..", "build", "*"))
      .map(directory => glob.sync(path.join(directory, "**", "*.js")))
  )
    .filter(m => !m.includes("axios") && !m.includes("rollups"))
    .map(filename => {
      const entry = {};
      entry[filename] = filename;
      return entry;
    })
    .reduce((finalObject, entry) => Object.assign(finalObject, entry), {}),
  output: {
    path: path.join(__dirname, "..", "dist"),
    filename: "[name]",
    libraryTarget: "commonjs2"
  },
  target: "node",
  module: {
    loaders: [
      {
        test: /sigV4Client.js$/,
        loader: "exports-loader?apiGateway.core.sigV4ClientFactory"
      },
      {
        test: /apiGatewayClient.js$/,
        loader: "exports-loader?apiGateway.core.apiGatewayClientFactory"
      },
      {
        test: /apiGatewayCore\/utils.js$/,
        loader: "exports-loader?apiGateway.core.utils"
      },
      {
        test: /simpleHttpClient.js$/,
        loader: "exports-loader?apiGateway.core.simpleHttpClientFactory"
      },
      {
        test: /url-template.js$/,
        loader: "exports-loader?uritemplate"
      },
      {
        test: /apigClient.js$/,
        loader: "exports-loader?apigClientFactory"
      },
      {
        test: /apiGatewayClient.js$/,
        loader: `imports-loader?apiGateway.core.simpleHttpClientFactory=./simpleHttpClient,apiGateway.core.utils=./utils`
      },
      {
        test: /sigV4Client.js|simpleHttpClient.js$/,
        loader: `imports-loader?apiGateway.core.utils=./utils,axios=axios`
      },
      {
        test: /apiGatewayClient.js$/,
        loader: `imports-loader?apiGateway.core.sigV4ClientFactory=./sigV4Client`
      },
      {
        test: /sigV4Client.js$/,
        loader: `imports-loader?_url=url`
      },
      {
        test: /apigClient.js$/,
        loader:
          "imports-loader?apiGateway.core.apiGatewayClientFactory=./lib/apiGatewayCore/apiGatewayClient,apiGateway.core.sigV4Client=./lib/apiGatewayCore/sigV4Client,apiGateway.core.simpleHttpClientFactory=./lib/apiGatewayCore/simpleHttpClient,apiGateway.core.utils=./lib/apiGatewayCore/utils.js,uritemplate=./lib/url-template/url-template"
      },
      {
        test: /enc-base64.js|hmac.js|sigV4Client.js$/,
        loader: "imports-loader?CryptoJS=crypto-js"
      }
    ]
  }
};
