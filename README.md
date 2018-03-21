# Overview
A simple CLI to package up one or more API Gateway SDKs using webpack.

# Installing
```
yarn add -D apig-pack
```

# Usage
```
./node_modules/apig-pack/bin/apig-pack.js -a [libraryName1].restApiId1.stageName1.region \
-a [libraryName2].restApiId2.stageName2.region ...
```
Note: The library name is an arbitrary name used to place the compiled file.

To use with React Native, it must be built with the web target and enable external modules
in webpack build. In addition to the example above, add the code below to the command:

```
... -t web
```

# Example
Add script to pacakge.json:
```
"pack:dev": "apig-pack -a apig.abcd1122.dev.us-east-1 -d js/lib",
```

# Use the SDK in your project

To initialize the most basic form of the SDK:

```
var apigClient = require("./lib/libraryName/apigClient.js").newClient();
```

Calls to an API take the form outlined below. Each API call returns a promise, that invokes either a success and failure callback

```
var params = {
    //This is where any header, path, or querystring request params go. The key is the parameter named as defined in the API
    param0: '',
    param1: ''
};
var body = {
    //This is where you define the body of the request
};
var additionalParams = {
    //If there are any unmodeled query parameters or headers that need to be sent with the request you can add them here
    headers: {
        param0: '',
        param1: ''
    },
    queryParams: {
        param0: '',
        param1: ''
    }
};

apigClient.methodName(params, body, additionalParams) // e.g. apigClient.userGet or apigClient.userPost
    .then(function(result){
        //This is where you would put a success callback
    }).catch( function(result){
        //This is where you would put an error callback
    });
```

# Using AWS IAM for authorization
To initialize the SDK with AWS Credentials use the code below. Note, if you use credentials all requests to the API will be signed. This means you will have to set the appropiate CORS accept-* headers for each request.

```
var apigClient = require("./lib/libraryName/apigClient.js").newClient({
    accessKey: 'ACCESS_KEY',
    secretKey: 'SECRET_KEY',
    sessionToken: 'SESSION_TOKEN', //OPTIONAL: If you are using temporary credentials you must include the session token
    region: 'eu-west-1' // OPTIONAL: The region where the API is deployed, by default this parameter is set to us-east-1
});
```

# Using API Keys
To use an API Key with the client SDK you can pass the key as a parameter to the Factory object. Note, if you use an apiKey it will be attached as the header 'x-api-key' to all requests to the API will be signed. This means you will have to set the appropiate CORS accept-* headers for each request.

```
var apigClient = require("./lib/libraryName/apigClient.js").newClient({
    apiKey: 'API_KEY'
});
```



