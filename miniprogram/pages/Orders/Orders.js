// pages/Orders/Orders.js
Page({
  data: {
    currentTab: 'all',
    orders: [],
    loading: false
  },

  onShow() {
    this.loadOrders()
  },

  async loadOrders() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    if (!userInfo._id) {
      this.setData({ orders: [] })
      return
    }
    
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const where = { userId: userInfo._id }
      
      if (this.data.currentTab !== 'all') {
        where.status = this.data.currentTab === 'pending' ? 'pending' : 'completed'
      }
      
      const res = await db.collection('orders')
        .where(where)
        .orderBy('createTime', 'desc')
        .get()
      
      const orders = res.data.map(item => ({
        ...item,
        statusText: this.getStatusText(item.status),
        totalQuantity: item.items.reduce((sum, i) => sum + i.quantity, 0)
      }))
      
      this.setData({ orders, loading: false })
      
    } catch (err) {
      console.error('加载订单失败', err)
      this.setData({ loading: false })
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

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab }, () => {
      this.loadOrders()
    })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/OrderDetail/OrderDetail?id=${id}`
    })
  },

  goToDiscover() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})