const express = require("express");
const app = express();
const port = 3000;
const AWS = require("aws-sdk");
const fs = require("fs");
var bodyParser = require("body-parser");

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

const ACCESS_KEY_ID = "";
const SECRET_KEY = "";

var sqs = new AWS.SQS();

let parms = {
  region: "us-east-1",
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_KEY,
};
var sqs = new AWS.SQS(parms);

const s3Client = new AWS.S3(parms);

const queueUrl = "";
function loop() {
  sqs.receiveMessage(
    {
      QueueUrl: queueUrl,
    },
    function (err, data) {
      console.log("Message Received From Queue", data);
      if (err) {
        console.log("Error while getting message from Queue", err.stack);
      } else if (data.Messages && data.Messages.length > 0) {
        let message = data.Messages[0];
        let bodyJson = JSON.parse(message.Body);
        console.log("MESSAGE_BODY of Message Received From Queue", bodyJson);
        let msg = null;
        if (bodyJson.Message != undefined && bodyJson.Message.startsWith("{")) {
          msg = JSON.parse(bodyJson.Message);

          let key = msg.Records[0].s3.object.key;
          let size = msg.Records[0].s3.object.size;
          let eventName = msg.Records[0].eventName;
          let bucketName = msg.Records[0].s3.bucket.name;

          console.log("OBJECT_KEY Received From Queue: ", key);
          console.log("OBJECT_KEY_SIZE Received From Queue: ", size);
          console.log("OBJECT_KEY Received belongs to bucket: ", bucketName);

          let params = {
            Bucket: bucketName,
            Key: key,
          };

          s3Client.headObject(params, function (err, data) {
            console.log(params);
            console.log(data);
            let actualFileName = data["actualfilename"];
            console.log(actualFileName);

            var file = require("fs").createWriteStream("./download/" + key);
            s3Client.getObject(params).createReadStream().pipe(file);
          });
        }

        var receiptHandle = message.ReceiptHandle;
        sqs.deleteMessage(
          {
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle,
          },
          function (err, data) {
            // message deleted
            if (err) {
              console.log(
                "Error while deleting message from AWS SQS",
                err.stack
              );
            } else {
              console.log("Message deleted from AWS SQS ", data);
            }
          }
        );
      }
    }
  );
}
setInterval(loop, 20000);
