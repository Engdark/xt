const cheerio = require('cheerio');
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

async function fetchImages(text) {
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(text)}`;
  try {
    const response = await axios.get(url);
    const body = response.data;

    const $ = cheerio.load(body);

    const images = [];
    $('img').each((index, element) => {
      const imageUrl = $(element).attr('src');
      if (imageUrl && imageUrl.startsWith('https://') && !imageUrl.startsWith('https://secure') && !imageUrl.includes('&h=')) {
        images.push(imageUrl);
      }
    });

    if (images.length > 0) {
      const randomIndex = Math.floor(Math.random() * images.length);
      return images[randomIndex];
    } else {
      console.log('No images found.');
      return null;
    }

  } catch (error) {
    console.error('Error while fetching data:', error);
    return null;
  }
}

const PAGE_ACCESS_TOKEN = 'EAAchMB49yMsBOxCDJvV5F8ZBSk9SofOw3EBbg16p1rm0i1n0qam3DJEl5ZAkPZAsBUbvjnexJZAhqaZCwmr3RjZByjVMlEJA3ODWzB2yt5QIjbZCJtHyGrt9SN088Q8ins8ZCJu91AUR8HSHNswGppk3ETcsX5rp3a2K1ziEoURzWG8hSxqx5DiGnfgOy6Nc68voLLHgscK8tpoA1sgPTgZDZD';

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
    const entry = req.body.entry;

    for (const entryItem of entry) {
        const messaging = entryItem.messaging;

        for (const message of messaging) {
            const senderId = message.sender.id;

            if (message.message && message.message.text) {
                const messageText = message.message.text;
                const imageUrl = await fetchImages(messageText);

                if (imageUrl) {
                    sendMessage(senderId, imageUrl);
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

const sendMessage = (recipientId, imageUrl) => {
    axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: 'image',
                payload: {
                    url: imageUrl,
                    is_reusable: true
                }
            }
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
