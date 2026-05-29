const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { stallId } = event
  
  // 添加日志，确认执行到这里
  console.log('收到的 stallId:', stallId)
  
  try {
    // 查询该店铺的所有评论
    const reviewsRes = await db.collection('reviews').where({
      shopIds: stallId
    }).get()
    
    console.log('找到评论数:', reviewsRes.data.length)
    
    const reviews = reviewsRes.data
    
    if (reviews.length === 0) {
      return { code: 200, message: '暂无评论，评分不变' }
    }
    
    // 计算平均评分
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const avgRating = Math.round((totalRating / reviews.length) * 10) / 10
    
    console.log('平均评分:', avgRating)
    
    // 更新 stalls 表
    await db.collection('stalls').doc(stallId).update({
      data: {
        rating: avgRating,
        reviewCount: reviews.length,
        updateTime: new Date()
      }
    })
    
    return {
      code: 200,
      message: '评分更新成功',
      data: { rating: avgRating, reviewCount: reviews.length }
    }
    
  } catch (err) {
    console.error('更新评分失败', err)
    return { code: 500, message: err.message }
  }
}