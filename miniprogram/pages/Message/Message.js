// pages/Message/Message.js
Page({
  data: {
    coupons: [
      { id: 1, content: '跨店满20减3 · 有效至今日' },
      { id: 2, content: '新用户专享: 满10减2 券已发放' },
      { id: 3, content: '摊位"铁板鱿鱼" 今晚首播抽半价' }
    ],
    vendorAlerts: [
      { id: 1, content: '📈 炸鸡摊预计20分钟后售罄，请及时下单' },
      { id: 2, content: '✅ 您的证照有效期提醒: 健康证30天后到期' },
      { id: 3, content: '🎥 您关注的"周姐炸串"开始直播啦！' }
    ],
    systemNotices: [
      { id: 1, content: '欢迎使用TanEats，祝您用餐愉快！', time: '昨天' },
      { id: 2, content: '系统更新：摊位地图增加拥挤度显示', time: '3天前' }
    ]
  },

  onLoad() {
    console.log('消息页加载');
  },

  goToDiscountMsg() {
    wx.showToast({
      title: '优惠功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

 goToVendorUpdates() {
    wx.showToast({
      title: '摊主动态功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  goToOrderGroup() {
    wx.showToast({
      title: '拼单功能开发中',
      icon: 'none'
    });
  },

  goToNotification() {
    wx.showToast({
      title: '系统通知功能开发中',
      icon: 'none',
      duration: 2000
    })
  }
});