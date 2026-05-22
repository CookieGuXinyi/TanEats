// pages/WriteReview/WriteReview.js
Page({
  data: {
    allShops: [],           // 所有店铺列表
    selectedShops: [],      // 已选店铺
    tags: [],               // 话题标签数组
    tagInput: '',           // 当前输入的标签
    rating: 0,
    content: '',
    images: [],
    showShopPicker: false,
    canSubmit: false
  },

  onLoad() {
    this.loadAllShops()
  },

  // 加载所有店铺
  async loadAllShops() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('stalls').where({
        status: 'active'
      }).get()
      this.setData({ allShops: res.data })
    } catch (err) {
      console.error('加载店铺失败', err)
    }
  },

  // 显示店铺选择器
  showShopPicker() {
    const that = this
    const selectedIds = that.data.selectedShops.map(s => s._id)
    const availableShops = that.data.allShops.filter(s => !selectedIds.includes(s._id))
    
    if (availableShops.length === 0) {
      wx.showToast({ title: '没有更多店铺可选', icon: 'none' })
      return
    }
    
    const items = availableShops.map(s => s.shopName)
    
    wx.showActionSheet({
      itemList: items,
      success(res) {
        const selectedShop = availableShops[res.tapIndex]
        that.setData({
          selectedShops: [...that.data.selectedShops, selectedShop]
        })
        that.checkCanSubmit()
      }
    })
  },

  // 移除已选店铺
  removeShop(e) {
    const index = e.currentTarget.dataset.index
    const selectedShops = [...this.data.selectedShops]
    selectedShops.splice(index, 1)
    this.setData({ selectedShops })
    this.checkCanSubmit()
  },

  // 添加标签
  addTag(e) {
    const tag = e.detail.value.trim()
    if (tag && !this.data.tags.includes(tag)) {
      this.setData({
        tags: [...this.data.tags, tag],
        tagInput: ''
      })
    }
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value })
  },

  // 移除标签
  removeTag(e) {
    const index = e.currentTarget.dataset.index
    const tags = [...this.data.tags]
    tags.splice(index, 1)
    this.setData({ tags })
  },

  setRating(e) {
    this.setData({ rating: e.currentTarget.dataset.rating })
    this.checkCanSubmit()
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
    this.checkCanSubmit()
  },

  checkCanSubmit() {
    const { selectedShops, rating, content } = this.data
    const canSubmit = selectedShops.length > 0 && rating > 0 && content.trim().length > 0
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

  // 提交评论
  async submitReview() {
    if (!this.data.canSubmit) return
    
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    wx.showLoading({ title: '发布中...' })
    
    try {
      const db = wx.cloud.database()
      
      // 构建数据
      const reviewData = {
        shopIds: this.data.selectedShops.map(s => s._id),
        shopNames: this.data.selectedShops.map(s => s.shopName),
        tags: this.data.tags,
        rating: this.data.rating,
        content: this.data.content,
        images: this.data.images,
        reviewerId: userInfo._id,
        reviewerName: userInfo.nickname || '匿名用户',
        likeCount: 0,
        createTime: new Date(),
        isMultiShop: this.data.selectedShops.length > 1
      }
      
      await db.collection('reviews').add({ data: reviewData })
      
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