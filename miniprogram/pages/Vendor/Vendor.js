// pages/Vendor/Vendor.js
Page({
  data: {
    shop: null,
    isOpen: false,
    products: [],
    
    // 编辑店铺弹窗
    showShopModal: false,
    editShop: {},
    
    // 商品弹窗
    showProductModal: false,
    isEditProduct: false,
    productForm: {
      name: '',
      price: '',
      description: '',
      imageUrl: ''
    },
    editingProductId: null,

    // 店铺评论
    shopReviews: [],
    showReviews: false,

    // 订单
    orders: [],
    pendingOrders: [],
    confirmedOrders: [],
    completedOrders: [],
    currentOrderTab: 'pending',
    loadingOrders: false
  },

  onShow() {
    this.loadShopAndProducts()
    if (this.data.shop) {
      this.loadOrders()
    }
  },

  // 加载店铺和商品数据
  async loadShopAndProducts() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const applicantId = userInfo._id
    
    if (!applicantId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    wx.showLoading({ title: '加载中...' })

    try {
      const db = wx.cloud.database()
      
      // 查询当前用户的店铺
      const shopRes = await db.collection('stalls').where({
        applicantId: applicantId,
        status: 'active'
      }).get()
      
      if (shopRes.data.length === 0) {
        wx.hideLoading()
        this.setData({ shop: null, products: [] })
        return
      }
      
      const shop = shopRes.data[0]
      const isOpen = this.checkIsOpen(shop.businessHours)
      this.setData({ shop, isOpen })
      this.loadOrders()
      
      // 查询该店铺的商品
      const productRes = await db.collection('products').where({
        shopId: shop._id
      }).orderBy('createTime', 'desc').get()
      
      this.setData({ products: productRes.data })
      wx.hideLoading()
      
      this.loadShopReviews()
    } catch (err) {
      wx.hideLoading()
      console.error('加载失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 加载店铺相关评论
  async loadShopReviews() {
    const { shop } = this.data
    if (!shop) return

    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 查询包含当前店铺的评论（shopIds 数组中包含当前店铺ID）
      const res = await db.collection('reviews')
        .where({
          shopIds: _.in([shop._id])
        })
        .orderBy('createTime', 'desc')
        .limit(20)
        .get()
      
      const reviews = res.data.map(item => ({
        ...item,
        time: this.formatTime(item.createTime)
      }))
      
      this.setData({ shopReviews: reviews })
      console.log(`共查询到${reviews.length}条评论`)
      console.log(`${reviews}`)
      console.log(`${this.shopReviews}`)
    } catch (err) {
      console.error('加载评论失败', err)
    }
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    return `${month}月${day}日 ${hour}:${minute}`
  },

  // 判断当前是否在营业时间内（支持星期 + 时间段）
  checkIsOpen(businessHours) {
    if (!businessHours) return false
    
    // 解析营业时间，格式如："周一 17:00-23:00"
    // 支持格式：周一 17:00-23:00 或 周一至周五 17:00-23:00
    
    const weekMap = {
      '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7,
      '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7
    }
    
    const now = new Date()
    const currentWeekday = now.getDay() || 7  // 周日 getDay() 返回 0，转为 7
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTotal = currentHour * 60 + currentMinute
    
    // 处理时间段格式 "周一 17:00-23:00"
    const timeMatch = businessHours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
    if (!timeMatch) return false
    
    const startTotal = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2])
    const endTotal = parseInt(timeMatch[3]) * 60 + parseInt(timeMatch[4])
    
    // 处理星期几部分
    const weekPart = businessHours.split(' ')[0]  // 获取 "周一" 或 "周一至周五"
    
    // 单个星期，如 "周一"
    if (weekMap[weekPart]) {
      const targetWeekday = weekMap[weekPart]
      if (currentWeekday !== targetWeekday) return false
    }
    
    // 处理星期范围，如 "周一至周五"
    const weekRangeMatch = weekPart.match(/(周[一二三四五六日])至(周[一二三四五六日])/)
    if (weekRangeMatch) {
      const startWeek = weekMap[weekRangeMatch[1]]
      const endWeek = weekMap[weekRangeMatch[2]]
      if (currentWeekday < startWeek || currentWeekday > endWeek) return false
    }
    
    // 判断时间是否在范围内
    return currentTotal >= startTotal && currentTotal <= endTotal
  },

  // 切换评价区域显示/隐藏
  toggleReviews() {
    this.setData({
      showReviews: !this.data.showReviews
    });
  },

  // 加载订单
  async loadOrders() {
    const { shop } = this.data
    if (!shop) return

    this.setData({ loadingOrders: true })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('orders').where({
        stallId: shop._id
      }).orderBy('createTime', 'desc').get()

      const orders = res.data
      const pendingOrders = orders.filter(o => o.status === 'pending')      // 制作中
      const confirmedOrders = orders.filter(o => o.status === 'confirmed')  // 待取餐
      const completedOrders = orders.filter(o => o.status === 'completed')  // 已完成

      this.setData({
        orders,
        pendingOrders,
        confirmedOrders,
        completedOrders,
        loadingOrders: false
      })
    } catch (err) {
      console.error('加载订单失败', err)
      this.setData({ loadingOrders: false })
    }
  },

  // 刷新订单
  refreshOrders() {
    wx.showToast({ title: '刷新中', icon: 'loading' })
    this.loadOrders()
    setTimeout(() => {
      wx.hideToast()
    }, 500)
  },

  // 切换订单标签页
  switchOrderTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentOrderTab: tab })
  },

  // 制作完成（待取餐）
  async confirmOrder(e) {
    const orderId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认制作完成',
      content: '确认该订单已制作完成，通知顾客取餐吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })

          try {
            const res = await wx.cloud.callFunction({
              name: 'updateOrderStatus',
              data: {
                orderId: orderId,
                status: 'confirmed'
              }
            })

            wx.hideLoading()

            if (res.result.code === 200) {
              wx.showToast({ title: '已通知取餐', icon: 'success' })
              this.loadOrders()
            } else {
              wx.showToast({ title: res.result.message, icon: 'error' })
            }
          } catch (err) {
            wx.hideLoading()
            console.error('更新订单失败', err)
            wx.showToast({ title: '操作失败', icon: 'error' })
          }
        }
      }
    })
  },

  // 完成订单（确认取餐）
  async completeOrder(e) {
    const orderId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认取餐',
      content: '确认顾客已取餐吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })

          try {
            const res = await wx.cloud.callFunction({
              name: 'updateOrderStatus',
              data: {
                orderId: orderId,
                status: 'completed'
              }
            })

            wx.hideLoading()
            if (res.result.code === 200) {
              wx.showToast({ title: '已完成', icon: 'success' })
              this.loadOrders()  // 刷新订单列表
            } else {
              wx.showToast({ title: res.result.message, icon: 'error' })
            }
          } catch (err) {
            wx.hideLoading()
            console.error('更新订单失败', err)
            wx.showToast({ title: '操作失败', icon: 'error' })
          }
        }
      }
    })
  },

  // ========== 店铺信息编辑 ==========
  editShopInfo() {
    const { shop } = this.data
    this.setData({
      showShopModal: true,
      editShop: {
        shopName: shop.shopName,
        businessHours: shop.businessHours,
        location: shop.location,
        description: shop.description
      }
    })
  },

  onEditShopName(e) {
    this.setData({ 'editShop.shopName': e.detail.value })
  },
  onEditBusinessHours(e) {
    this.setData({ 'editShop.businessHours': e.detail.value })
  },
  onEditLocation(e) {
    this.setData({ 'editShop.location': e.detail.value })
  },
  onEditDescription(e) {
    this.setData({ 'editShop.description': e.detail.value })
  },

  async saveShopInfo() {
    const { shop, editShop } = this.data
    
    wx.showLoading({ title: '保存中...' })
    
    try {
      const db = wx.cloud.database()
      await db.collection('stalls').doc(shop._id).update({
        data: {
          shopName: editShop.shopName,
          businessHours: editShop.businessHours,
          location: editShop.location,
          description: editShop.description
        }
      })
      
      this.setData({
        'shop.shopName': editShop.shopName,
        'shop.businessHours': editShop.businessHours,
        'shop.location': editShop.location,
        'shop.description': editShop.description,
        showShopModal: false
      })
      
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  closeShopModal() {
    this.setData({ showShopModal: false })
  },

  // ========== 商品管理 ==========
  addProduct() {
    this.setData({
      showProductModal: true,
      isEditProduct: false,
      editingProductId: null,
      productForm: {
        name: '',
        price: '',
        description: '',
        imageUrl: ''
      }
    })
  },

  editProduct(e) {
    const id = e.currentTarget.dataset.id
    const product = this.data.products.find(p => p._id === id)
    
    if (product) {
      this.setData({
        showProductModal: true,
        isEditProduct: true,
        editingProductId: id,
        productForm: {
          name: product.name,
          price: product.price.toString(),
          description: product.description || '',
          imageUrl: product.imageUrl || ''
        }
      })
    }
  },

  onProductName(e) {
    this.setData({ 'productForm.name': e.detail.value })
  },
  onProductPrice(e) {
    this.setData({ 'productForm.price': e.detail.value })
  },
  onProductDesc(e) {
    this.setData({ 'productForm.description': e.detail.value })
  },

  async uploadProductImage() {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })
        
        const cloudPath = `products/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.png`
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: (uploadRes) => {
            that.setData({ 'productForm.imageUrl': uploadRes.fileID })
            wx.hideLoading()
            wx.showToast({ title: '上传成功', icon: 'success' })
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('上传失败', err)
            wx.showToast({ title: '上传失败', icon: 'error' })
          }
        })
      }
    })
  },

  async saveProduct() {
    const { productForm, isEditProduct, editingProductId, shop } = this.data
    
    if (!productForm.name) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    if (!productForm.price || isNaN(productForm.price)) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    
    try {
      const db = wx.cloud.database()
      
      if (isEditProduct) {
        // 更新商品
        await db.collection('products').doc(editingProductId).update({
          data: {
            name: productForm.name,
            price: parseFloat(productForm.price),
            description: productForm.description,
            imageUrl: productForm.imageUrl
          }
        })
      } else {
        // 新增商品
        await db.collection('products').add({
          data: {
            shopId: shop._id,
            name: productForm.name,
            price: parseFloat(productForm.price),
            description: productForm.description,
            imageUrl: productForm.imageUrl || '',
            isAvailable: true,
            salesCount: 0,
            createTime: new Date()
          }
        })
      }
      
      this.setData({ showProductModal: false })
      wx.hideLoading()
      wx.showToast({ title: isEditProduct ? '修改成功' : '添加成功', icon: 'success' })
      
      // 重新加载商品列表
      this.loadShopAndProducts()
      
    } catch (err) {
      wx.hideLoading()
      console.error('保存商品失败', err)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  closeProductModal() {
    this.setData({ showProductModal: false })
  },

  async deleteProduct(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个商品吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          try {
            const db = wx.cloud.database()
            await db.collection('products').doc(id).remove()
            
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadShopAndProducts()
          } catch (err) {
            wx.hideLoading()
            console.error('删除失败', err)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  },

  async toggleProductStatus(e) {
    const id = e.currentTarget.dataset.id
    const isAvailable = e.detail.value
    
    try {
      const db = wx.cloud.database()
      await db.collection('products').doc(id).update({
        data: { isAvailable: isAvailable }
      })
      
      // 更新本地数据
      const products = this.data.products.map(p => {
        if (p._id === id) p.isAvailable = isAvailable
        return p
      })
      this.setData({ products })
      
    } catch (err) {
      console.error('更新状态失败', err)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  goToReview(e) {
    const id = e.currentTarget.dataset._id
    console.log(`${id}`)
    wx.navigateTo({
      url: `/pages/ReviewDetail/ReviewDetail?id=${id}`,
    })
  },

  goToVendorRegister() {
    wx.navigateTo({
      url: '/pages/Register_Vendor/Register_Vendor'
    })
  }
})