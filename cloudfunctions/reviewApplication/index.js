const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { applicationId, action, rejectReason } = event
  
  try {
    // 获取申请详情
    const appRes = await db.collection('stall_applications').doc(applicationId).get()
    const application = appRes.data
    
    if (action === 'approve') {
      // 1. 更新申请状态
      await db.collection('stall_applications').doc(applicationId).update({
        data: {
          status: 'approved',
          reviewTime: new Date(),
          reviewComment: '审核通过，欢迎入驻！'
        }
      })
      
      // 2. 创建店铺
      await db.collection('stalls').add({
        data: {
          shopName: application.shopName,
          category: application.category,
          businessHours: application.businessHours,
          location: application.location,
          description: application.description || '',
          qrCodeUrl: application.qrCodeUrl || '',
          licenseImages: application.licenseImages || [],
          applicantId: application.applicantId,
          status: 'active',
          rating: 0,
          reviewCount: 0,
          createTime: new Date(),
        }
      })
      
      return { code: 200, message: '审核通过' }
      
    } else if (action === 'reject') {
      await db.collection('stall_applications').doc(applicationId).update({
        data: {
          status: 'rejected',
          reviewTime: new Date(),
          reviewComment: rejectReason || '不符合入驻条件'
        }
      })
      
      return { code: 200, message: '已拒绝' }
    }
    
  } catch (err) {
    console.error(err)
    return { code: 500, message: err.message }
  }
}