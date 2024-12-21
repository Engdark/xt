const cheerio = require('cheerio');
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

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

    return {
      status: true,
      image: data.data.url
    };
  } catch (e) {
    return {
      status: false,
      message: e.message
    };
  }
}

const PAGE_ACCESS_TOKEN = 'EAAchMB49yMsBOxCDJvV5F8ZBSk9SofOw3EBbg16p1rm0i1n0qam3DJEl5ZAkPZAsBUbvjnexJZAhqaZCwmr3RjZByjVMlEJA3ODWzB2yt5QIjbZCJtHyGrt9SN088Q8ins8ZCJu91AUR8HSHNswGppk3ETcsX5rp3a2K1ziEoURzWG8hSxqx5DiGnfgOy6Nc68voLLHgscK8tpoA1sgPTgZDZD';

app.use(bodyParser.json());

async function downloadImage(imageUrl, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url: imageUrl,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function uploadImage(filePath) {
  const url = `https://graph.facebook.com/v21.0/me/message_attachments?access_token=${PAGE_ACCESS_TOKEN}`;
  const formData = new FormData();
  formData.append('filedata', fs.createReadStream(filePath));
  formData.append('message_type', 'image');
  const res = await axios.post(url, formData, {
    headers: formData.getHeaders()
  });
  return res.data.attachment_id;
}

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry;

  for (const entryItem of entry) {
    const messaging = entryItem.messaging;

    for (const message of messaging) {
      const senderId = message.sender.id;

      if (message.message && message.message.text) {
        const messageText = message.message.text;
        const result = await fetchImages(messageText);

        if (result.status) {
          const imagePath = path.join(__dirname, 'temp_image.jpg');
          await downloadImage(result.image, imagePath);
          const attachmentId = await uploadImage(imagePath);
          fs.unlinkSync(imagePath);
          sendMessageWithAttachment(senderId, attachmentId);
        } else {
          sendMessage(senderId, 'لم يتم العثور على صورة');
        }
      } else {
        sendMessage(senderId, 'أرسل لي نصاً للبحث عن صورة');
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

const sendMessageWithAttachment = (recipientId, attachmentId) => {
  axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'image',
        payload: {
          attachment_id: attachmentId
        }
      }
    }
  }).then(response => {
    console.log('Message sent successfully:', response.data);
  }).catch(error => {
    console.error('Error sending message:', error.response?.data || error.message);
  });
};

const sendMessage = (recipientId, text) => {
  axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    recipient: { id: recipientId },
    message: { text }
  }).then(response => {
    console.log('Message sent successfully:', response.data);
  }).catch(error => {
    console.error('Error sending message:', error.response?.data || error.message);
  });
};

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
