// pages/Search/Search.js
let mockData = null;

try {
  mockData = require('../../utils/mockData.js');
} catch (e) {
  mockData = null;
}

const fallbackStalls = [
  {
    id: 1,
    name: '六号门炸串局',
    category: '小吃炸串',
    queue: 3,
    waitTime: 6,
    rating: 4.9,
    distance: '90m',
    status: '营业中',
    isLive: true,
    hasCoupon: true,
    coupon: '满20减3',
    couponValue: 3,
    address: '南科大六号门外美食车 A1',
    tags: ['脆皮年糕', '鸡柳', '夜宵热门'],
    views: 1268,
    likes: 238,
    favorites: 96,
    monthlySales: 2380,
    repeatRate: 0.42,
    products: [
      { id: 101, name: '招牌炸串套餐', price: 18, stock: 42, sold: 126 },
      { id: 102, name: '脆皮年糕', price: 6, stock: 60, sold: 88 }
    ]
  },
  {
    id: 2,
    name: '荔园螺蛳粉',
    category: '粉面主食',
    queue: 7,
    waitTime: 14,
    rating: 4.7,
    distance: '160m',
    status: '营业中',
    isLive: false,
    hasCoupon: true,
    coupon: '粉面+饮品减4',
    couponValue: 4,
    address: '六号门斜对面临时摊位 B3',
    tags: ['酸笋加量', '微辣推荐', '堂食'],
    views: 980,
    likes: 155,
    favorites: 72,
    monthlySales: 1680,
    repeatRate: 0.36,
    products: [
      { id: 201, name: '经典螺蛳粉', price: 16, stock: 28, sold: 82 },
      { id: 202, name: '加炸蛋螺蛳粉', price: 21, stock: 20, sold: 66 }
    ]
  },
  {
    id: 3,
    name: '创园椰子冻',
    category: '甜品饮品',
    queue: 1,
    waitTime: 3,
    rating: 4.8,
    distance: '120m',
    status: '营业中',
    isLive: false,
    hasCoupon: true,
    coupon: '第二件半价',
    couponValue: 5,
    address: '六号门进入后右侧移动摊位 C2',
    tags: ['椰子冻', '低糖', '拼单友好'],
    views: 1115,
    likes: 210,
    favorites: 104,
    monthlySales: 1920,
    repeatRate: 0.47,
    products: [
      { id: 301, name: '原味椰子冻', price: 15, stock: 36, sold: 96 },
      { id: 302, name: '芒果椰子冻', price: 18, stock: 18, sold: 64 }
    ]
  },
  {
    id: 4,
    name: '湖畔铁板炒饭',
    category: '主食快餐',
    queue: 5,
    waitTime: 10,
    rating: 4.6,
    distance: '180m',
    status: '营业中',
    isLive: true,
    hasCoupon: false,
    coupon: '',
    couponValue: 0,
    address: '六号门往荔园方向 80 米 D5',
    tags: ['加蛋', '火腿炒饭', '现炒'],
    views: 842,
    likes: 118,
    favorites: 49,
    monthlySales: 1420,
    repeatRate: 0.31,
    products: [
      { id: 401, name: '鸡蛋火腿炒饭', price: 14, stock: 34, sold: 78 },
      { id: 402, name: '黑椒牛肉炒饭', price: 20, stock: 16, sold: 42 }
    ]
  },
  {
    id: 5,
    name: '科研楼手打柠檬茶',
    category: '奶茶饮品',
    queue: 2,
    waitTime: 5,
    rating: 4.8,
    distance: '210m',
    status: '营业中',
    isLive: false,
    hasCoupon: true,
    coupon: '新客立减2',
    couponValue: 2,
    address: '六号门外共享单车点旁 E1',
    tags: ['鸭屎香', '少糖', '解腻'],
    views: 760,
    likes: 132,
    favorites: 68,
    monthlySales: 1180,
    repeatRate: 0.39,
    products: [
      { id: 501, name: '鸭屎香柠檬茶', price: 13, stock: 45, sold: 70 },
      { id: 502, name: '暴打香水柠檬茶', price: 12, stock: 38, sold: 64 }
    ]
  }
];

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
      { key: 'live', label: '直播中', icon: '📹' },
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
    }
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
    this.refreshResults(this.data.searchKeyword, false);
  },

  getAllStalls(keyword) {
    if (mockData && mockData.getRecommendedStalls) {
      return mockData.getRecommendedStalls(keyword);
    }

    return fallbackStalls
      .map(item => ({
        ...item,
        score: this.calculateScore(item, keyword),
        reason: this.getReason(item)
      }))
      .sort((a, b) => b.score - a.score);
  },

  calculateScore(stall, keyword) {
    const keywordText = (keyword || '').trim();
    const productText = stall.products.map(item => item.name).join('');
    const searchText = `${stall.name}${stall.category}${stall.tags.join('')}${productText}`;
    const keywordBoost = keywordText && searchText.indexOf(keywordText) > -1 ? 24 : 0;
    return Math.round(
      stall.rating * 14 +
      stall.monthlySales / 85 +
      stall.views / 120 +
      stall.likes / 25 +
      stall.favorites / 18 +
      stall.repeatRate * 20 +
      (stall.hasCoupon ? 12 + stall.couponValue : 0) +
      (stall.isLive ? 7 : 0) +
      keywordBoost -
      stall.queue * 2.2
    );
  },

  getReason(stall) {
    const reasons = [];
    if (stall.hasCoupon) reasons.push(stall.coupon);
    if (stall.queue <= 3) reasons.push(`排队${stall.queue}人`);
    if (stall.rating >= 4.8) reasons.push(`评分${stall.rating}`);
    if (stall.isLive) reasons.push('直播看队尾');
    if (reasons.length < 2) reasons.push(`${stall.monthlySales}月销量`);
    return reasons.slice(0, 3).join(' · ');
  },

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

  refreshResults(keyword, shouldSaveHistory) {
    let results = this.getAllStalls(keyword)
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

  matchKeyword(stall, keyword) {
    const keywordText = (keyword || '').trim();
    if (!keywordText) return true;

    if (keywordText === '排队少') return stall.queue <= 3;
    if (keywordText === '有优惠') return stall.hasCoupon;

    const productText = stall.products.map(item => item.name).join('');
    const searchText = `${stall.name}${stall.category}${stall.tags.join('')}${productText}`;
    return searchText.indexOf(keywordText) > -1;
  },

  matchFilter(stall) {
    const filter = this.data.activeFilter;
    if (filter === 'shortQueue') return stall.queue <= 3;
    if (filter === 'coupon') return stall.hasCoupon;
    if (filter === 'live') return stall.isLive;
    if (filter === 'highRating') return stall.rating >= 4.8;
    return true;
  },

  decorateResult(stall) {
    const favoriteIds = this.data.favoriteIds || [];
    return {
      ...stall,
      isFavorite: favoriteIds.indexOf(stall.id) > -1,
      productText: stall.products.slice(0, 3).map(item => `${item.name} ¥${item.price}`).join(' / '),
      queueLevel: stall.queue <= 3 ? '轻松' : stall.queue <= 6 ? '较忙' : '拥挤',
      tagText: stall.tags.slice(0, 3).join(' · ')
    };
  },

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

  getSummary(results) {
    const count = results.length;
    const avgWait = count
      ? Math.round(results.reduce((sum, item) => sum + item.waitTime, 0) / count)
      : 0;
    const couponCount = results.filter(item => item.hasCoupon).length;
    return { count, avgWait, couponCount };
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

  toggleFavorite(e) {
    const id = Number(e.currentTarget.dataset.id);
    let favoriteIds = wx.getStorageSync('favoriteStallIds') || [];

    if (favoriteIds.indexOf(id) > -1) {
      favoriteIds = favoriteIds.filter(item => item !== id);
    } else {
      favoriteIds.push(id);
    }

    wx.setStorageSync('favoriteStallIds', favoriteIds);
    this.setData({ favoriteIds }, () => {
      this.refreshResults(this.data.searchKeyword, false);
    });
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
      url: `/pages/Order/Order?stallId=${id}`
    });
  },

  askAi() {
    const keyword = this.data.searchKeyword || '今晚吃什么';
    wx.navigateTo({
      url: `/pages/AITalk/AiTalk?keyword=${keyword}`
    });
  }
});
