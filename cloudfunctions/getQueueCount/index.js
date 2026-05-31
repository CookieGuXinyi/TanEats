const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { stallIds } = event
  
  try {
    // 查询所有待处理订单
    const orders = await db.collection('orders')
      .where({
        stallId: db.command.in(stallIds),
        // status: db.command.in(['pending', 'confirmed'])
        status: db.command.in(['pending']) // 只记制作中即可
      })
      .get()
    
    // 按店铺统计排队人数
    const queueMap = {}
    orders.data.forEach(order => {
      if (!queueMap[order.stallId]) {
        queueMap[order.stallId] = 0
      }
      queueMap[order.stallId]++
    })
    
    return {
      code: 200,
      data: queueMap
    }
    
  } catch (err) {
    console.error('获取排队人数失败', err)
    return {
      code: 500,
      message: err.message,
      data: {}
    }
  }
}