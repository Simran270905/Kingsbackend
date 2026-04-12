import ContactMessage from '../models/ContactMessage.js';
import emailService from '../services/emailService.js';

// @desc    Create a new contact message
// @route   POST /api/contact
// @access  Public
export const createContactMessage = async (req, res) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;

    // Validation
    if (!fullName || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Phone validation (Indian mobile numbers)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number starting with 6-9'
      });
    }

    // Create new contact message
    const contactMessage = new ContactMessage({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.replace(/\s/g, ''),
      subject: subject.trim(),
      message: message.trim()
    });

    // Save to database
    const savedMessage = await contactMessage.save();

    // Send notification email to admin (optional)
    try {
      await emailService.sendEmail({
        to: process.env.ADMIN_EMAIL || 'support@kkingsjewellery.com',
        subject: `New Contact Message: ${subject}`,
        html: `
          <h2>New Contact Message Received</h2>
          <p><strong>From:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('en-IN')}</p>
          <hr>
          <p><small>This message was sent from the KKings Jewellery contact form</small></p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
      // Continue even if email fails - message is saved
    }

    // Send confirmation email to user (optional)
    try {
      await emailService.sendEmail({
        to: email,
        subject: 'Thank you for contacting KKings Jewellery',
        html: `
          <h2>Thank You for Contacting Us</h2>
          <p>Dear ${fullName},</p>
          <p>We have received your message and will get back to you shortly.</p>
          <p><strong>Your Message:</strong></p>
          <p>${message}</p>
          <p>We typically respond within 24 hours during business hours.</p>
          <br>
          <p>Best regards,<br>KKings Jewellery Team</p>
          <hr>
          <p><small>This is an automated message. Please do not reply to this email.</small></p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue even if email fails - message is saved
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
      data: {
        id: savedMessage._id,
        fullName: savedMessage.fullName,
        email: savedMessage.email,
        subject: savedMessage.subject,
        status: savedMessage.status,
        createdAt: savedMessage.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
};

// @desc    Get all contact messages (Admin)
// @route   GET /api/contact
// @access  Private (Admin)
export const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    // Get messages with pagination
    const messages = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-adminNotes');

    // Get total count for pagination
    const total = await ContactMessage.countDocuments(filter);

    // Get statistics
    const stats = await ContactMessage.getStats();

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalMessages: total,
          messagesPerPage: parseInt(limit)
        },
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
};

// @desc    Get single contact message (Admin)
// @route   GET /api/contact/:id
// @access  Private (Admin)
export const getContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.status(200).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Error fetching contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message'
    });
  }
};

// @desc    Update contact message status (Admin)
// @route   PUT /api/contact/:id/status
// @access  Private (Admin)
export const updateMessageStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be new, read, or replied'
      });
    }

    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    message.status = status;
    if (adminNotes) {
      message.adminNotes = adminNotes;
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: `Message marked as ${status}`,
      data: message
    });

  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message status'
    });
  }
};

// @desc    Delete contact message (Admin)
// @route   DELETE /api/contact/:id
// @access  Private (Admin)
export const deleteContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await ContactMessage.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
};
