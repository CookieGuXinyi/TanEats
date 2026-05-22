// pages/WriteReview/WriteReview.js
Page({
  data: {
    shopList: [],
    shopIndex: -1,
    selectedShop: null,
    rating: 0,
    content: '',
    images: [],
    canSubmit: false
  },

  onLoad() {
    this.loadShops()
  },

  // 加载店铺列表
  async loadShops() {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('stalls').where({
        status: 'active'
      }).get()
      
      this.setData({ shopList: res.data })
      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('加载失败', err)
    }
  },

  onShopChange(e) {
    const index = e.detail.value
    this.setData({
      shopIndex: index,
      selectedShop: this.data.shopList[index]
    })
    this.checkCanSubmit()
  },

  setRating(e) {
    const rating = e.currentTarget.dataset.rating
    this.setData({ rating })
    this.checkCanSubmit()
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
    this.checkCanSubmit()
  },

  checkCanSubmit() {
    const { selectedShop, rating, content } = this.data
    const canSubmit = selectedShop && rating > 0 && content.trim().length > 0
    this.setData({ canSubmit })
  },

  chooseImage() {
    const that = this
    wx.chooseImage({
      count: 9 - this.data.images.length,
      sizeType: ['compressed'],
      success(res) {
        const tempFilePaths = res.tempFilePaths
        
        wx.showLoading({ title: '上传中...' })
        
        const uploadPromises = tempFilePaths.map((filePath, index) => {
          const cloudPath = `reviews/${Date.now()}_${index}_${Math.random().toString(36).substr(2, 8)}.png`
          return wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: filePath
          })
        })
        
        Promise.all(uploadPromises).then(results => {
          const fileIDs = results.map(r => r.fileID)
          that.setData({
            images: [...that.data.images, ...fileIDs]
          })
          wx.hideLoading()
          wx.showToast({ title: '上传成功', icon: 'success' })
        }).catch(err => {
          wx.hideLoading()
          console.error('上传失败', err)
          wx.showToast({ title: '上传失败', icon: 'error' })
        })
      }
    })
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  async submitReview() {
    if (!this.data.canSubmit) return
    
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    wx.showLoading({ title: '发布中...' })
    
    try {
      const db = wx.cloud.database()
      await db.collection('reviews').add({
        data: {
          shopId: this.data.selectedShop._id,
          shopName: this.data.selectedShop.shopName,
          reviewerId: userInfo._id,
          reviewerName: userInfo.nickname || '匿名用户',
          rating: this.data.rating,
          content: this.data.content,
          images: this.data.images,
          likeCount: 0,
          createTime: new Date()
        }
      })
      
      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (err) {
      wx.hideLoading()
      console.error('发布失败', err)
      wx.showToast({ title: '发布失败', icon: 'error' })
    }
  }
})