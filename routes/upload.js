'use strict';


if (process.env.NODE_ENV !== "production") {
  require("dotenv").load();
}

const msRest = require("@azure/ms-rest-js");
const Face = require("@azure/cognitiveservices-face");
const { uuid } = require("uuidv4");

const key = "f7434d19e370476da51b9405e73b47eb";
const endpoint = "https://fcetrial.cognitiveservices.azure.com/";

// <credentials>
const credentials = new msRest.ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } });
const client = new Face.FaceClient(credentials, endpoint);
// </credentials>

// <globals>
const image_base_url = "https://sakardesler.blob.core.windows.net/images/";
const source_image_base_url = "https://sakardesler.blob.core.windows.net/imagescheck/";
const person_group_id = uuid();

const express = require("express"),
  router = express.Router(),
  multer = require("multer"),
  inMemoryStorage = multer.memoryStorage(),
  uploadStrategy = multer({ storage: inMemoryStorage }).single("image"),
  azureStorage = require("azure-storage"),
  blobService = azureStorage.createBlobService(),
  getStream = require("into-stream"),
  containerName = "imagescheck";


var iden = 1;


const handleError = (err, res) => {
  res.status(500);
  res.render("error", { error: err });
};


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
// </helpers>

// <detect>
async function DetectFaceExtract() {
    console.log("========DETECT FACES========");
    console.log();

    // Create a list of images
	const image_file_names = [
		"detection1.jpg",    // single female with glasses
		// "detection2.jpg", // (optional: single man)
		// "detection3.jpg", // (optional: single male construction worker)
		// "detection4.jpg", // (optional: 3 people at cafe, 1 is blurred)
		"detection5.jpg",    // family, woman child man
		"detection6.jpg"     // elderly couple, male female
	];

// NOTE await does not work properly in for, forEach, and while loops. Use Array.map and Promise.all instead.
	await Promise.all (image_file_names.map (async function (image_file_name) {
        let detected_faces = await client.face.detectWithUrl(image_base_url + image_file_name,
			{
				returnFaceAttributes: ["Accessories","Age","Blur","Emotion","Exposure","FacialHair","Gender","Glasses","Hair","HeadPose","Makeup","Noise","Occlusion","Smile","QualityForRecognition"],
				// We specify detection model 1 because we are retrieving attributes.
				detectionModel: "detection_01",
                recognitionModel: "recognition_03"
			});
        console.log (detected_faces.length + " face(s) detected from image " + image_file_name + ".");
		console.log("Face attributes for face(s) in " + image_file_name + ":");

// Parse and print all attributes of each detected face.
		detected_faces.forEach (async function (face) {
			// Get the bounding box of the face
			console.log("Bounding box:\n  Left: " + face.faceRectangle.left + "\n  Top: " + face.faceRectangle.top + "\n  Width: " + face.faceRectangle.width + "\n  Height: " + face.faceRectangle.height);

			// Get the accessories of the face
			let accessories = face.faceAttributes.accessories.join();
			if (0 === accessories.length) {
				console.log ("No accessories detected.");
			}
			else {
				console.log ("Accessories: " + accessories);
			}

			// Get face other attributes
			console.log("Age: " + face.faceAttributes.age);
			console.log("Blur: " + face.faceAttributes.blur.blurLevel);

			// Get emotion on the face
			let emotions = "";
			let emotion_threshold = 0.0;
			if (face.faceAttributes.emotion.anger > emotion_threshold) { emotions += "anger, "; }
			if (face.faceAttributes.emotion.contempt > emotion_threshold) { emotions += "contempt, "; }
			if (face.faceAttributes.emotion.disgust > emotion_threshold) { emotions +=  "disgust, "; }
			if (face.faceAttributes.emotion.fear > emotion_threshold) { emotions +=  "fear, "; }
			if (face.faceAttributes.emotion.happiness > emotion_threshold) { emotions +=  "happiness, "; }
			if (face.faceAttributes.emotion.neutral > emotion_threshold) { emotions +=  "neutral, "; }
			if (face.faceAttributes.emotion.sadness > emotion_threshold) { emotions +=  "sadness, "; }
			if (face.faceAttributes.emotion.surprise > emotion_threshold) { emotions +=  "surprise, "; }
			if (emotions.length > 0) {
				console.log ("Emotions: " + emotions.slice (0, -2));
			}
			else {
				console.log ("No emotions detected.");
			}
			
			// Get more face attributes
			console.log("Exposure: " + face.faceAttributes.exposure.exposureLevel);
			if (face.faceAttributes.facialHair.moustache + face.faceAttributes.facialHair.beard + face.faceAttributes.facialHair.sideburns > 0) {
				console.log("FacialHair: Yes");
			}
			else {
				console.log("FacialHair: No");
			}
			console.log("Gender: " + face.faceAttributes.gender);
			console.log("Glasses: " + face.faceAttributes.glasses);

			// Get hair color
			var color = "";
			if (face.faceAttributes.hair.hairColor.length === 0) {
				if (face.faceAttributes.hair.invisible) { color = "Invisible"; } else { color = "Bald"; }
			}
			else {
				color = "Unknown";
				var highest_confidence = 0.0;
				face.faceAttributes.hair.hairColor.forEach (function (hair_color) {
					if (hair_color.confidence > highest_confidence) {
						highest_confidence = hair_color.confidence;
						color = hair_color.color;
					}
				});
			}
			console.log("Hair: " + color);

			// Get more attributes
			console.log("Head pose:");
			console.log("  Pitch: " + face.faceAttributes.headPose.pitch);
			console.log("  Roll: " + face.faceAttributes.headPose.roll);
			console.log("  Yaw: " + face.faceAttributes.headPose.yaw);
 
			console.log("Makeup: " + ((face.faceAttributes.makeup.eyeMakeup || face.faceAttributes.makeup.lipMakeup) ? "Yes" : "No"));
			console.log("Noise: " + face.faceAttributes.noise.noiseLevel);

			console.log("Occlusion:");
			console.log("  Eye occluded: " + (face.faceAttributes.occlusion.eyeOccluded ? "Yes" : "No"));
			console.log("  Forehead occluded: " + (face.faceAttributes.occlusion.foreheadOccluded ? "Yes" : "No"));
			console.log("  Mouth occluded: " + (face.faceAttributes.occlusion.mouthOccluded ? "Yes" : "No"));

			console.log("Smile: " + face.faceAttributes.smile);

			console.log("QualityForRecognition: " + face.faceAttributes.qualityForRecognition)
			console.log();
		});
	}));
}

async function DetectFaceRecognize(url) {
    let detected_faces = await client.face.detectWithUrl(url,
		{
			detectionModel: "detection_03",
			recognitionModel: "recognition_04",
            returnFaceAttributes: ["QualityForRecognition"]
		});
    return detected_faces.filter(face => face.faceAttributes.qualityForRecognition == 'high' || face.faceAttributes.qualityForRecognition == 'medium');
}
// </recognize>

// <find_similar>

let ok = false;

async function FindSimilar() {
    console.log("========FIND SIMILAR========");
    console.log();

	const source_image_file_name = "1.jpg";
    const target_image_file_names = [
		"1.jpg",
		"2.jpg",
		"3.jpg",
        "4.jpg",
		"5.jpg",
		"6.jpg",
        "7.jpg",
		"8.jpg",
		
	];

	let target_face_ids = (await Promise.all (target_image_file_names.map (async function (target_image_file_name) {
        // Detect faces from target image url.
        var faces = await DetectFaceRecognize(image_base_url + target_image_file_name);
		console.log(faces.length + " face(s) detected from image: " +  target_image_file_name + ".");
        return faces.map (function (face) { return face.faceId });;
	}))).flat();

    // Detect faces from source image url.
	let detected_faces = await DetectFaceRecognize(source_image_base_url + source_image_file_name);

    // Find a similar face(s) in the list of IDs. Comapring only the first in list for testing purposes.
    let results = await client.face.findSimilar(detected_faces[0].faceId, { faceIds : target_face_ids });
	results.every (function (result) {
		console.log("Faces from: " + source_image_file_name + " and ID: " + result.faceId + " are similar with confidence: " + result.confidence + ".");
        ok = result.confidence > 0.9;
    });
}
// </find_similar>



const getBlobName = (originalName) => {
  //   const identifier = Math.random().toString().replace(/0\./, ""); // remove "0." from start of string
  return '1.jpg';
};

router.post("/", uploadStrategy, (req, res) => {
  const blobName = getBlobName(req.file.originalname),stream = getStream(req.file.buffer), streamLength = req.file.buffer.length;
  blobService.createBlockBlobFromStream(
    containerName,
    blobName,
    stream,
    streamLength,
    async (err) => {
      if (err) {
        handleError(err);
        return;
      }

    await FindSimilar();
    if (ok){
      res.render("success", {
        message: "Image Check.",
      });
    } else {
        res.render("error", {
            message: "Image Not Check.",
        });
    }
    }
  );
});

module.exports = router;
