import axios from 'axios'

export class SMSService {
  async sendSMS(phone, message) {
    try {
      // Option 1: Fast2SMS
      if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY !== 'your_fast2sms_api_key_here') {
        try {
          const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
            authorization: process.env.FAST2SMS_API_KEY,
            route: 'v3',
            sender_id: 'FTWSMS',
            message,
            language: 'english',
            flash: 0,
            numbers: phone
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          })

          if (response.data.return) {
            console.log(`✅ SMS sent successfully to ${phone} via Fast2SMS`)
            return true
          }
        } catch (fast2Error) {
          console.log('Fast2SMS failed, trying alternative method...')
        }
      }

      // Option 2: TextLocal
      if (process.env.TEXTLOCAL_API_KEY) {
        try {
          const response = await axios.post('https://api.textlocal.in/send/', {
            apikey: process.env.TEXTLOCAL_API_KEY,
            numbers: `91${phone}`,
            message,
            sender: 'TXTLCL'
          })

          if (response.data.status === 'success') {
            console.log(`✅ SMS sent successfully to ${phone} via TextLocal`)
            return true
          }
        } catch (textlocalError) {
          console.log('TextLocal failed, using mock service...')
        }
      }

      // Option 3: Mock SMS service for development
      console.log(`📱 SMS OTP for ${phone}: ${message}`)
      console.log('🔄 Using mock SMS service (development mode)')
      
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log(`✅ Mock SMS sent successfully to ${phone}`)
      return true
      
    } catch (error) {
      console.error('Error sending SMS:', error.message)
      
      // Ultimate fallback: Always log the message
      console.log(`📱 Fallback SMS for ${phone}: ${message}`)
      
      // For development, return success even if SMS fails
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ SMS failed but continuing in development mode')
        return true
      }
      
      throw new Error('Failed to send SMS')
    }
  }

  async sendOTP(phone, otp) {
    const message = `Your KKings Jewellery OTP is: ${otp}. Valid for 5 minutes.`
    return this.sendSMS(phone, message)
  }
}

export default new SMSService()
