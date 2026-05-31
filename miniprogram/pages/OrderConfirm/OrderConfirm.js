// pages/OrderConfirm/OrderConfirm.js
Page({
  data: {
    selectedItems: [],  // 从购物车传来的选中商品
    orderGroups: [],
    totalPrice: 0,
    totalQuantity: 0,
    pickupTime: '',
    remark: ''
  },

  onLoad() {
    // 获取从购物车传来的选中商品
    const app = getApp()
    const selectedItems = app.globalData?.selectedCartItems || []
    
    if (selectedItems.length === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    this.processSelectedItems(selectedItems)
  },

  processSelectedItems(selectedItems) {
    // 按店铺分组
    const groupMap = {}
    selectedItems.forEach(item => {
      if (!groupMap[item.stallId]) {
        groupMap[item.stallId] = {
          stallId: item.stallId,
          stallName: item.stallName,
          products: [],
          total: 0
        }
      }
      const productTotal = item.price * item.quantity
      groupMap[item.stallId].products.push({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        cartId: item.cartId
      })
      groupMap[item.stallId].total += productTotal
    })
    
    const orderGroups = Object.values(groupMap)
    const totalPrice = orderGroups.reduce((sum, g) => sum + g.total, 0)
    const totalQuantity = selectedItems.reduce((sum, i) => sum + i.quantity, 0)
    
    this.setData({ orderGroups, totalPrice, totalQuantity })
  },

  async loadCartData() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    
    wx.showLoading({ title: '加载中...' })
    
    try {
      const db = wx.cloud.database()
      const cartRes = await db.collection('cart').where({
        userId: userInfo._id
      }).get()
      
      if (cartRes.data.length === 0) {
        wx.showToast({ title: '购物车为空', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
      
      // 按店铺分组
      const groupMap = {}
      cartRes.data.forEach(item => {
        if (!groupMap[item.stallId]) {
          groupMap[item.stallId] = {
            stallId: item.stallId,
            stallName: item.stallName,
            products: [],
            total: 0
          }
        }
        const productTotal = item.price * item.quantity
        groupMap[item.stallId].products.push({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          cartId: item._id
        })
        groupMap[item.stallId].total += productTotal
      })
      
      const orderGroups = Object.values(groupMap)
      const totalPrice = orderGroups.reduce((sum, g) => sum + g.total, 0)
      const totalQuantity = cartRes.data.reduce((sum, i) => sum + i.quantity, 0)
      
      this.setData({ orderGroups, totalPrice, totalQuantity })
      wx.hideLoading()
      
    } catch (err) {
      wx.hideLoading()
      console.error('加载失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onPickupTimeChange(e) {
    this.setData({ pickupTime: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  async submitOrder() {
    if (!this.data.pickupTime) {
      wx.showToast({ title: '请选择取餐时间', icon: 'none' })
      return
    }
    
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    wx.showLoading({ title: '提交订单中...' })
    
    try {
      const db = wx.cloud.database()
      
      // 为每个店铺创建订单
      for (const group of this.data.orderGroups) {
        const orderNo = this.generateOrderNo()
        
        await db.collection('orders').add({
          data: {
            orderNo: orderNo,
            userId: userInfo._id,
            userName: userInfo.nickname || '用户',
            userPhone: userInfo.phone || '',
            stallId: group.stallId,
            stallName: group.stallName,
            items: group.products.map(p => ({
              productId: p.productId,
              productName: p.productName,
              price: p.price,
              quantity: p.quantity
            })),
            totalAmount: group.total,
            status: 'pending',
            pickupTime: this.data.pickupTime,
            remark: this.data.remark,
            createTime: new Date(),
            updateTime: new Date()
          }
        })
        
        // 清空购物车中该店铺的商品
        const cartIds = group.products.map(p => p.cartId)
        for (const cartId of cartIds) {
          await db.collection('cart').doc(cartId).remove()
        }
      }
      
      wx.hideLoading()
      wx.showModal({
        title: '提交成功',
        content: '订单已提交，请前往摊位凭订单号取餐',
        showCancel: false,
        success: () => {
          wx.redirectTo({ url: '/pages/Orders/Orders' })
        }
      })
      
    } catch (err) {
      wx.hideLoading()
      console.error('提交订单失败', err)
      wx.showToast({ title: '提交失败', icon: 'error' })
    }
  },

  generateOrderNo() {
    const now = new Date()
    const timestamp = now.getTime().toString().slice(-8)
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `TAN${timestamp}${random}`
  }
})