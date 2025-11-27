const twilio = require('twilio');

require('dotenv').config();

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN
);

client.messages
	.create({
		to: '+17135848950',
		from: '+61468051846',
		body: 'Twilio upgraded test — this should deliver instantly.'
	})
	.then(m => console.log('Delivered:', m.sid))
	.catch(err => console.error(err));
