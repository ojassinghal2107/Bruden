const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sendMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    const contact = await prisma.contact.create({
      data: { name, email, message },
    });

    res.status(201).json({ success: true, data: contact, message: 'Message received. Welcome to the den.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { sendMessage };
