const os = require("os");
const path = require("path");
const fs = require("fs-extra");
const glob = require("glob");
const webpack = require("webpack");
const AdmZip = require("adm-zip");

const argv = require("yargs")
  .usage(
    "Usage: apig-pack -a.[libraryName1] restApiId1.stageName1.region -a.[libraryName2] restApiId2.stageName2.region\n" +
      "apig-pack " +
      require("../package.json").version
  )
  .example("Usage: apig-pack -a.library abc123.dev.us-east-1")
  .example(
    "Usage: apig-pack -a.name1 restApiId1.stageName1.region -a.name2 restApiId2.restApiId2.stageName2 ..."
  )
  .array("a")
  .alias("a", "api")
  .describe("a", "API Gateway Parameters")
  .alias("d", "directory")
  .describe("d", "Directory to place output files")
  .default("d", "lib")
  .demand("a")
  .help("h").argv;

Promise.all(
  // Retrieve SDKs
  Object.keys(argv.a).map(key => {
    const restApiId = argv.a[key].split(".")[0];
    const stageName = argv.a[key].split(".")[1];
    const region = argv.a[key].split(".")[2];

    const apigateway = new (require("aws-sdk/clients/apigateway"))({
      region
    });

    return apigateway
      .getSdk({
        restApiId,
        sdkType: "javascript",
        stageName
      })
      .promise();
  })
)
  .then(data => {
    // Extract zips to build directory
    const keys = Object.keys(argv.a);
    return data.map((value, idx) => {
      const dir = keys[idx];
      const zipDir = `${dir}.zip`;
      const tmpDir = path.join(os.tmpdir());

      fs.writeFileSync(path.join(tmpDir, zipDir), value.body);
      const zip = new AdmZip(path.join(tmpDir, zipDir));
      zip.extractAllTo(path.join(__dirname, "..", "build", dir));
      return Promise.resolve();
    });
  })
  .then(() => {
    // Run webpack for every directory
    return new Promise((resolve, reject) => {
      webpack(require("../lib/webpack.config"), function(err, stats) {
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
      .sync("./dist/**/apigClient.js")
      .map((file, idx) =>
        fs.copySync(
          file,
          path.join(
            __dirname,
            "..",
            argv.d,
            Object.keys(argv.a)[idx],
            "apigClient.js"
          )
        )
      );
    fs.removeSync(path.join(path.join(__dirname, "..", "build")));
    fs.removeSync(path.join(path.join(__dirname, "..", "dist")));
  })
  .catch(e => console.log(e));
