#!/usr/bin/env node

var os = require('os');
var path = require('path');
var fs = require('fs-extra');
var glob = require('glob');
var webpack = require('webpack');
var AdmZip = require('adm-zip');

var argv = require('yargs')
  .usage(
    'Usage: apig-pack -a.[libraryName1] restApiId1.stageName1.region -a.[libraryName2] restApiId2.stageName2.region\n' +
      'apig-pack ' +
      require('../package.json').version
  )
  .example('Usage: apig-pack -a.library abc123.dev.us-east-1')
  .example(
    'Usage: apig-pack -a.name1 restApiId1.stageName1.region -a.name2 restApiId2.restApiId2.stageName2 ...'
  )
  .array('a')
  .alias('a', 'api')
  .describe('a', 'API Gateway Parameters')
  .alias('d', 'directory')
  .describe('d', 'Directory to place output files')
  .default('d', 'lib')
  .alias('e', 'externals')
  .boolean('e')
  .describe('e', 'Indicates whether to use external dependencies or not.')
  .default('e', false)
  .alias('t', 'target')
  .describe('t', 'Specifies the webpack build target.')
  .default('t', 'node')
  .alias('r', 'retrie')
  .describe('r', 'Specifies the number of retries.')
  .default('r', '3')
  .demand('a')
  .help('h').argv;

Promise.all(
  // Retrieve SDKs
  Object.keys(argv.a).map(key => {
    var restApiId = argv.a[key].split('.')[0];
    var stageName = argv.a[key].split('.')[1];
    var region = argv.a[key].split('.')[2];

    var apigateway = new (require('aws-sdk/clients/apigateway'))({
      region
    });

    return apigateway
      .getSdk({
        restApiId,
        sdkType: 'javascript',
        stageName
      })
      .promise();
  })
)
  .then(data => {
    // Extract zips to build directory
    var keys = Object.keys(argv.a);
    return data.map((value, idx) => {
      return new Promise((resolve, reject) => {
        var dir = keys[idx];
        var zipDir = `${dir}.zip`;
        var tmpDir = path.join(os.tmpdir());

        fs.writeFileSync(path.join(tmpDir, zipDir), value.body);
        var zip = new AdmZip(path.join(tmpDir, zipDir));
        zip.extractAllTo(path.join(__dirname, '..', 'build', dir));
        var sigV4ClientPath = glob.sync(
          path.join(__dirname, '..', 'build', '**', 'sigV4Client.js')
        )[0];
        var simpleHttpClientPath = glob.sync(
          path.join(__dirname, '..', 'build', '**', 'simpleHttpClient.js')
        )[0];

        var sigV4Client = fs
          .readFileSync(sigV4ClientPath, 'utf-8')
          // Replace document reference since it is not available in node
          .replace(
            /var parser[\s\S]*?awsSigV4Client.endpoint;/g,
            'var parser = _url.parse(awsSigV4Client.endpoint);'
          )
          // body should be undefined to match RFC
          .replace(/body = '';/g, 'body = undefined;')
          // Add retry logic
          .replace(
            /var apiGateway = apiGateway \|\| {};/g,
            '$&\r\naxiosRetry(axios, { retries: ' + argv.r + ' });'
          );

        var simpleHttpClient = fs
          .readFileSync(simpleHttpClientPath, 'utf-8')
          .replace(/body = '';/g, 'body = undefined;')
          .replace(
            /var apiGateway = apiGateway \|\| {};/g,
            '$&\r\naxiosRetry(axios, { retries: ' + argv.r + ' });'
          );
        fs.writeFileSync(sigV4ClientPath, sigV4Client, { encoding: 'utf-8' });
        fs.writeFileSync(simpleHttpClientPath, simpleHttpClient, {
          encoding: 'utf-8'
        });
        resolve();
      });
    });
  })
  .then(() => {
    // Run webpack for every directory
    return new Promise((resolve, reject) => {
      var webpackConfig = require('../lib/webpack.config');
      if (argv.e) {
        webpackConfig = Object.assign({}, webpackConfig, {
          externals: {
            axios: 'axios',
            'crypto-js': 'crypto-js',
            url: 'url'
          }
        });
      }
      webpackConfig = Object.assign({}, webpackConfig, {
        module: {
          loaders: webpackConfig.module.loaders.map(loaderObj => {
            if (
              loaderObj.loader !==
              'imports-loader?apiGateway.core.utils=./utils,axios=axios'
            ) {
              return loaderObj;
            }
            loaderObj.loader += ',axiosRetry=axios-retry';
            return loaderObj;
          })
        }
      });
      webpackConfig = Object.assign({}, webpackConfig, {
        target: argv.t
      });

      webpack(webpackConfig, function(err, stats) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  })
  .then(() => {
    // Copy files and clean up build process
    glob
      .sync(path.join(__dirname, '..', 'dist', '**', 'apigClient.js'))
      .map((file, idx) =>
        fs.copySync(
          file,
          path.join(
            __dirname,
            '..',
            '..',
            '..',
            argv.d,
            Object.keys(argv.a)[idx],
            'apigClient.js'
          )
        )
      );
    fs.removeSync(path.join(path.join(__dirname, '..', 'build')));
    fs.removeSync(path.join(path.join(__dirname, '..', 'dist')));
  })
  .catch(e => console.log(e));
