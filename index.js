const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

async function fetchImages(prompt) {
  try {
    if (!prompt) throw new Error("Failed to read undefined prompt!");
    const res = await axios.post("https://aiimagegenerator.io/api/model/predict-peach", {
      prompt,
      key: "Soft-Anime",
      width: 512,
      height: 768,
      quantity: 1,
      size: "512x768"
    });
    const data = res.data;
    if (data.code !== 0) throw new Error(data.message);
    if (data.data.safetyState === "Soraa") throw new Error("NSFW image detected. Please try another prompt.");
    if (!data.data?.url) throw new Error("Failed to generate the image!");
    const imageBuffer = await axios.get(data.data.url, { responseType: 'arraybuffer' });
    return { status: true, image: imageBuffer.data };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

const PAGE_ACCESS_TOKEN = 'EAAchMB49yMsBOxCDJvV5F8ZBSk9SofOw3EBbg16p1rm0i1n0qam3DJEl5ZAkPZAsBUbvjnexJZAhqaZCwmr3RjZByjVMlEJA3ODWzB2yt5QIjbZCJtHyGrt9SN088Q8ins8ZCJu91AUR8HSHNswGppk3ETcsX5rp3a2K1ziEoURzWG8hSxqx5DiGnfgOy6Nc68voLLHgscK8tpoA1sgPTgZDZD';

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry || [];
  for (const entryItem of entry) {
    const messaging = entryItem.messaging || [];
    for (const message of messaging) {
      const senderId = message.sender?.id;
      if (senderId) {
        if (message.message?.text) {
          const imageResponse = await fetchImages(message.message.text);
          if (imageResponse.status) {
            sendMessage(senderId, imageResponse.image, true);
          } else {
            sendMessage(senderId, 'لم يتم العثور على صورة مناسبة.');
          }
        } else {
          sendMessage(senderId, 'الرجاء إرسال نص للحصول على صورة.');
        }
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
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

const sendMessage = (recipientId, messageContent, isImage = false) => {
  const message = isImage
    ? {
        attachment: {
          type: 'image',
          payload: {
            url: `data:image/png;base64,${Buffer.from(messageContent).toString('base64')}`,
            is_reusable: true
          }
        }
      }
    : { text: messageContent };
  axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    recipient: { id: recipientId },
    message
  }).catch(console.error);
};

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
