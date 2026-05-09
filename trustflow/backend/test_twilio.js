require("dotenv").config();
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;
const to = `+91 6299266546`; // Note the space
const cleanTo = to.replace(/\s+/g, "");
const toFormatted = `whatsapp:${cleanTo}`; 

async function test() {
  try {
    const msg = await client.messages.create({
      from: WHATSAPP_FROM,
      to: toFormatted,
      body: "Test message from TrustFlow backend script.",
    });
    console.log("Success! SID:", msg.sid);
  } catch (e) {
    console.error("WhatsApp send error:", e.message);
  }
}

test();
