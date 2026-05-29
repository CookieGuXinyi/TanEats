// pages/index/index.js
Page({
  data: {
    hotStalls: [
      { _id: '21dd03466a11a95a0051231173d42119', name: '周姐炸串', isLive: true, queue: 3 },
      { _id: 'adk3jcn3d3n4ec', name: '柳州螺蛳粉', isLive: false, queue: 7 },
      { _id: 'ladcnk5jdcs78cdn', name: '椰子冻小屋', isLive: false, queue: 0 },
      { _id: 'f24c8d6a6a0da4f10104929d33cb5416', name: '顾氏饮品铺', isLive: false, queue: 4}
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

  goToSearch() {
    wx.navigateTo({
      url: '/pages/Search_Stall/Search_Stall'
    });
  },

  goToStallDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/StallDetail/StallDetail?id=${id}`,
    })
  },

  goToOrderGroup() {
    wx.showToast({
      title: '拼单功能开发中',
      icon: 'none'
    });
  }
});