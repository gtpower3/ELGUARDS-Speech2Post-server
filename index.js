const express = require("express");
const cors = require('cors');
const axios = require("axios");
const azureSdk = require("microsoft-cognitiveservices-speech-sdk");
const OpenAI = require("openai");
const multer = require("multer");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

require('@dotenvx/dotenvx').config()

const app = express();
app.use(express.json());
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

const SERVER_PORT = process.env.SERVER_PORT;
const AZURE_KEY = process.env.AZURE_KEY;
const AZURE_REGION = process.env.AZURE_REGION;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Multer setup to handle audio uploads
const upload = multer({ dest: "uploads/" });

// Function to convert audio to WAV format using ffmpeg
const convertToWav = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat("wav")
            .on("end", () => resolve(outputPath))
            .on("error", reject)
            .save(outputPath);
    });
};

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

async function optimizePostContent(content, contentLanguage) {
    try {
        // const completion = await openai.chat.completions.create({
        //     model: "gpt-4o-mini",
        //     messages: [
        //         { role: "system", content: "You are a social media manager who is an expert at posting content on official company accounts on Facebook, Twitter, Instagram and LinkedIn. You must bear in mind the constraints imposed by each social media platform such as max character limit, and also the Terms & Conditions and rules enforced by each platform. You will be given a prompt and you must optimize it to be more appealing and suitable to befit a big company social media post. If the prompt is in English then the response must be only in English but if the prompt is in Arabic then the response must be only in Arabic. You must also recommend the kind of image to accompany such a post. The response must be instantly readable as a JSON format (no string escapes except within the content attribute aka the string including the post content for each platform) and should be formatted exactly as follows: {facebook: {content: FACEBOOK_POST_STRING}, twitter: {content: TWITTER_POST_STRING}, instagram: {content: INSTAGRAM_CAPTION_STRING}, linkedin: {content: LINKEDIN_POST_STRING}, suggestedImageContent: SUGGESTED_IMAGE_STRING}" },
        //         {
        //             role: "user",
        //             content: content,
        //         },
        //     ],
        // });
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a social media manager expert. Respond in the same language as the input: English or Arabic. Optimize the prompt for Facebook, Twitter, Instagram, and LinkedIn, keeping platform rules in mind. Make sure the response does not include anything that may violate the customs and traditions of the cultures and religions of the Middle East & North Africa region.  Provide a JSON response formatted exactly as follows: {facebook: {content: FACEBOOK_POST_STRING}, twitter: {content: TWITTER_POST_STRING}, instagram: {content: INSTAGRAM_CAPTION_STRING}, linkedin: {content: LINKEDIN_POST_STRING}, suggestedImageContent: SUGGESTED_IMAGE_STRING}."
                },
                {
                    role: "user",
                    content: `Language: ${contentLanguage}. ${content}`
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
    const lang = req.query?.lang;
    // console.log("Optimizing:", content);
    res.json(await optimizePostContent(content, lang === "en" ? "English" : lang === "ar" ? "Arabic" : "English"));
    // setTimeout(() => {
    //     res.send("Done")
    // }, 10000);
});

// Endpoint to receive audio and transcribe it
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    const languageCode = req.query.lang;
    console.log("lang", languageCode)
    const audioFilePath = req.file.path;
    const wavFilePath = `uploads/${req.file.filename}.wav`;

    try {
        // Convert the audio file to WAV format
        await convertToWav(audioFilePath, wavFilePath);

        // Load the WAV file into an in-memory buffer
        const audioBuffer = fs.readFileSync(wavFilePath);

        // Configuring Azure Speech SDK with the converted WAV file
        const speechConfig = azureSdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
        // Set the recognition language dynamically
        speechConfig.speechRecognitionLanguage = languageCode; // 'en-US' for English, 'ar-SA' for Arabic (Saudi)
        const audioConfig = azureSdk.AudioConfig.fromWavFileInput(audioBuffer);
        const recognizer = new azureSdk.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizeOnceAsync(result => {
            console.log(result);
            if (result.reason === azureSdk.ResultReason.RecognizedSpeech) {
                // Send the transcription back to the frontend
                res.json({ transcription: result.text });
            } else {
                res.status(500).json({ error: "Failed to transcribe audio." });
            }

            // Clean up the uploaded files
            fs.unlinkSync(audioFilePath);
            fs.unlinkSync(wavFilePath);
        });
    } catch (error) {
        console.error("Error converting or transcribing audio:", error);
        res.status(500).json({ error: "Error processing audio file." });
    }
});

app.listen(SERVER_PORT, async () => {
    console.log("Starting server...");
    console.log(`Server is running on port ${SERVER_PORT}`);
});
