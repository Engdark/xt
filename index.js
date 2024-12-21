const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const PAGE_ACCESS_TOKEN = 'EAAchMB49yMsBOxCDJvV5F8ZBSk9SofOw3EBbg16p1rm0i1n0qam3DJEl5ZAkPZAsBUbvjnexJZAhqaZCwmr3RjZByjVMlEJA3ODWzB2yt5QIjbZCJtHyGrt9SN088Q8ins8ZCJu91AUR8HSHNswGppk3ETcsX5rp3a2K1ziEoURzWG8hSxqx5DiGnfgOy6Nc68voLLHgscK8tpoA1sgPTgZDZD';

async function sdxlAnime(prompt) {
    try {
        return await new Promise(async (resolve, reject) => {
            if (!prompt) return reject("Failed to read undefined prompt!");

            axios.post("https://aiimagegenerator.io/api/model/predict-peach", {
                prompt,
                key: "Soft-Anime",
                width: 512,
                height: 768,
                quantity: 1,
                size: "512x768"
            }).then(res => {
                const data = res.data;
                if (data.code !== 0) return reject(data.message);
                if (data.data.safetyState === "Soraa") return reject("NSFW image detected. Please try another prompt.");
                if (!data.data?.url) return reject("Failed to generate the image!");

                return resolve({
                    status: true,
                    image: data.data.url
                });
            }).catch(reject);
        });
    } catch (e) {
        return {
            status: false,
            message: e
        };
    }
}

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
    const entry = req.body.entry;

    entry.forEach(entryItem => {
        const messaging = entryItem.messaging;

        messaging.forEach(async message => {
            const senderId = message.sender.id;
            const messageText = message.message.text;

            const animeImage = await sdxlAnime(messageText);
            if (animeImage.status) {
                sendMessage(senderId, animeImage.image);
            } else {
                sendMessage(senderId, "Sorry, there was an error generating the image.");
            }
        });
    });

    res.status(200).send('EVENT_RECEIVED');
});

app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = '12345';

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Verification failed');
        }
    }
});

const sendMessage = (recipientId, message) => {
    axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: {
            id: recipientId
        },
        message: {
            text: message
        }
    }).then(response => {
        console.log('Message sent successfully:', response.data);
    }).catch(error => {
        console.error('Error sending message:', error);
    });
};

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
