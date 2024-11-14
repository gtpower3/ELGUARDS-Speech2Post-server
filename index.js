const express = require("express");
const cors = require('cors');
const axios = require("axios");
const azureSdk = require("microsoft-cognitiveservices-speech-sdk");
const OpenAI = require("openai");


require('@dotenvx/dotenvx').config()

const app = express();
app.use(express.json());

const SERVER_PORT = process.env.SERVER_PORT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const AZURE_API_REGION = process.env.AZURE_API_REGION;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(cors());

// const allowedOrigins = ['https://uaeevents2024.com', 'https://lms.elguards.com'];
// app.use(cors({
//     origin: (origin, callback) => {
//         if (allowedOrigins.includes(origin) || !origin) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     }
// }));

const startTranscription = () => {
    // const speechConfig = azureSdk.SpeechConfig.fromSubscription(AZURE_API_KEY, AZURE_API_REGION);
    // const audioConfig = azureSdk.AudioConfig.fromDefaultMicrophoneInput();
    // const recognizer = new azureSdk.SpeechRecognizer(speechConfig, audioConfig);

    // recognizer.recognizeOnceAsync(result => {
    //     if (result.reason === azureSdk.ResultReason.RecognizedSpeech) {
    //         console.log(`Recognized: ${result.text}`);
    //         // Process the result.text further, e.g., send it to ChatGPT
    //     } else {
    //         console.error("Speech not recognized.");
    //     }
    // });

};

async function optimizePostContent(content) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a social media manager who is an expert at posting content on official company accounts on Facebook, Twitter, Instagram and LinkedIn. You must bear in mind the constraints imposed by each social media platform such as max character limit, and also the Terms & Conditions and rules enforced by each platform. You will be given a prompt and you must optimize it to be more appealing and suitable to befit a big company social media post. You must also recommend the kind of image to accompany such a post. The response must be instantly readable as a JSON format (no string escapes except within the content attribute aka the string including the post content for each platform) and should be formatted exactly as follows: {facebook: {content: FACEBOOK_POST_STRING}, twitter: {content: TWITTER_POST_STRING}, instagram: {content: INSTAGRAM_CAPTION_STRING}, linkedin: {content: LINKEDIN_POST_STRING}, suggestedImageContent: SUGGESTED_IMAGE_STRING}" },
                {
                    role: "user",
                    content: content,
                },
            ],
        });
        const message = completion.choices[0].message
        console.log(message);
        return JSON.parse(message.content);
    } catch (error) {
        console.error(error);
        return '';
    }

}

app.get("/api/hello", (req, res) => {
    res.send("Hello World!");
});

app.post("/api/optimize", async (req, res) => {
    const content = req.body.content;
    // console.log("Optimizing:", content);
    res.json(await optimizePostContent(content));
    // setTimeout(() => {
    //     res.send("Done")
    // }, 10000);
});

app.listen(SERVER_PORT, async () => {
    console.log("Starting server...");
    console.log(`Server is running on port ${SERVER_PORT}`);
});
