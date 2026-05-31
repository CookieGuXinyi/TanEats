// pages/StallDetail/StallDetail.js
Page({
  data: {
    stallId: '',
    stall: null,
    isOpen: false,
    products: [],
    isFavorited: false
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ stallId: id })
      this.loadStallDetail()
      this.checkFavoriteStatus()
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

  // 新增：检查是否已收藏
  async checkFavoriteStatus() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const stallId = this.data.stallId;
    
    if (!userInfo._id || !stallId) {
      return;
    }
    
    try {
      const db = wx.cloud.database();
      const res = await db.collection('favorites').where({
        userId: userInfo._id,
        stallId: stallId
      }).get();
      
      this.setData({ isFavorited: res.data.length > 0 });
    } catch (err) {
      console.error('检查收藏状态失败', err);
    }
  },

  // 新增：切换收藏
  async toggleFavorite() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const stallId = this.data.stallId;
    
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    try {
      const db = wx.cloud.database();
      
      if (this.data.isFavorited) {
        // 取消收藏
        await db.collection('favorites').where({
          userId: userInfo._id,
          stallId: stallId
        }).remove();
        
        this.setData({ isFavorited: false });
        wx.showToast({ title: '已取消收藏', icon: 'none' });
      } else {
        // 添加收藏
        await db.collection('favorites').add({
          data: {
            userId: userInfo._id,
            stallId: stallId,
            createTime: new Date()
          }
        });
        
        this.setData({ isFavorited: true });
        wx.showToast({ title: '已收藏', icon: 'success' });
      }
      
      // 同步更新本地缓存（供搜索页使用）
      const cachedIds = wx.getStorageSync('favoriteStallIds') || [];
      let newIds;
      if (this.data.isFavorited) {
        newIds = [...cachedIds, stallId];
      } else {
        newIds = cachedIds.filter(id => id !== stallId);
      }
      wx.setStorageSync('favoriteStallIds', newIds);
      
    } catch (err) {
      console.error('收藏操作失败', err);
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },
  
  // 添加到购物车
  async addToCart(e) {
    const product = e.currentTarget.dataset.product
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    
    wx.showLoading({ title: '添加中...' })
    
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 查询购物车是否已有该商品
      const existRes = await db.collection('cart').where({
        userId: userInfo._id,
        productId: product._id,
        stallId: this.data.stallId
      }).get()
      
      if (existRes.data.length > 0) {
        // 已有，数量+1
        await db.collection('cart').doc(existRes.data[0]._id).update({
          data: {
            quantity: _.inc(1),
            updateTime: new Date()
          }
        })
      } else {
        // 新增
        await db.collection('cart').add({
          data: {
            userId: userInfo._id,
            stallId: this.data.stallId,
            stallName: this.data.stall.shopName,
            productId: product._id,
            productName: product.name,
            price: product.price,
            quantity: 1,
            selected: true,
            createTime: new Date(),
            updateTime: new Date()
          }
        })
      }
      wx.hideLoading()
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('加购失败', err)
      wx.showToast({ title: '添加失败', icon: 'error' })
    }
  }
})