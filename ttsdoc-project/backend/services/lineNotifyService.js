const axios = require('axios');

const sendLineNotify = async (groupId, message) => {
  try {
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: groupId,
      messages: [{ type: 'text', text: message }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_ACCESS_TOKEN}` // เก็บใน .env
      }
    });
  } catch (err) {
    console.error('LINE Notify Error:', err.response?.data || err.message);
  }
};

module.exports = { sendLineNotify };
