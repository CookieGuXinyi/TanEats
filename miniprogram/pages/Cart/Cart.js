// pages/Cart/Cart.js
Page({
  data: {
    cartGroups: [],
    totalPrice: 0,
    totalSelectedPrice: 0,
    canSettle: false,
    isLogin: false,
    allSelected: false 
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLogin) {
      this.loadCart()
    }
  },

  checkLoginStatus() {
    const isLogin = wx.getStorageSync('isLogin') || false
    this.setData({ isLogin })
  },

   goToLogin() {
    wx.navigateTo({
      url: '/pages/Register_User/Register_User'
    })
  },

  async loadCart() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    if (!userInfo._id) {
      this.setData({ cartGroups: [], totalPrice: 0, totalSelectedPrice: 0, canSettle: false, allSelected: false })
      return
    }
    
    wx.showLoading({ title: '加载中...' })
    
    try {
      const db = wx.cloud.database()
      const cartRes = await db.collection('cart').where({
        userId: userInfo._id
      }).get()
      
      if (cartRes.data.length === 0) {
        this.setData({ cartGroups: [], totalPrice: 0, totalSelectedPrice: 0, canSettle: false, allSelected: false })
        wx.hideLoading()
        return
      }
      
      // 获取所有店铺的营业状态
      const stallIds = [...new Set(cartRes.data.map(item => item.stallId))]
      const stallRes = await db.collection('stalls').where({
        _id: db.command.in(stallIds)
      }).get()
      
      const stallStatus = {}
      stallRes.data.forEach(stall => {
        stallStatus[stall._id] = this.checkIsOpen(stall.businessHours)
      })
      
      // 按店铺分组
      const groupMap = {}
      cartRes.data.forEach(item => {
        if (!groupMap[item.stallId]) {
          groupMap[item.stallId] = {
            stallId: item.stallId,
            stallName: item.stallName,
            isOpen: stallStatus[item.stallId] || false,
            selected: true,  // 店铺是否全选
            products: []
          }
        }
        groupMap[item.stallId].products.push({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          cartId: item._id,
          selected: item.selected !== undefined ? item.selected : true  // 商品是否选中
        })
      })
      
      const cartGroups = Object.values(groupMap)
      
      // 计算选中数量和总价
      let totalSelectedPrice = 0
      let totalQuantity = 0
      let allSelected = true
      let hasSelectedOpenProduct = false 
      
      cartGroups.forEach(group => {
        let groupAllSelected = true
        group.products.forEach(product => {
          if (product.selected) {
            totalSelectedPrice += product.price * product.quantity
            totalQuantity += product.quantity
            if (group.isOpen) {
              hasSelectedOpenProduct = true
            }
          } else {
            groupAllSelected = false
          }
        })
        group.selected = groupAllSelected && group.products.length > 0
        if (!groupAllSelected) allSelected = false
      })

      // 检查是否可以结算：只要有选中的营业中商品即可
      const canSettle = hasSelectedOpenProduct
      
      this.setData({ 
        cartGroups, 
        totalSelectedPrice,
        totalQuantity,
        canSettle,
        allSelected: allSelected && cartGroups.length > 0
      })
      wx.hideLoading()
      
    } catch (err) {
      wx.hideLoading()
      console.error('加载购物车失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  checkIsOpen(businessHours) {
    if (!businessHours) return false
    
    const timeMatch = businessHours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
    if (!timeMatch) return false
    
    const startHour = parseInt(timeMatch[1])
    const startMinute = parseInt(timeMatch[2])
    const endHour = parseInt(timeMatch[3])
    const endMinute = parseInt(timeMatch[4])
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTotal = currentHour * 60 + currentMinute
    const startTotal = startHour * 60 + startMinute
    const endTotal = endHour * 60 + endMinute
    
    return currentTotal >= startTotal && currentTotal <= endTotal
  },

  // 切换单个商品的选中状态
  async toggleProductSelect(e) {
    const stallId = e.currentTarget.dataset.stall
    const productId = e.currentTarget.dataset.product
    console.log('解析后切换选中状态的商品:', { stallId, productId })
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    if (!userInfo._id) return

    // 获取店铺营业状态
    const currentGroup = this.data.cartGroups.find(g => g.stallId === stallId)
    if (!currentGroup || !currentGroup.isOpen) {
      wx.showToast({ title: '店铺已打烊，暂不支持点餐', icon: 'none' })
      return
    }
    
    try {
      const db = wx.cloud.database()
      
      // 查找对应的购物车记录
      const cartRes = await db.collection('cart').where({
        userId: userInfo._id,
        stallId: stallId,
        productId: productId
      }).get()
      
      if (cartRes.data.length === 0) return
      
      const cartItem = cartRes.data[0]
      const newSelected = !cartItem.selected
      
      await db.collection('cart').doc(cartItem._id).update({
        data: { selected: newSelected, updateTime: new Date() }
      })
      
      this.loadCart()
      
    } catch (err) {
      console.error('切换选中失败', err)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  // 切换店铺全选
  async toggleShopSelect(e) {
    const stallId = e.currentTarget.dataset.stall
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    if (!userInfo._id) return

    // 获取店铺营业状态
    const currentGroup = this.data.cartGroups.find(g => g.stallId === stallId)
    if (!currentGroup || !currentGroup.isOpen) {
      wx.showToast({ title: '店铺已打烊，暂不支持点餐', icon: 'none' })
      return
    }
    
    try {
      const db = wx.cloud.database()
      
      // 查找该店铺所有商品
      const cartRes = await db.collection('cart').where({
        userId: userInfo._id,
        stallId: stallId
      }).get()
      if (cartRes.data.length === 0) return
      
      // 判断当前是否全选：检查该店铺所有商品的 selected 是否都为 true
      const currentGroup = this.data.cartGroups.find(g => g.stallId === stallId)
      const isCurrentlyAllSelected = currentGroup?.products.every(p => p.selected) || false
      const newSelected = !isCurrentlyAllSelected  // 取反
      
      console.log('店铺全选:', { stallId, isCurrentlyAllSelected, newSelected })
      
      // 批量更新
      for (const item of cartRes.data) {
        await db.collection('cart').doc(item._id).update({
          data: { selected: newSelected, updateTime: new Date() }
        })
      }
      
      this.loadCart()
      
    } catch (err) {
      console.error('切换店铺全选失败', err)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  // 全选/取消全选
  async toggleSelectAll() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    if (!userInfo._id) return
    
    const newAllSelected = !this.data.allSelected
    
    try {
      const db = wx.cloud.database()
      const cartRes = await db.collection('cart').where({
        userId: userInfo._id
      }).get()
      
      // 获取店铺营业状态
      const stallIds = [...new Set(cartRes.data.map(item => item.stallId))]
      const stallRes = await db.collection('stalls').where({
        _id: db.command.in(stallIds)
      }).get()
      
      // 构建营业状态映射
      const stallStatus = {}
      stallRes.data.forEach(stall => {
        stallStatus[stall._id] = this.checkIsOpen(stall.businessHours)
      })
      
      // 批量更新：只有营业中店铺的商品才能被全选选中
      for (const item of cartRes.data) {
        const isOpen = stallStatus[item.stallId] || false
        // 如果是要全选，只有营业中店铺的商品才设为 true
        // 如果是取消全选，所有商品都设为 false
        const shouldSelect = newAllSelected ? isOpen : false
        
        await db.collection('cart').doc(item._id).update({
          data: { selected: shouldSelect, updateTime: new Date() }
        })
      }
      
      this.loadCart()
      
    } catch (err) {
      console.error('全选失败', err)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  async updateQuantity(e) {
    const stallId = e.currentTarget.dataset.stall
    const productId = e.currentTarget.dataset.product
    let delta = e.currentTarget.dataset.delta
    delta = Number(delta)
    if (isNaN(delta)) return
    console.log('更新数量参数:', { stallId, productId, delta })

    const userInfo = wx.getStorageSync('userInfo') || {}
    if (!userInfo._id) return

    try {
      const db = wx.cloud.database()
      const cartRes = await db.collection('cart').where({
        userId: userInfo._id,
        stallId: stallId,
        productId: productId
      }).get()
      
      if (cartRes.data.length === 0) return
      
      const cartItem = cartRes.data[0]
      const newQuantity = cartItem.quantity + delta
      
      if (newQuantity <= 0) {
        await db.collection('cart').doc(cartItem._id).remove()
      } else {
        await db.collection('cart').doc(cartItem._id).update({
          data: { quantity: newQuantity, updateTime: new Date() }
        })
      }
      
      this.loadCart()
      
    } catch (err) {
      console.error('更新数量失败', err)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  async goToOrderConfirm() {
    if (!this.data.canSettle) {
      wx.showToast({ title: '请选择营业中的店铺', icon: 'none' })
      return
    }
    const userInfo = wx.getStorageSync('userInfo') || {}
    // 获取选中的商品
    const selectedItems = []
    for (const group of this.data.cartGroups) {
      for (const product of group.products) {
        if (product.selected && group.isOpen) {
          selectedItems.push({
            stallId: group.stallId,
            stallName: group.stallName,
            cartId: product.cartId,
            productId: product.productId,
            productName: product.productName,
            price: product.price,
            quantity: product.quantity
          })
        }
      }
    }
    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择要结算的商品', icon: 'none' })
      return
    }

    // 存入全局数据供订单确认页使用
    const app = getApp()
    app.globalData = app.globalData || {}
    app.globalData.selectedCartItems = selectedItems

    wx.navigateTo({
      url: '/pages/OrderConfirm/OrderConfirm'
    })
  },

  goToSearch() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})