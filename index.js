const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const PAGE_ACCESS_TOKEN = 'EAAchMB49yMsBOxCDJvV5F8ZBSk9SofOw3EBbg16p1rm0i1n0qam3DJEl5ZAkPZAsBUbvjnexJZAhqaZCwmr3RjZByjVMlEJA3ODWzB2yt5QIjbZCJtHyGrt9SN088Q8ins8ZCJu91AUR8HSHNswGppk3ETcsX5rp3a2K1ziEoURzWG8hSxqx5DiGnfgOy6Nc68voLLHgscK8tpoA1sgPTgZDZD';

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
    const entry = req.body.entry;

    entry.forEach(entryItem => {
        const messaging = entryItem.messaging;

        messaging.forEach(message => {
            if (message.message && message.message.text) { // التحقق من وجود نص في الرسالة
                const senderId = message.sender.id;
                sendImage(senderId);
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

const sendImage = (recipientId) => {
    const imageUrl = 'https://tinyurl.com/248palgo';

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
        console.error('Error sending image:', error.response ? error.response.data : error.message);
    });
};

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
