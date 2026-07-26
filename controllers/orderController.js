const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const placeOrder = async (req, res) => {
  try {
    const { name, email, phone, address, items, total } = req.body;

    if (!name || !email || !phone || !address || !items?.length || !total) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    const order = await prisma.order.create({
      data: {
        name,
        email,
        phone,
        address,
        items: JSON.stringify(items),
        total: parseFloat(total),
      },
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { placeOrder, getAllOrders };
