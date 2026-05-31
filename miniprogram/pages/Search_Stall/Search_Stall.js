// pages/Search_stall/Search_stall.js
Page({
  data: {
    searchKeyword: '',
    activeFilter: 'all',
    sortKey: 'recommend',
    results: [],
    searchHistory: [],
    favoriteIds: [],
    hotKeywords: ['炸串', '螺蛳粉', '椰子冻', '柠檬茶', '排队少', '有优惠'],
    filters: [
      { key: 'all', label: '全部', icon: '🔎' },
      { key: 'shortQueue', label: '排队少', icon: '⚡' },
      { key: 'coupon', label: '有优惠', icon: '🎫' },
      { key: 'highRating', label: '高评分', icon: '⭐' }
    ],
    sortOptions: [
      { key: 'recommend', label: '综合推荐' },
      { key: 'wait', label: '等待最短' },
      { key: 'sales', label: '销量最高' },
      { key: 'rating', label: '评分最高' }
    ],
    summary: {
      count: 0,
      avgWait: 0,
      couponCount: 0
    },
    loading: false
  },

  onLoad(options) {
    const keyword = options.keyword || '';
    this.setData({
      searchKeyword: keyword,
      searchHistory: wx.getStorageSync('searchHistory') || [],
      favoriteIds: wx.getStorageSync('favoriteStallIds') || []
    });
    this.refreshResults(keyword, false);
  },

  onShow() {
    this.setData({
      favoriteIds: wx.getStorageSync('favoriteStallIds') || []
    });
    if (this.data.results.length > 0) {
      this.refreshResults(this.data.searchKeyword, false);
    }
  },

  // ========== 从数据库获取摊位数据 ==========
  async getAllStalls(keyword) {
    this.setData({ loading: true });
    
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 1. 查询所有激活的摊位
      const stallRes = await db.collection('stalls')
        .where({ status: 'active' })
        .get()
      
      const stalls = stallRes.data
      
      if (stalls.length === 0) {
        this.setData({ loading: false });
        return [];
      }
      
      // 2. 获取所有摊位ID
      const stallIds = stalls.map(s => s._id)
      
      // 3. 查询所有商品
      const productRes = await db.collection('products')
        .where({
          shopId: _.in(stallIds),
          isAvailable: true
        })
        .get()
      
      // 按 shopId 分组商品
      const productsByShop = {}
      productRes.data.forEach(p => {
        if (!productsByShop[p.shopId]) productsByShop[p.shopId] = []
        productsByShop[p.shopId].push(p)
      })
      
      // 4. 查询所有评论
      const reviewRes = await db.collection('reviews')
        .where({
          shopIds: _.in(stallIds)
        })
        .get()
      
      // 按 shopId 分组评论
      const reviewsByShop = {}
      reviewRes.data.forEach(r => {
        if (r.shopIds) {
          r.shopIds.forEach(shopId => {
            if (!reviewsByShop[shopId]) reviewsByShop[shopId] = []
            reviewsByShop[shopId].push(r)
          })
        }
      })

      // 5. 获取真实排队人数（通过云函数）
      const queueRes = await wx.cloud.callFunction({
        name: 'getQueueCount',
        data: { stallIds: stallIds }
      })
      
      const queueMap = queueRes.result.data || {}

      // 6. 查询订单数量（用于月销量统计，从完成的订单中统计）
      const orderRes = await db.collection('orders')
        .where({
          stallId: _.in(stallIds),
          status: 'completed'  // 只统计已完成订单
        })
        .get()
      
      // 按 stallId 统计月销量
      const salesMap = {}
      orderRes.data.forEach(order => {
        if (!salesMap[order.stallId]) {
          salesMap[order.stallId] = 0
        }
        // 统计商品总数
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
        salesMap[order.stallId] += itemCount
      })
      
      // 7. 查询店铺被收藏数量
      const favRes = await db.collection('favorites')
        .where({
          stallId: _.in(stallIds)
        })
        .get()
      
      // 按 stallId 统计收藏数
      const favoritesMap = {}
      favRes.data.forEach(fav => {
        if (!favoritesMap[fav.stallId]) {
          favoritesMap[fav.stallId] = 0
        }
        favoritesMap[fav.stallId]++
      })
      
      // 8. 查询店铺被提及的评论数量（作为 views 的替代）
      const viewMap = {}
      reviewRes.data.forEach(review => {
        if (review.shopIds) {
          review.shopIds.forEach(shopId => {
            if (!viewMap[shopId]) {
              viewMap[shopId] = 0
            }
            viewMap[shopId]++
          })
        }
      })
      
      // 9. 组装数据
      let results = stalls.map(stall => {
        const products = productsByShop[stall._id] || []
        const reviews = reviewsByShop[stall._id] || []
        
        // 计算平均评分
        let avgRating = stall.rating || 0
        if (reviews.length > 0) {
          const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
          avgRating = Math.round((sum / reviews.length) * 10) / 10
        }
        
        // 真实月销量（从订单统计）
        const monthlySales = salesMap[stall._id] || 0
        
        // 判断是否有优惠（优惠券功能暂缓，先设为 false）
        const hasCoupon = false
        
        // 排队人数
        const queue = queueMap[stall._id] || 0
        const waitTime = queue * 3   // 先模拟，假设每人3分钟

        // 真实收藏数
        const favoritesCount = favoritesMap[stall._id] || 0
        
        // 真实评论数（作为 views 的参考）
        const reviewsCount = viewMap[stall._id] || 0
        
        // 点赞数（暂无，设为0）
        const likesCount = 0
        
        return {
          id: stall._id,
          name: stall.shopName,
          category: stall.category || '其他',
          queue: queue,
          waitTime: waitTime,
          rating: avgRating,
          distance: stall.location || '校园内',
          status: stall.status,
          hasCoupon: hasCoupon,
          coupon: '',
          couponValue: 0,
          address: stall.location,
          tags: [],
          views: reviewsCount,
          likes: likesCount,
          favorites: favoritesCount,
          monthlySales: monthlySales,
          repeatRate: 0,  // 暂无数据
          products: products.map(p => ({
            id: p._id,
            name: p.name,
            price: p.price,
            stock: 50,
            sold: p.salesCount || 0
          })),
          isLive: false
        }
      })
      
      this.setData({ loading: false })
      return results
      
    } catch (err) {
      console.error('获取摊位失败', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
      return []
    }
  },

  // 计算推荐分
  calculateScore(stall, keyword) {
    let score = 0;
  
    // 1. 评分（满分 40 分）- 核心指标
    score += (stall.rating / 5) * 40;
    
    // 2. 月销量（满分 25 分）- 越多人买越好
    // 假设月销 500 为满分，超过按满分算
    const salesScore = Math.min(stall.monthlySales / 500, 1) * 25;
    score += salesScore;
    
    // 3. 收藏数（满分 15 分）
    const favScore = Math.min(stall.favorites / 20, 1) * 15;
    score += favScore;
    
    // 4. 浏览量/评论数（满分 10 分）
    const viewScore = Math.min(stall.views / 20, 1) * 10;
    score += viewScore;
    
    // 5. 排队人数（满分 10 分）- 排队人多说明受欢迎，不扣分
    // 假设排队 10 人为满分
    const queueScore = Math.min(stall.queue / 10, 1) * 10;
    score += queueScore;

    // 6. 关键词匹配加分（+5 分）
    if (keyword) {
      const searchText = `${stall.name}${stall.category}`.toLowerCase();
      if (searchText.indexOf(keyword.toLowerCase()) > -1) {
        score += 5;
      }
    }
    
    // 确保分数在 0-100 之间
    return Math.round(Math.min(100, Math.max(0, score)));
  },

  getReason(stall) {
    const reasons = [];
    if (stall.hasCoupon) reasons.push(stall.coupon);
    if (stall.queue <= 3) reasons.push(`排队${stall.queue}人`);
    if (stall.rating >= 4.5) reasons.push(`评分${stall.rating}`);
    if (stall.isLive) reasons.push('直播看队尾');
    if (reasons.length < 2) reasons.push(`${stall.monthlySales}月销量`);
    return reasons.slice(0, 3).join(' · ');
  },

  // 匹配关键词
  matchKeyword(stall, keyword) {
    const keywordText = (keyword || '').trim();
    if (!keywordText) return true;
    
    if (keywordText === '排队少') return stall.queue <= 3;
    if (keywordText === '有优惠') return stall.hasCoupon;
    if (keywordText === '高评分') return stall.rating >= 4.5;
    
    const productText = stall.products.map(item => item.name).join('');
    const searchText = `${stall.name}${stall.category}${productText}`;
    return searchText.indexOf(keywordText) > -1;
  },

  // 匹配筛选
  matchFilter(stall) {
    const filter = this.data.activeFilter;
    if (filter === 'shortQueue') return stall.queue <= 3;
    if (filter === 'coupon') return stall.hasCoupon;
    if (filter === 'highRating') return stall.rating >= 4.5;
    return true;
  },

  // 装饰结果
  decorateResult(stall) {
    const favoriteIds = this.data.favoriteIds || [];
    return {
      ...stall,
      isFavorite: favoriteIds.indexOf(stall.id) > -1,
      productText: stall.products.slice(0, 3).map(item => `${item.name} ¥${item.price}`).join(' / '),
      queueLevel: stall.queue <= 3 ? '轻松' : stall.queue <= 6 ? '较忙' : '拥挤',
      score: this.calculateScore(stall, this.data.searchKeyword),
      reason: this.getReason(stall),
      tagText: stall.tags.slice(0, 3).join(' · ')
    };
  },

  // 排序
  sortResults(results) {
    const sortKey = this.data.sortKey;
    const sorted = [...results];
    
    if (sortKey === 'wait') {
      return sorted.sort((a, b) => a.waitTime - b.waitTime);
    }
    if (sortKey === 'sales') {
      return sorted.sort((a, b) => b.monthlySales - a.monthlySales);
    }
    if (sortKey === 'rating') {
      return sorted.sort((a, b) => b.rating - a.rating);
    }
    return sorted.sort((a, b) => b.score - a.score);
  },

  // 获取统计摘要
  getSummary(results) {
    const count = results.length;
    const avgWait = count
      ? Math.round(results.reduce((sum, item) => sum + item.waitTime, 0) / count)
      : 0;
    const couponCount = results.filter(item => item.hasCoupon).length;
    return { count, avgWait, couponCount };
  },

  // 刷新结果
  async refreshResults(keyword, shouldSaveHistory) {
    if (this.data.loading) return;

    // 重新获取最新收藏列表
    const userInfo = wx.getStorageSync('userInfo') || {};
    let favoriteIds = [];
    if (userInfo._id) {
      const db = wx.cloud.database();
      const favRes = await db.collection('favorites').where({ userId: userInfo._id }).get();
      favoriteIds = favRes.data.map(item => item.stallId);
      this.setData({ favoriteIds });
    }
    
    const stalls = await this.getAllStalls(keyword);
    
    let results = stalls
      .filter(item => this.matchKeyword(item, keyword))
      .filter(item => this.matchFilter(item))
      .map(item => this.decorateResult(item));
    
    results = this.sortResults(results);
    
    if (shouldSaveHistory && keyword.trim()) {
      this.saveHistory(keyword.trim());
    }
    
    this.setData({
      results,
      summary: this.getSummary(results)
    });
  },

  // ========== 事件处理 ==========
  onSearchInput(e) {
    const searchKeyword = e.detail.value || '';
    this.setData({ searchKeyword }, () => {
      this.refreshResults(searchKeyword, false);
    });
  },

  confirmSearch() {
    this.refreshResults(this.data.searchKeyword, true);
  },

  searchHotKeyword(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchKeyword: keyword }, () => {
      this.refreshResults(keyword, true);
    });
  },

  selectFilter(e) {
    const activeFilter = e.currentTarget.dataset.key;
    this.setData({ activeFilter }, () => {
      this.refreshResults(this.data.searchKeyword, false);
    });
  },

  selectSort(e) {
    const sortKey = e.currentTarget.dataset.key;
    this.setData({ sortKey }, () => {
      this.refreshResults(this.data.searchKeyword, false);
    });
  },

  saveHistory(keyword) {
    const searchHistory = [keyword, ...this.data.searchHistory.filter(item => item !== keyword)].slice(0, 8);
    wx.setStorageSync('searchHistory', searchHistory);
    this.setData({ searchHistory });
  },

  clearSearch() {
    this.setData({ searchKeyword: '' }, () => {
      this.refreshResults('', false);
    });
  },

  clearHistory() {
    wx.removeStorageSync('searchHistory');
    this.setData({ searchHistory: [] });
  },

  async toggleFavorite(e) {
    const id = e.currentTarget.dataset.id;
    const userInfo = wx.getStorageSync('userInfo') || {};
  
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    const db = wx.cloud.database();
    const existing = await db.collection('favorites').where({
      userId: userInfo._id,
      stallId: id
    }).get();
    
    if (existing.data.length > 0) {
      await db.collection('favorites').doc(existing.data[0]._id).remove();
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      await db.collection('favorites').add({
        data: { userId: userInfo._id, stallId: id, createTime: new Date() }
      });
      wx.showToast({ title: '已收藏', icon: 'success' });
    }
    
    this.refreshResults(this.data.searchKeyword, false);
  },

  goToMap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/Map/Map?stallId=${id}`
    });
  },

  goToOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/StallDetail/StallDetail?id=${id}`,
    })  }
});