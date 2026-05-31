// pages/OrderDetail/OrderDetail.js
Page({
  data: {
    orderId: '',
    order: null
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ orderId: id })
      this.loadOrderDetail()
    }
  },

  async loadOrderDetail() {
    wx.showLoading({ title: '加载中...' })
    
    try {
      const db = wx.cloud.database()
      const res = await db.collection('orders').doc(this.data.orderId).get()
      
      const order = res.data
      order.statusText = this.getStatusText(order.status)
      order.statusDesc = this.getStatusDesc(order.status)
      order.createTimeFormatted = this.formatTime(order.createTime)
      order.totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0)
      
      this.setData({ order })
      wx.hideLoading()
      
    } catch (err) {
      wx.hideLoading()
      console.error('加载失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  getStatusText(status) {
    const map = {
      'pending': '制作中',
      'confirmed': '待取餐',
      // 'delivering': '配送中',
      'completed': '已完成',
      'cancelled': '已取消'
    }
    return map[status] || status
  },

  getStatusDesc(status) {
    const map = {
      'pending': '订单已提交，请凭订单号前往摊位取餐',
      'confirmed': '摊主已接单，正在备餐中',
      'delivering': '餐品正在配送中',
      'completed': '订单已完成，感谢您的支持',
      'cancelled': '订单已取消'
    }
    return map[status] || ''
  },

  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  }
})