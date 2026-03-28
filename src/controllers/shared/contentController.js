import Content from '../../models/Content.js'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'

// GET content by type
export const getContent = catchAsync(async (req, res) => {
  const { type } = req.params
  
  const content = await Content.findOne({ type })
  
  if (!content) {
    return sendSuccess(res, { type, data: null })
  }
  
  sendSuccess(res, { type, data: content.data || null })
})

// UPDATE or CREATE content (saves entire req.body as doc.data)
export const saveContent = catchAsync(async (req, res) => {
  const { type } = req.params
  const payload = req.body
  
  if (!type) return sendError(res, 'Content type is required', 400)
  
  let doc = await Content.findOne({ type })
  
  if (!doc) {
    doc = new Content({ type, data: payload, isPublished: true })
  } else {
    doc.data = payload
  }
  
  await doc.save()
  
  sendSuccess(res, { type, data: doc.data }, 200, 'Content saved successfully')
})

// GET all content pages
export const getAllContent = catchAsync(async (req, res) => {
  const content = await Content.find().sort({ createdAt: -1 })
  
  sendSuccess(res, content)
})

// DELETE content
export const deleteContent = catchAsync(async (req, res) => {
  const { type } = req.params
  
  const result = await Content.deleteOne({ type })
  
  if (result.deletedCount === 0) {
    return sendError(res, 'Content not found', 404)
  }
  
  sendSuccess(res, null, 200, 'Content deleted successfully')
})
