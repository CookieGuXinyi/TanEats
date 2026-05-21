// pages/StallDetail/StallDetail.js
Page({
  data: {
    stallId: '',
    stall: null,
    isOpen: false,
    products: []
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ stallId: id })
      this.loadStallDetail()
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' })
    }
  },

  // 加载店铺详情
  async loadStallDetail() {
    const { stallId } = this.data
    
    wx.showLoading({ title: '加载中...' })
    
    try {
      const db = wx.cloud.database()
      
      // 查询店铺信息
      const stallRes = await db.collection('stalls').doc(stallId).get()
      const stall = stallRes.data
      
      // 判断是否营业中
      const isOpen = this.checkIsOpen(stall.businessHours)
      
      // 查询商品列表
      const productRes = await db.collection('products').where({
        shopId: stallId,
        isAvailable: true
      }).orderBy('price', 'asc').get()
      
      this.setData({
        stall: stall,
        isOpen: isOpen,
        products: productRes.data
      })
      
      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: stall.shopName || '店铺详情'
      })
      
      wx.hideLoading()
      
    } catch (err) {
      wx.hideLoading()
      console.error('加载失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 判断是否在营业时间内
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

  // 预览微信群二维码
  previewQRCode() {
    const { stall } = this.data
    if (stall.qrCodeUrl) {
      wx.previewImage({
        urls: [stall.qrCodeUrl]
      })
    }
  },

  // 添加到购物车（TODO：待后续完善）
  addToCart(e) {
    const product = e.currentTarget.dataset.product
    wx.showToast({
      title: `购物车/订单功能开发中`,
      icon: 'none',
      duration: 1000
    })
  }
})