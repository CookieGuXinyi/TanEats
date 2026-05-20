// pages/MyApplications/MyApplications.js
Page({
  data: {
    applications: []
  },

  onShow() {
    this.loadApplications()
  },

  loadApplications() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    if (!userInfo._id) {
      this.setData({ applications: [] })
      return
    }
    
    wx.showLoading({ title: '加载中...' })
    
    wx.cloud.callFunction({
      name: 'submitApplication',
      data: {
        action: 'getStatus',
        applicantId: userInfo._id
      },
      success: (res) => {
        wx.hideLoading()
        
        if (res.result.code === 200) {
          // 格式化时间
          const applications = (res.result.data || []).map(app => ({
            ...app,
            submitTimeFormatted: this.formatTime(app.submitTime),
            reviewTimeFormatted: app.reviewTime ? this.formatTime(app.reviewTime) : ''
          }))
          this.setData({ applications })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('加载失败', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
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
  },

  goToVendorRegister() {
    wx.navigateTo({
      url: '/pages/Register_Vendor/Register_Vendor'
    })
  },

  goToVendorDashboard(e) {
    const id = e.currentTarget.dataset.id
    // 跳转到摊位管理页面
    wx.navigateTo({
      url: `/pages/Vendor/Vendor?applicationId=${id}`
    })
  },

  reapply() {
    wx.navigateTo({
      url: '/pages/Register_Vendor/Register_Vendor'
    })
  }
})