const express = require('express');
const router = express.Router();
const { placeOrder, getAllOrders } = require('../controllers/orderController');

router.post('/', placeOrder);
router.get('/', getAllOrders);

module.exports = router;
