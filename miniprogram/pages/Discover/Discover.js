// pages/Discover/Discover.js
Page({
  data: {
    reviews: [
      { id: 1, reviewer: '吃货小张', rating: 5, content: '排队王果然好吃！脆皮多汁，希望多开直播看实时队尾~', stallName: '周姐炸串', time: '2小时前' },
      { id: 2, reviewer: '奶茶控', rating: 4, content: '和室友拼单第二杯半价，小程序组队超方便', stallName: '高校夜市奶茶', time: '昨天' },
      { id: 3, reviewer: '炒饭爱好者', rating: 4.5, content: '用优惠券省了5块，摊位地图拥挤度很准！', stallName: '铁板炒饭', time: '昨天' }
    ],
    videos: [
      { id: 1, title: '煎饼摊直播回放' },
      { id: 2, title: '烤冷面测评' }
    ],
    topics: [
      { id: 1, name: '#校园夜市挑战', count: 124 },
      { id: 2, name: '#宝藏摊位', count: 89 },
      { id: 3, name: '#拼单搭子', count: 56 }
    ]
  },

  onLoad() {
    console.log('发现页加载');
  },

  goToSearch() {
    wx.showToast({
      title: '评论帖搜索功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  goToReview() {
    wx.showToast({
      title: '查看帖子功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  goToWriteReview() {
    wx.showToast({
      title: '发帖功能开发中',
      icon: 'none'
    });
  },

  goToVlog() {
    wx.showToast({
      title: '视频帖功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  goToHotspot() {
    wx.showToast({
      title: '热点功能开发中',
      icon: 'none',
      duration: 2000
    })
  }
});