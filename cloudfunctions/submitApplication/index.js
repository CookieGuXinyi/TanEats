// 云函数：提交摊位申请
const cloud = require('wx-server-sdk')

cloud.init({env: cloud.DYNAMIC_CURRENT_ENV})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, shopName, businessHours, location, description, category, qrCodeUrl, licenseImages, applicantId, applicantPhone, applicantName } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 提交申请
  if (action === 'submit') {
    // 检查是否已有待审核的申请
    const existing = await db.collection('stall_applications').where({
      applicantId: applicantId,
      status: 'pending'
    }).get()
    
    if (existing.data.length > 0) {
      return { code: 400, message: '您已有一份待审核的申请，请耐心等待' }
    }
    
    // 创建申请记录
    const application = {
      shopName: shopName,
      businessHours: businessHours,
      location: location,
      description: description || '',
      category: category,
      qrCodeUrl: qrCodeUrl || '',
      licenseImages: licenseImages || [],
      applicantId: applicantId,
      applicantPhone: applicantPhone,
      applicantName: applicantName,
      openid: openid,
      status: 'pending',  // pending, approved, rejected
      submitTime: new Date(),
      reviewTime: null,
      reviewComment: ''
    }
    
    const result = await db.collection('stall_applications').add({
      data: application
    })
    
    return {
      code: 200,
      message: '申请已提交',
      data: { _id: result._id }
    }
  }
  
  // 查询申请状态（供摊主查看）
  if (action === 'getStatus') {
    const applications = await db.collection('stall_applications').where({
      applicantId: applicantId
    }).orderBy('submitTime', 'desc').get()
    
    return {
      code: 200,
      data: applications.data
    }
  }
  
  return { code: 400, message: '未知操作' }
}