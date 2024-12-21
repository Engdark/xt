const translate = require('google-translate-api-x');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const PAGE_ACCESS_TOKEN = 'EAAchMB49yMsBOxCDJvV5F8ZBSk9SofOw3EBbg16p1rm0i1n0qam3DJEl5ZAkPZAsBUbvjnexJZAhqaZCwmr3RjZByjVMlEJA3ODWzB2yt5QIjbZCJtHyGrt9SN088Q8ins8ZCJu91AUR8HSHNswGppk3ETcsX5rp3a2K1ziEoURzWG8hSxqx5DiGnfgOy6Nc68voLLHgscK8tpoA1sgPTgZDZD';

async function generateImage(prompt) {
  try {
    const translation = await translate(prompt, { to: 'en' });
    const translatedPrompt = translation.text;

    const requestData = {
      prompt: translatedPrompt,
      negativePrompt: "",
      key: "Drawn-Anime",
      width: 512,
      height: 512,
      quantity: 1,
      size: "512x512"
    };

    const apiURL = "https://aiimagegenerator.io/api/model/predict-peach";

    const options = {
      method: 'POST',
      url: apiURL,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "platform": "PC",
        "product": "AI_IMAGE_GENERATOR",
        "locale": "en-US"
      },
      data: requestData
    };

    const response = await axios(options);
    const data = response.data;

    if (data.code === 0) {
      return data.data.url;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
    const entry = req.body.entry;

    for (const entryItem of entry) {
        const messaging = entryItem.messaging;
        
        for (const message of messaging) {
            const senderId = message.sender.id;
            const messageText = message.message.text;
            
            const imageUrl = await generateImage(messageText);
            
            if (imageUrl) {
                sendImage(senderId, imageUrl);
            } else {
                sendMessage(senderId, "Sorry, I couldn't generate the image.");
            }
        }
    }

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

const sendImage = (recipientId, imageUrl) => {
    axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl,
                    is_reusable: true
                }
            }
        }
    }).then(response => {
        console.log('Image sent successfully:', response.data);
    }).catch(error => {
        console.error('Error sending image:', error);
    });
};

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
