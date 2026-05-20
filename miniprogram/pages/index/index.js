// pages/index/index.js
Page({
  data: {
    hotStalls: [
      { id: 1, name: '周姐炸串', isLive: true, queue: 3 },
      { id: 2, name: '柳州螺蛳粉', isLive: false, queue: 7 },
      { id: 3, name: '椰子冻小屋', isLive: false, queue: 0 }
    ]
  },

  onLoad() {
    console.log('首页加载');
  },

  goToAiTalk() {
    wx.navigateTo({
      url: '/pages/AITalk/AiTalk'
    });
  },

  goToMap() {
    wx.navigateTo({
      url: '/pages/Map/Map'
    });
  },

  goToOrderGroup() {
    wx.showToast({
      title: '拼单功能开发中',
      icon: 'none'
    });
  }
});