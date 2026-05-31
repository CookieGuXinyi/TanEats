// pages/Register_Vendor/Register_Vendor.js
Page({
  data: {
    shopName: '',
    businessHours: '',
    location: '',
    description: '',
    category: '',
    categoryOptions: ['小吃炸串', '奶茶饮品', '粉面主食', '烧烤烤串', '甜品糕点', '其他'],
    qrCodeUrl: '',
    licenseImages: [],
    submitting: false,
    canSubmit: false,
    // 营业时间选择器相关
    hoursRange: [
      ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
      ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
    ],
    hoursIndex: [0, 17, 23],  // 默认周一 17:00-23:00
    businessHoursDisplay: '',
    businessHours: '周一 17:00-23:00'
  },

  onLoad() {
    this.checkCanSubmit()
  },

  // 表单输入处理
  onShopNameInput(e) {
    this.setData({ shopName: e.detail.value })
    this.checkCanSubmit()
  },

  onHoursInput(e) {
    this.setData({ businessHours: e.detail.value })
    this.checkCanSubmit()
  },

  onHoursChange(e) {
    const val = e.detail.value
    const week = this.data.hoursRange[0][val[0]]
    const startTime = this.data.hoursRange[1][val[1]]
    const endTime = this.data.hoursRange[2][val[2]]
    
    const displayText = `${week} ${startTime}-${endTime}`
    const storeText = `${week} ${startTime}-${endTime}`
    
    this.setData({
      hoursIndex: val,
      businessHoursDisplay: displayText,
      businessHours: storeText
    })
    this.checkCanSubmit()
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value })
    this.checkCanSubmit()
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  onCategoryChange(e) {
    const index = e.detail.value
    this.setData({ category: this.data.categoryOptions[index] })
    this.checkCanSubmit()
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { shopName, businessHours, location, category } = this.data
    const canSubmit = shopName.trim().length > 0 && 
                      businessHours.trim().length > 0 && 
                      location.trim().length > 0 &&
                      category.length > 0
    this.setData({ canSubmit })
  },

  // 上传微信群二维码
  uploadQRCode() {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0]
        
        wx.showLoading({ title: '上传中...' })
        
        // 上传到云存储
        const cloudPath = `qrcodes/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.png`
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: (uploadRes) => {
            that.setData({ qrCodeUrl: uploadRes.fileID })
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

  // 上传营业执照/健康证
  uploadLicense() {
    const that = this
    wx.chooseImage({
      count: 3,  // 最多3张
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePaths = res.tempFilePaths
        
        wx.showLoading({ title: '上传中...' })
        
        const uploadPromises = tempFilePaths.map((filePath, index) => {
          const cloudPath = `licenses/${Date.now()}_${index}_${Math.random().toString(36).substr(2, 8)}.png`
          return wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: filePath
          })
        })
        
        Promise.all(uploadPromises).then(results => {
          const fileIDs = results.map(r => r.fileID)
          that.setData({
            licenseImages: [...that.data.licenseImages, ...fileIDs]
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

  // 删除已上传的证件
  deleteLicense(e) {
    const index = e.currentTarget.dataset.index
    const licenseImages = [...this.data.licenseImages]
    licenseImages.splice(index, 1)
    this.setData({ licenseImages })
  },

  // 提交申请
  submitRegister() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    // 检查是否已登录
    const isLogin = wx.getStorageSync('isLogin')
    if (!isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再提交申请',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/Register_User/Register_User'
            })
          }
        }
      })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    // 获取当前用户信息
    const userInfo = wx.getStorageSync('userInfo') || {}
    
    wx.cloud.callFunction({
      name: 'submitApplication',
      data: {
        action: 'submit',
        shopName: this.data.shopName,
        businessHours: this.data.businessHours,
        location: this.data.location,
        description: this.data.description,
        category: this.data.category,
        qrCodeUrl: this.data.qrCodeUrl,
        licenseImages: this.data.licenseImages,
        applicantId: userInfo._id || '',
        applicantPhone: userInfo.phone || '',
        applicantName: userInfo.nickname || '未知用户'
      },
      success: (res) => {
        wx.hideLoading()
        this.setData({ submitting: false })
        
        if (res.result.code === 200) {
          wx.showModal({
            title: '申请已提交',
            content: '我们会尽快审核，审核结果将通过消息通知您',
            showCancel: false,
            success: () => {
              // 清空表单
              this.setData({
                shopName: '',
                businessHours: '',
                location: '',
                description: '',
                category: '',
                qrCodeUrl: '',
                licenseImages: [],
                canSubmit: false
              })
              // 返回上一页
              wx.navigateBack()
            }
          })
        } else {
          wx.showToast({ title: res.result.message, icon: 'error' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ submitting: false })
        console.error('提交失败', err)
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    })
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: [url],
      current: url
    })
  },

  previewLicense(e) {
    const urls = this.data.licenseImages
    const current = e.currentTarget.dataset.url
    wx.previewImage({
      urls: urls,
      current: current
    })
  }
})