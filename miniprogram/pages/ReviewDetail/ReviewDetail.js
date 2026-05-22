// pages/ReviewDetail/ReviewDetail.js
Page({
  data: {
    reviewId: '',
    review: null,
    notFound: false
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ reviewId: id })
      this.loadReviewDetail()
    } else {
      this.setData({ notFound: true })
    }
  },

  async loadReviewDetail() {
    wx.showLoading({ title: '加载中...' })
    
    try {
      const db = wx.cloud.database()
      const res = await db.collection('reviews').doc(this.data.reviewId).get()
      
      const review = res.data
      review.createTimeFormatted = this.formatTime(review.createTime)
      
      this.setData({ review })
      wx.hideLoading()
      
    } catch (err) {
      wx.hideLoading()
      console.error('加载失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ notFound: true })
    }
  },

  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: [url]
    })
  },

  toggleLike() {
    // 点赞功能（后续完善）
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goToShop(event) {
    const index = event.currentTarget.dataset.index;
    const shopId = this.data.review.shopIds[index];

    wx.navigateTo({
      url: `/pages/StallDetail/StallDetail?id=${shopId}`
    })
  }
})