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
      { key: 'shortQueue', label: '排队少', icon: '⚡' },
      { key: 'coupon', label: '有优惠', icon: '🎫' },
      { key: 'live', label: '直播中', icon: '📹' },
      { key: 'rating', label: '高评分', icon: '⭐' }
    ],
    stalls: [
      {
        id: 1,
        name: '周姐炸串',
        category: '炸串小吃',
        latitude: 31.23072,
        longitude: 121.47338,
        queue: 3,
        waitTime: 6,
        rating: 4.9,
        distance: '120m',
        status: '营业中',
        isLive: true,
        hasCoupon: true,
        coupon: '满20减3',
        phone: '13800000001',
        address: '校园美食街 A 区 03 号',
        tags: ['脆皮年糕', '鸡柳', '夜宵热门']
      },
      {
        id: 2,
        name: '柳州螺蛳粉',
        category: '粉面',
        latitude: 31.23018,
        longitude: 121.47416,
        queue: 7,
        waitTime: 14,
        rating: 4.7,
        distance: '260m',
        status: '营业中',
        isLive: false,
        hasCoupon: false,
        coupon: '',
        phone: '13800000002',
        address: '校园美食街 B 区 08 号',
        tags: ['酸笋加量', '微辣推荐', '堂食']
      },
      {
        id: 3,
        name: '椰子冻小屋',
        category: '甜品饮品',
        latitude: 31.23091,
        longitude: 121.47402,
        queue: 0,
        waitTime: 2,
        rating: 4.8,
        distance: '180m',
        status: '营业中',
        isLive: false,
        hasCoupon: true,
        coupon: '第二件半价',
        phone: '13800000003',
        address: '图书馆侧门移动摊位 02 号',
        tags: ['椰子冻', '低糖', '拼单友好']
      },
      {
        id: 4,
        name: '铁板炒饭',
        category: '主食快餐',
        latitude: 31.22992,
        longitude: 121.47363,
        queue: 5,
        waitTime: 10,
        rating: 4.6,
        distance: '210m',
        status: '营业中',
        isLive: true,
        hasCoupon: true,
        coupon: '学生卡减2',
        phone: '13800000004',
        address: '宿舍区南门 01 号',
        tags: ['加蛋', '火腿炒饭', '现炒']
      }
    ],
    visibleStalls: []
  },

  onLoad() {
    console.log('地图页加载');
    this.updateVisibleStalls('all');
  },

  onShow() {
    this.mapCtx = wx.createMapContext('campusMap', this);
  },

  updateVisibleStalls(filterKey) {
    const visibleStalls = this.filterStalls(filterKey);
    const markers = this.createMarkers(visibleStalls);
    const openCount = visibleStalls.filter(item => item.status === '营业中').length;
    const avgWait = visibleStalls.length
      ? Math.round(visibleStalls.reduce((sum, item) => sum + item.waitTime, 0) / visibleStalls.length)
      : 0;
    const couponCount = visibleStalls.filter(item => item.hasCoupon).length;

    this.setData({
      selectedFilter: filterKey,
      visibleStalls,
      markers,
      selectedStall: visibleStalls[0] || null,
      latitude: visibleStalls[0] ? visibleStalls[0].latitude : this.data.latitude,
      longitude: visibleStalls[0] ? visibleStalls[0].longitude : this.data.longitude,
      mapStats: {
        openCount,
        avgWait,
        couponCount
      }
    });
  },

  filterStalls(filterKey) {
    const keyword = this.data.searchText.trim();
    let result = this.data.stalls;

    if (filterKey === 'shortQueue') {
      result = result.filter(item => item.queue <= 3);
    } else if (filterKey === 'coupon') {
      result = result.filter(item => item.hasCoupon);
    } else if (filterKey === 'live') {
      result = result.filter(item => item.isLive);
    } else if (filterKey === 'rating') {
      result = result.filter(item => item.rating >= 4.8);
    }

    if (keyword) {
      result = result.filter(item => {
        return item.name.indexOf(keyword) > -1 ||
          item.category.indexOf(keyword) > -1 ||
          item.tags.join('').indexOf(keyword) > -1;
      });
    }

    return result;
  },

  createMarkers(stalls) {
    return stalls.map(item => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      width: 34,
      height: 34,
      iconPath: '/images/icons/goods-active.png',
      callout: {
        content: `${item.name} · ${item.queue}人排队`,
        color: '#333333',
        fontSize: 12,
        borderRadius: 16,
        bgColor: '#ffffff',
        padding: 8,
        display: 'ALWAYS'
      },
      label: {
        content: item.queue > 0 ? `${item.queue}` : '快',
        color: '#ffffff',
        fontSize: 11,
        bgColor: item.queue > 5 ? '#ff4d4f' : '#ff7a1c',
        borderRadius: 12,
        padding: 4,
        textAlign: 'center'
      }
    }));
  },

  onSearchInput(e) {
    this.setData({
      searchText: e.detail.value || ''
    }, () => {
      this.updateVisibleStalls(this.data.selectedFilter);
    });
  },

  clearSearch() {
    this.setData({
      searchText: ''
    }, () => {
      this.updateVisibleStalls(this.data.selectedFilter);
    });
  },

  selectFilter(e) {
    const key = e.currentTarget.dataset.key;
    this.updateVisibleStalls(key);
  },

  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    const selectedStall = this.data.visibleStalls.find(item => item.id === markerId);

    if (!selectedStall) return;

    this.setData({
      selectedStall,
      latitude: selectedStall.latitude,
      longitude: selectedStall.longitude
    });
  },

  selectStall(e) {
    const id = Number(e.currentTarget.dataset.id);
    const selectedStall = this.data.visibleStalls.find(item => item.id === id);

    if (!selectedStall) return;

    this.setData({
      selectedStall,
      latitude: selectedStall.latitude,
      longitude: selectedStall.longitude
    });

    if (this.mapCtx) {
      this.mapCtx.moveToLocation({
        latitude: selectedStall.latitude,
        longitude: selectedStall.longitude
      });
    }
  },

  useCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          scale: 17
        });
        wx.showToast({
          title: '已定位到当前位置',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '定位失败，请检查授权',
          icon: 'none'
        });
      }
    });
  },

  navigateToStall() {
    const stall = this.data.selectedStall;

    if (!stall) {
      wx.showToast({
        title: '请先选择摊位',
        icon: 'none'
      });
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
    const stall = this.data.selectedStall;

    if (!stall) return;

    wx.showModal({
      title: stall.name,
      content: `联系摊主确认排队情况？\n${stall.phone}`,
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: stall.phone
          });
        }
      }
    });
  },

  joinGroupOrder() {
    wx.showToast({
      title: '拼单功能开发中',
      icon: 'none'
    });
  },

  viewLive() {
    const stall = this.data.selectedStall;

    if (!stall || !stall.isLive) {
      wx.showToast({
        title: '该摊位暂未直播',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: '直播入口开发中',
      icon: 'none'
    });
  },

  askAi() {
    wx.navigateTo({
      url: '/pages/AITalk/AiTalk'
    });
  }
});
