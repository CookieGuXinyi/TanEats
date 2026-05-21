// pages/Profile/Profile.js
Page({
  data: {
    isLogin: false,
    userInfo: {
      nickname: '',
      phone: '',
      avatar: '👤',
      points: 0,
      coupons: 0
    }
  },

  onLoad() {
    console.log('我的页加载');
  },

  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    try {
      const isLogin = wx.getStorageSync('isLogin') || false;
      const userInfo = wx.getStorageSync('userInfo') || {};

      console.log('读取到的用户信息:', userInfo)

      this.setData({
        isLogin: isLogin,
        userInfo: {
          nickname: userInfo.nickname || '校园食客',
          phone: userInfo.phone || '12312341567',
          avatar: userInfo.avatar || '👤',
          points: userInfo.points || 128,
          coupons: userInfo.coupons || 3
        }
      });
    } catch (e) {
      console.log('读取登录状态失败', e);
    }
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateTo({
      url: '/pages/Register_User/Register_User'
    });
  },

  // 微信一键登录，TODO:同Register_User中的doWxLogin，尚未成功
  handleWxLogin() {
    wx.showToast({
      title: '功能开发中，请先使用手机号登录',
      icon: 'none',
      duration: 2000
    })
  },

  goToVendor() {
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/Vendor/Vendor'
    });
  },

  goToVendorRegister() {
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/Register_Vendor/Register_Vendor'
    });
  },

  // 跳转到我的申请记录
  goToMyApplications() {
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/MyApplications/MyApplications'
    })
  },

  goToCollection() {
    wx.showToast({
      title: '收藏功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  goToHistory() {
    wx.showToast({
      title: '浏览记录功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  goToOrder(event) {
    const status = event.currentTarget.dataset.status;

 wx.showToast({
      title: `订单功能开发中(${status})`,
      icon: 'none',
      duration: 2000
    })   
  },

  goToResetPW() {
    wx.showToast({
      title: '密码重置功能开发中',
      icon: 'none',
      duration: 2000
    })
  },
  
  goToSetting() {
    wx.showToast({
      title: '通知偏好设置开发中',
      icon: 'none',
      duration: 2000
    })
  },

  goToAboutUs() {
    wx.showToast({
      title: '内容修订中',
      icon: 'none',
      duration: 2000
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('isLogin');
            wx.removeStorageSync('userInfo');
            this.setData({ isLogin: false })
            wx.showToast({ title: '已退出', icon: 'success' });
          } catch (e) {
            console.log('退出失败', e);
            wx.showToast({ title: '退出失败', icon: 'error' });
          }
        }
      }
    });
  }
});