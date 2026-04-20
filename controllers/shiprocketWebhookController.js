import Order from '../models/Order.js'

// Handle Shiprocket fulfillment webhook
const handleShiprocketWebhook = async (req, res) => {
  try {
    // 🔐 TOKEN VERIFICATION - SECURITY CHECK
    const receivedToken = req.headers['x-api-key'];
    const expectedToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;

    if (!expectedToken || receivedToken !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized webhook request' });
    }

    // 📦 PARSE INCOMING JSON BODY
    const {
      awb,
      current_status,
      current_status_id,
      order_id,
      channel_order_id,
      channel,
      courier_name,
      current_timestamp,
      etd,
      shipment_status,
      shipment_status_id,
      scans
    } = req.body;

    // 📊 LOG ALL WEBHOOK EVENTS
    console.log(`[SHIPROCKET WEBHOOK] Order: ${channel_order_id} | Status: ${current_status} | AWB: ${awb} | Time: ${current_timestamp}`);

    // 🚫 HANDLE EDGE CASES
    // a) If channel_order_id is empty or test payload
    if (!channel_order_id || channel_order_id === 'enter your channel order id') {
      console.log(`[SHIPROCKET WEBHOOK] Test payload received - skipping DB update`);
      return res.status(200).json({ received: true });
    }

    // b) Return 200 immediately to prevent timeout
    res.status(200).json({ received: true });

    // 📝 PROCESS ORDER UPDATE ASYNCHRONOUSLY
    setImmediate(async () => {
      try {
        // 🔍 FIND ORDER BY OUR INTERNAL ORDER ID
        const order = await Order.findOne({ 
          $or: [
            { _id: channel_order_id },
            { orderId: channel_order_id },
            { 'razorpay.orderId': channel_order_id }
          ]
        });

        // c) If order not found in DB
        if (!order) {
          console.warn(`[SHIPROCKET WEBHOOK] Order not found in database: ${channel_order_id}`);
          return;
        }

        // 📊 MAP SHIPROCKET STATUS TO OUR STATUS
        let mappedStatus = current_status; // Default to raw status
        
        switch (current_status) {
          case 'Delivered':
            mappedStatus = 'delivered';
            break;
          case 'Out for Delivery':
            mappedStatus = 'out_for_delivery';
            break;
          case 'Pickup Scheduled':
            mappedStatus = 'pickup_scheduled';
            break;
          case 'In Transit':
            mappedStatus = 'in_transit';
            break;
          case 'RTO':
          case 'RTO Initiated':
            mappedStatus = 'return_initiated';
            break;
          case 'RTO Delivered':
            mappedStatus = 'returned';
            break;
          case 'Cancelled':
            mappedStatus = 'cancelled';
            break;
          default:
            mappedStatus = current_status.toLowerCase().replace(/\s+/g, '_');
            break;
        }

        // 📝 UPDATE ORDER FIELDS
        const updateData = {
          'shipmentStatus': current_status,
          'awbNumber': awb,
          'courierName': courier_name,
          'trackingUpdatedAt': current_timestamp ? new Date(current_timestamp) : new Date(),
          'trackingScans': scans ? JSON.stringify(scans) : null,
          'shiprocketOrderId': order_id,
          'shiprocketStatus': current_status,
          'shiprocketStatusId': current_status_id,
          'shiprocketShipmentStatus': shipment_status,
          'shiprocketShipmentStatusId': shipment_status_id,
          'updatedAt': new Date()
        };

        // 🚀 UPDATE ORDER STATUS
        if (mappedStatus !== order.status) {
          updateData.status = mappedStatus;
        }

        // 📦 SET DELIVERED TIMESTAMP IF DELIVERED
        if (current_status === 'Delivered') {
          updateData.deliveredAt = current_timestamp ? new Date(current_timestamp) : new Date();
        }

        // 💾 SAVE TO DATABASE
        await Order.updateOne(
          { _id: order._id },
          { $set: updateData }
        );

        console.log(`[SHIPROCKET WEBHOOK] Order ${channel_order_id} updated successfully: ${mappedStatus}`);

        // 📧 SEND EMAIL NOTIFICATION FOR KEY STATUSES
        if (current_status === 'Out for Delivery' || current_status === 'Delivered') {
          try {
            const { sendShippingUpdateEmail } = await import('../services/email.service.js');
            await sendShippingUpdateEmail({
              ...order.toObject(),
              ...updateData
            });
            console.log(`[SHIPROCKET WEBHOOK] Shipping update email sent for order ${channel_order_id}`);
          } catch (emailError) {
            console.error(`[SHIPROCKET WEBHOOK] Failed to send shipping update email:`, emailError);
          }
        }

      } catch (dbError) {
        console.error(`[SHIPROCKET WEBHOOK] Database update failed for order ${channel_order_id}:`, dbError);
      }
    });

  } catch (error) {
    // d) If body parsing fails
    if (error instanceof SyntaxError) {
      console.error(`[SHIPROCKET WEBHOOK] JSON parsing error:`, error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    console.error(`[SHIPROCKET WEBHOOK] Unexpected error:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export { handleShiprocketWebhook };
