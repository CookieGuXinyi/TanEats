// pages/Discover/Discover.js
Page({
  data: {
    mock_reviews: [
      { _id: 1, reviewer: '吃货小张', rating: 5, content: '排队王果然好吃！脆皮多汁，希望多开直播看实时队尾~', stallName: '周姐炸串', time: '2小时前' },
      { _id: 2, reviewer: '奶茶控', rating: 4, content: '和室友拼单第二杯半价，小程序组队超方便', stallName: '高校夜市奶茶', time: '昨天' },
      { _id: 3, reviewer: '炒饭爱好者', rating: 4.5, content: '用优惠券省了5块，摊位地图拥挤度很准！', stallName: '铁板炒饭', time: '昨天' }
    ],
    reviews: [],
    videos: [
      { _id: 1, title: '煎饼摊直播回放' },
      { _id: 2, title: '烤冷面测评' }
    ],
    topics: [
      { _id: 1, name: '#校园夜市挑战', count: 124 },
      { _id: 2, name: '#宝藏摊位', count: 89 },
      { _id: 3, name: '#拼单搭子', count: 56 }
    ]
  },

  onLoad() {
    console.log('发现页加载');
    this.loadReviews();
  },

  // 从数据库加载评价，TODO：设计更合理的排序逻辑
  loadReviews() {
    wx.cloud.database().collection('reviews')
      .orderBy('createTime', 'desc')
      .limit(3)
      .get()
      .then(res =>{
        console.log('原始数据:', JSON.stringify(res.data))  // 查看完整数据

        const reviews = res.data.map(item => ({
          ...item,
          reviewer: item.reviewerName,      // 真实字段 reviewerName → reviewer
          stallName: item.shopName,          // 真实字段 shopName → stallName
          time: this.formatTime(item.createTime)
        }))
        this.setData({ reviews })
        console.log(`共获取到${reviews.length}条评论`)
    })
    .catch (err => {
      console.error('加载评价失败', err)
    })
  },

  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    return `${month}月${day}日 ${hour}:${minute}`
  },

  goToSearch() {
    wx.navigateTo({
      url: '/pages/SearchReview/SearchReview',
    })
  },

  goToReview(e) {
    const id = e.currentTarget.dataset._id
    console.log(`${id}`)
    wx.navigateTo({
      url: `/pages/ReviewDetail/ReviewDetail?id=${id}`,
    })
  },

  goToWriteReview() {
    const isLogin = wx.getStorageSync('isLogin')
    if (!isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/WriteReview/WriteReview',
    })
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