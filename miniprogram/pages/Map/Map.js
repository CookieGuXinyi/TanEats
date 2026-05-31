// pages/Map/Map.js
Page({
  data: {
    latitude: 31.230416,
    longitude: 121.473701,
    scale: 17,
    selectedFilter: 'all',
    searchText: '',
    markers: [],
    selectedStall: null,
    mapStats: {
      openCount: 0,
      avgWait: 0,
      couponCount: 0
    },
    filters: [
      { key: 'all', label: '全部摊位', icon: '🗺️' },
      { key: 'open', label: '营业中', icon: '🟢' },
      { key: 'shortQueue', label: '排队少', icon: '⚡' },
      { key: 'coupon', label: '有优惠', icon: '🎫' },
      { key: 'rating', label: '高评分', icon: '⭐' }
    ],
    stalls: [],        // 从数据库加载
    visibleStalls: []
  },

  // 摊位号 → 经纬度映射表（南科大小吃街）
  stallCoordinates: {
    // A区 1-10号
    1: { lat: 31.23072, lng: 121.47338 },
    2: { lat: 31.23068, lng: 121.47352 },
    3: { lat: 31.23064, lng: 121.47366 },
    4: { lat: 31.23060, lng: 121.47380 },
    5: { lat: 31.23056, lng: 121.47394 },
    6: { lat: 31.23052, lng: 121.47408 },
    7: { lat: 31.23048, lng: 121.47422 },
    8: { lat: 31.23044, lng: 121.47436 },
    9: { lat: 31.23040, lng: 121.47450 },
    10: { lat: 31.23036, lng: 121.47464 },
    // B区 11-20号
    11: { lat: 31.23018, lng: 121.47316 },
    12: { lat: 31.23014, lng: 121.47330 },
    13: { lat: 31.23010, lng: 121.47344 },
    14: { lat: 31.23006, lng: 121.47358 },
    15: { lat: 31.23002, lng: 121.47372 },
    16: { lat: 31.22998, lng: 121.47386 },
    17: { lat: 31.22994, lng: 121.47400 },
    18: { lat: 31.22990, lng: 121.47414 },
    19: { lat: 31.22986, lng: 121.47428 },
    20: { lat: 31.22982, lng: 121.47442 },
    // C区 21-30号
    21: { lat: 31.23091, lng: 121.47402 },
    22: { lat: 31.23087, lng: 121.47416 },
    23: { lat: 31.23083, lng: 121.47430 },
    24: { lat: 31.23079, lng: 121.47444 },
    25: { lat: 31.23075, lng: 121.47458 },
    // 按需继续添加...
  },

  // 默认坐标（未配置的摊位使用）
  defaultLat: 31.230416,
  defaultLng: 121.473701,

  async onLoad() {
    console.log('地图页加载');
    await this.loadStallsFromDB();
    this.updateVisibleStalls('all');
  },

  onShow() {
    this.mapCtx = wx.createMapContext('campusMap', this);
  },

  // 判断店铺是否在营业时间内
  isShopOpen(businessHours) {
    if (!businessHours) return false;
    
    // 解析营业时间，格式如："周一 17:00-23:00" 或 "周一至周五 17:00-23:00"
    const now = new Date();
    const currentWeekday = now.getDay() || 7;  // 周日为7
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotal = currentHour * 60 + currentMinute;
    
    // 获取星期几（中文）
    const weekMap = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' };
    const currentWeekStr = weekMap[currentWeekday];
    
    // 处理时间段格式
    const timeMatch = businessHours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!timeMatch) return false;
    
    const startTotal = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    const endTotal = parseInt(timeMatch[3]) * 60 + parseInt(timeMatch[4]);
    
    // 检查星期几是否匹配
    const weekPart = businessHours.split(' ')[0];
    let isWeekMatch = false;
    
    // 单个星期，如 "周一"
    if (weekPart === currentWeekStr) {
      isWeekMatch = true;
    }
    // 星期范围，如 "周一至周五"
    else if (weekPart.includes('至')) {
      const weekRange = weekPart.split('至');
      const startWeek = weekRange[0];
      const endWeek = weekRange[1];
      const weekOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      const startIndex = weekOrder.indexOf(startWeek);
      const endIndex = weekOrder.indexOf(endWeek);
      const currentIndex = weekOrder.indexOf(currentWeekStr);
      if (currentIndex >= startIndex && currentIndex <= endIndex) {
        isWeekMatch = true;
      }
    }
    
    if (!isWeekMatch) return false;
    
    // 判断时间是否在范围内
    return currentTotal >= startTotal && currentTotal <= endTotal;
  },

  // 从数据库加载摊位
  async loadStallsFromDB() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('stalls').where({
        status: 'active'
      }).get();

      const stalls = res.data;
      
      if (stalls.length === 0) {
        console.log('暂无摊位');
        return;
      }
      
      // 获取所有摊位ID
      const stallIds = stalls.map(s => s._id);
      
      // 获取真实排队人数
      const queueRes = await wx.cloud.callFunction({
        name: 'getQueueCount',
        data: { stallIds: stallIds }
      });
      
      const queueMap = queueRes.result.data || {};
      
      const formattedStalls = stalls.map((stall, index) => {
        const stallNumber = this.extractStallNumber(stall.location);
        const coords = this.stallCoordinates[stallNumber] || {
          lat: this.defaultLat,
          lng: this.defaultLng
        };
        const isOpen = this.isShopOpen(stall.businessHours);
        // 【修改】使用真实排队人数
        const queue = queueMap[stall._id] || 0;
        
        return {
          id: stall._id,
          markerId: index + 1,
          name: stall.shopName,
          category: stall.category || '其他',
          latitude: coords.lat,
          longitude: coords.lng,
          queue: queue,
          waitTime: queue * 3,
          rating: stall.rating || 0,
          status: isOpen ? '营业中' : '已打烊',
          isLive: false,
          hasCoupon: false,
          address: stall.location,
          stallNumber: stallNumber,
          businessHours: stall.businessHours,
          isOpen: isOpen,
          tags: []
        };
      });
      
      this.setData({ stalls: formattedStalls });
      console.log('加载摊位成功', formattedStalls.length);
      console.log('排队人数统计:', queueMap);
    } catch (err) {
      console.error('加载摊位失败', err);
      // 降级使用模拟数据
      this.loadMockStalls();
    }
  },

  // 解析地址中的摊位号（如 "2号摊位" → 2）
  extractStallNumber(address) {
    if (!address) return 0;
    const match = address.match(/(\d+)\s*号/);
    return match ? parseInt(match[1]) : 0;
  },

  // 根据地址获取坐标
  getCoordinatesFromAddress(stallNumber) {
    // 从映射表中查找
    if (this.stallCoordinates[stallNumber]) {
      return this.stallCoordinates[stallNumber];
    }
    // 未找到则返回默认坐标
    return {
      lat: this.areaBase.centerLat,
      lng: this.areaBase.centerLng
    };
  },

  // 降级模拟数据
  loadMockStalls() {
    const mockStalls = [
      { id: 1, markerId: 1, name: '周姐炸串', category: '炸串', rating: 4.9, address: '南科大小吃街1号摊位', stallNumber: 1 },
      { id: 2, markerId: 2, name: '柳州螺蛳粉', category: '粉面', rating: 4.7, address: '南科大小吃街8号摊位', stallNumber: 8 },
      { id: 3, markerId: 3, name: '椰子冻小屋', category: '甜品', rating: 4.8, address: '南科大小吃街15号摊位', stallNumber: 15 },
      { id: 4, markerId: 4, name: '铁板炒饭', category: '主食', rating: 4.6, address: '南科大小吃街22号摊位', stallNumber: 22 }
    ];

    const stalls = mockStalls.map(stall => {
      const coords = this.stallCoordinates[stall.stallNumber] || {
        lat: this.defaultLat,
        lng: this.defaultLng
      };
      return {
        ...stall,
        latitude: coords.lat,
        longitude: coords.lng,
        queue: Math.floor(Math.random() * 8),
        waitTime: 0
      };
    });
    this.setData({ stalls });
  },

  updateVisibleStalls(filterKey) {
    let visibleStalls = [...this.data.stalls];
    
    // 应用筛选
    if (filterKey === 'shortQueue') {
      visibleStalls = visibleStalls.filter(item => item.queue <= 3);
    } else if (filterKey === 'coupon') {
      visibleStalls = visibleStalls.filter(item => item.hasCoupon);
    } else if (filterKey === 'rating') {
      visibleStalls = visibleStalls.filter(item => item.rating >= 4.5);
    } else if (filterKey === 'open') {
      visibleStalls = visibleStalls.filter(item => item.isOpen === true);
    }

    // 应用搜索
    const keyword = this.data.searchText.trim();
    if (keyword) {
      visibleStalls = visibleStalls.filter(item => 
        item.name.indexOf(keyword) > -1 || 
        item.category.indexOf(keyword) > -1 ||
        (item.tags && item.tags.join('').indexOf(keyword) > -1)
      );
    }

    const markers = this.createMarkers(visibleStalls);
    const openCount = visibleStalls.filter(item => item.isOpen).length;
    const avgWait = visibleStalls.length && openCount > 0
      ? Math.round(visibleStalls.filter(item => item.isOpen).reduce((sum, item) => sum + item.waitTime, 0) / openCount)
      : 0;
    const couponCount = visibleStalls.filter(item => item.hasCoupon).length;

    this.setData({
      selectedFilter: filterKey,
      visibleStalls,
      markers,
      selectedStall: visibleStalls[0] || null,
      mapStats: { openCount, avgWait, couponCount }
    });
  },

  createMarkers(stalls) {
    const selectedId = this.data.selectedStall ? this.data.selectedStall.markerId : null;
    console.log('选中的markerId:', selectedId);

    return stalls.map(item => {
      const isSelected = item.markerId === selectedId;
      console.log(`店铺 ${item.name}: markerId=${item.markerId}, isSelected=${isSelected}`); 

      // 根据状态选择图标
      let iconPath;
      if (isSelected) {
        iconPath = '/images/icons/home-selected.png';  // 选中图标
      } else if (item.isOpen) {
        iconPath = '/images/icons/home-active.png';     // 营业中图标
      } else {
        iconPath = '/images/icons/home.png';            // 打烊图标
      }
      return {
      id: item.markerId,
      latitude: item.latitude,
      longitude: item.longitude,
      width: 34,
      height: 34,
      iconPath: iconPath,
      callout: {
        content: `${item.name} · ${item.isOpen ? item.queue + '人排队' : '已打烊'} · ⭐${item.rating}`,
        color: item.isOpen ? '#333333' : '#999999',
        fontSize: 12,
        borderRadius: 16,
        bgColor: '#ffffff',
        padding: 8,
        display: 'ALWAYS'
      },
      label: {
        content: item.isOpen ? (item.queue > 0 ? `${item.queue}` : '空') : '歇',
        color: '#ffffff',
        fontSize: 11,
        bgColor: !item.isOpen ? '#999999' : (item.queue > 5 ? '#ff4d4f' : '#ff7a1c'),
        borderRadius: 12,
        padding: 4,
        textAlign: 'center'
      }
    }});
  },

  // 其他方法保持不变...
  onSearchInput(e) {
    this.setData({ searchText: e.detail.value || '' }, () => {
      this.updateVisibleStalls(this.data.selectedFilter);
    });
  },

  clearSearch() {
    this.setData({ searchText: '' }, () => {
      this.updateVisibleStalls(this.data.selectedFilter);
    });
  },

  selectFilter(e) {
    const key = e.currentTarget.dataset.key;
    this.updateVisibleStalls(key);
  },

  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    const selectedStall = this.data.visibleStalls.find(item => item.markerId === markerId);
    if (selectedStall) {
      this.setData({ selectedStall });
      const markers = this.createMarkers(this.data.visibleStalls);
      this.setData({ markers });
    }
  },

  selectStall(e) {
    const id = e.currentTarget.dataset.id;
    const selectedStall = this.data.visibleStalls.find(item => item.id === id);
    if (selectedStall) {
      this.setData({ 
        selectedStall, 
        latitude: selectedStall.latitude,   // 改变地图中心纬度
        longitude: selectedStall.longitude  // 改变地图中心经度
      });
      const markers = this.createMarkers(this.data.visibleStalls);
      this.setData({ markers });
    }
  },

  useCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('获取到用户位置:', res);
        this.setData({ latitude: res.latitude, longitude: res.longitude, scale: 17 });
        wx.showToast({ title: '已定位', icon: 'success' });
        // 初始化地图上下文
        this.mapCtx = wx.createMapContext('campusMap', this);
      },
      fail: () => {
        wx.showToast({ title: '定位失败，请检查授权', icon: 'none' });
      }
    });
  },

  // TODO：暂时未实现
  navigateToStall() {
    const stall = this.data.selectedStall;
    if (!stall) {
      wx.showToast({ title: '请先选择摊位', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude: stall.latitude,
      longitude: stall.longitude,
      name: stall.name,
      address: stall.address,
      scale: 18
    });
  },

  callStall() {
    wx.showToast({ title: '联系功能开发中', icon: 'none' });
  },

  goToOrder() {
    const stallId = this.data.selectedStall.id;
    wx.navigateTo({
      url: `/pages/StallDetail/StallDetail?id=${stallId}`,
    })
  },

  viewLive() {
    wx.showToast({ title: '直播功能开发中', icon: 'none' });
  }
});