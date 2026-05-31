// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { orderId, status } = event

  try {
    await db.collection('orders').doc(orderId).update({
      data: {
        status: status,
        updateTime: new Date()
      }
    })
    return { code: 200, message: '更新成功' }
  } catch (err) {
    console.error('更新订单失败', err)
    return { code: 500, message: err.message }
  }
}