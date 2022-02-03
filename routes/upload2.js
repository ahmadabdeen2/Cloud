const { QueueClient } = require("@azure/storage-queue");
const uuidv1 = require("uuidv1");

if (process.env.NODE_ENV !== "production") {
    require("dotenv").load();
}
const express = require("express"),
    router = express.Router(),
    multer = require("multer"),
    inMemoryStorage = multer.memoryStorage(),
    uploadStrategy = multer({ storage: inMemoryStorage }).fields([
        { messagetxt: "messagetxt" },
        { name: 'name' }
    ]),
    azureStorage = require("azure-storage"),
    blobService = azureStorage.createBlobService(),
    getStream = require("into-stream"),
    containerName = "images",
    http = require("http");
const handleError = (err, res) => {
    res.status(500);
    res.render("error", { error: err });
};

const AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=sakardeser;AccountKey=a628iIIFFJL9OymcPzfBJPbdP8/zdChqqIvva0AJkwfK5jhZTmrA9eE90Gz+43KnyJP9GXS+H9hvFv9bQTSBiQ==;EndpointSuffix=core.windows.net'

// console.log(AZURE_STORAGE_CONNECTION_STRING);

let peekedMessages;

async function main(msg) {
    console.log("Azure Queue Storage client library v12 - JavaScript quickstart sample");

    // Create a unique name for the queue
    const queueName = "todoqueue" //+ uuidv1();

    console.log("\nCreating queue...");
    console.log("\t", queueName);

    // Instantiate a QueueClient which will be used to create and manipulate a queue
    const queueClient = new QueueClient(AZURE_STORAGE_CONNECTION_STRING, queueName);

    // Create the queue
    const createQueueResponse = await queueClient.create();
    console.log("Queue created, requestId:", createQueueResponse.requestId);

    console.log("\nAdding messages to the queue...");

    // Send several messages to the queue
    // await queueClient.sendMessage(msg);
    // await queueClient.sendMessage("Second message");
    const sendMessageResponse = await queueClient.sendMessage(msg);

    console.log("Messages added, requestId:", sendMessageResponse.requestId);

    console.log("\nPeek at the messages in the queue...");

    // Peek at messages in the queue
    peekedMessages = await queueClient.peekMessages({ numberOfMessages: 32 });

    for (i = 0; i < peekedMessages.peekedMessageItems.length - 1; i++) {
        // Display the peeked message
        console.log("\t", peekedMessages.peekedMessageItems[i].messageText);

    }
}





router.post("/", uploadStrategy, async(req, res) => {
    // console.log(req.body.messagetxt)
    // console.log(req.body.name)
    await main(req.body.name + ' : ' + req.body.messagetxt).then(() => res.redirect(`https://fa-kardesler.azurewebsites.net/api/HttpTrigger2?name=${req.body.name}:${req.body.messagetxt}`)).catch((ex) => console.log(ex.message));
    var x = peekedMessages;

});

module.exports = router;