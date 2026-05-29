// pages/MyFavorites/MyFavorites.js
Page({
  data: {
    favorites: [],
    loading: true
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    if (!userInfo._id) {
      this.setData({ loading: false, favorites: [] });
      return;
    }
    
    this.setData({ loading: true });
    
    try {
      const db = wx.cloud.database();
      
      // 1. 获取收藏列表
      const favRes = await db.collection('favorites').where({
        userId: userInfo._id
      }).get();
      
      const stallIds = favRes.data.map(item => item.stallId);
      
      if (stallIds.length === 0) {
        this.setData({ favorites: [], loading: false });
        return;
      }
      
      // 2. 获取摊位详情
      const _ = db.command;
      const stallRes = await db.collection('stalls').where({
        _id: _.in(stallIds),
        status: 'active'
      }).get();
      
      // 3. 组装数据
      const favorites = stallRes.data.map(stall => ({
        id: stall._id,
        name: stall.shopName,
        category: stall.category || '其他',
        rating: stall.rating || 0,
        address: stall.location || '校园内',
        businessHours: stall.businessHours,
        imageUrl: stall.imageUrl || ''
      }));
      
      this.setData({ favorites, loading: false });
      
    } catch (err) {
      console.error('加载收藏失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 取消收藏
  async unfavorite(e) {
    const stallId = e.currentTarget.dataset.id;
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '提示',
      content: '确定要取消收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database();
            await db.collection('favorites').where({
              userId: userInfo._id,
              stallId: stallId
            }).remove();
            
            wx.showToast({ title: '已取消收藏', icon: 'success' });
            
            // 刷新列表
            this.loadFavorites();
            
            // 同时清除本地缓存，确保搜索页同步
            const cachedIds = wx.getStorageSync('favoriteStallIds') || [];
            const newIds = cachedIds.filter(id => id !== stallId);
            wx.setStorageSync('favoriteStallIds', newIds);
            
          } catch (err) {
            console.error('取消收藏失败', err);
            wx.showToast({ title: '操作失败', icon: 'error' });
          }
        }
      }
    });
  },

  // 跳转到店铺详情
  goToStallDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/StallDetail/StallDetail?id=${id}`
    });
  },

  // 去搜索
  goToSearch() {
    wx.switchTab({
      url: '/pages/Discover/Discover'
    });
  }
});