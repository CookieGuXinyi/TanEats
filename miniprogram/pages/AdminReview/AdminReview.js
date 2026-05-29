// pages/AdminReview/AdminReview.js
Page({
  data: {
    currentTab: 'pending',
    applications: [],
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    loading: false,
    showRejectModal: false,
    rejectReason: '',
    currentRejectId: null
  },

  onLoad() {
    this.loadApplications()
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadApplications()
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.loadApplications()
  },

  // 加载申请列表
  async loadApplications() {
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const status = this.data.currentTab === 'pending' ? 'pending' 
                   : (this.data.currentTab === 'approved' ? 'approved' : 'rejected')
      
      const res = await db.collection('stall_applications')
        .where({ status: status })
        .orderBy('submitTime', 'desc')
        .get()
      
      // 格式化时间
      const applications = res.data.map(item => ({
        ...item,
        submitTimeFormatted: this.formatTime(item.submitTime)
      }))
      
      // 更新计数
      await this.updateCounts()
      
      this.setData({ 
        applications: applications,
        loading: false 
      })
      
    } catch (err) {
      console.error('加载申请失败', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 更新各状态数量
  async updateCounts() {
    try {
      const db = wx.cloud.database()
      const pendingRes = await db.collection('stall_applications').where({ status: 'pending' }).count()
      const approvedRes = await db.collection('stall_applications').where({ status: 'approved' }).count()
      const rejectedRes = await db.collection('stall_applications').where({ status: 'rejected' }).count()
      
      this.setData({
        pendingCount: pendingRes.total,
        approvedCount: approvedRes.total,
        rejectedCount: rejectedRes.total
      })
    } catch (err) {
      console.error('更新计数失败', err)
    }
  },

  // 格式化时间
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

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: [url]
    })
  },

  // 拒绝申请
  rejectApplication(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      showRejectModal: true,
      currentRejectId: id,
      rejectReason: ''
    })
  },

  onRejectReasonInput(e) {
    this.setData({ rejectReason: e.detail.value })
  },

  closeRejectModal() {
    this.setData({ showRejectModal: false, currentRejectId: null, rejectReason: '' })
  },

  async confirmReject() {
    const { currentRejectId, rejectReason } = this.data
    
    wx.showLoading({ title: '处理中...' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'reviewApplication',
        data: {
          applicationId: currentRejectId,
          action: 'reject',
          rejectReason: rejectReason
        }
      })
      
      if (res.result.code === 200) {
        wx.hideLoading()
        wx.showToast({ title: '已拒绝', icon: 'success' })
        this.closeRejectModal()
        this.loadApplications()
      } else {
        throw new Error(res.result.message)
      }
    } catch (err) {
      wx.hideLoading()
      console.error('拒绝失败', err)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  // 通过申请并创建店铺
  async approveApplication(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认通过',
      content: '通过后将自动创建店铺并上线',
      success: async (res) => {
        if (res.confirm) {
          await this.doApprove(id)
        }
      }
    })
  },

  async doApprove(applicationId) {
    wx.showLoading({ title: '处理中...' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'reviewApplication',
        data: {
          applicationId: applicationId,
          action: 'approve'
        }
      })
      
      if (res.result.code === 200) {
        wx.hideLoading()
        wx.showToast({ title: '通过并创建店铺成功', icon: 'success' })
        this.loadApplications()
      } else {
        throw new Error(res.result.message)
      }
    } catch (err) {
      wx.hideLoading()
      console.error('通过失败', err)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  }
})