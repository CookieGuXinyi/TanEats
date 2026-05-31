// pages/index/index.js
Page({
  data: {
    hotStalls: []
  },

  onLoad() {
    console.log('首页加载');
    this.loadHotStalls();
  },

  // 从数据库获取评分前4的店铺
  async loadHotStalls() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 查询所有激活的店铺，按评分降序排列，取前4条
      const res = await db.collection('stalls')
        .where({
          status: 'active'
        })
        .orderBy('rating', 'desc')
        .limit(4)
        .get();
      
      const stalls = res.data;
    
      if (stalls.length === 0) {
        this.setData({ hotStalls: [] });
        return;
      }
      
      // 2. 获取摊位ID列表
      const stallIds = stalls.map(s => s._id);
      
      // 3. 调用云函数获取排队人数
      const queueRes = await wx.cloud.callFunction({
        name: 'getQueueCount',
        data: { stallIds: stallIds }
      });
      const queueCounts = queueRes.result.data || {};
      
      // 4. 格式化数据
      const hotStalls = stalls.map(stall => ({
        _id: stall._id,
        name: stall.shopName,
        isLive: false,  // 直播功能暂未实现
        queue: queueCounts[stall._id] || 0  // 真实排队人数
      }));
      
      this.setData({ hotStalls });
      console.log('热门店铺加载成功', hotStalls);
      
    } catch (err) {
      console.error('加载热门店铺失败', err);
      // 降级：使用默认数据
      this.setData({
        hotStalls: [
          { _id: '1', name: '周姐炸串', isLive: false, queue: 3 },
          { _id: '2', name: '柳州螺蛳粉', isLive: false, queue: 5 }
        ]
      });
    }
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

  // TODO：拼单功能尚未实现
  goToOrderGroup() {
    wx.showToast({
      title: '拼单功能开发中',
      icon: 'none'
    });
  }
});