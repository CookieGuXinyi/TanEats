// pages/SearchReview/SearchReview.js
Page({
  data: {
    searchText: '',
    autoFocus: true,
    hasSearched: false,
    searchResults: [],
    filterType: 'all',  // all, latest, rating, like
    searchHistory: [],
    hotSearches: ['夜宵', '宝藏小店', '排队王', '实惠', '奶茶', '炸串', '绿豆汤'],
    
    displayList: [],
    defaultList: [], 
    currentPage: 1,
    pageSize: 5,
    hasMore: false,
    loading: false,
    loadingMore: false,
    totalCount: 0
  },

  onLoad(options) {
    this.loadSearchHistory()
    this.loadDefaultReviews()
    if (options.keyword) {
      this.setData({ searchText: options.keyword })
      this.doSearch()
    }
  },

  onReachBottom() {
    // 滚动到底部加载更多
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore()
    }
  },

  // 加载默认最新评论
  async loadDefaultReviews(reset = true) {
    if (reset) {
      this.setData({ 
        currentPage: 1, 
        hasMore: true, 
        defaultList: [],
        displayList: [],
        totalCount: 0
      })
    }
    
    if (!this.data.hasMore && !reset) return
    
    this.setData({ loadingMore: !reset })
    
    try {
      const db = wx.cloud.database()
      const skip = (this.data.currentPage - 1) * this.data.pageSize
      
      // 获取总数
      if (reset) {
        const countRes = await db.collection('reviews').count()
        this.setData({ totalCount: countRes.total })
      }
      
      // 分页获取数据
      const res = await db.collection('reviews')
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(this.data.pageSize)
        .get()
      
      const newList = res.data.map(item => ({
        ...item,
        time: this.formatTime(item.createTime)
      }))
      
      const defaultList = reset ? newList : [...this.data.defaultList, ...newList]
      const hasMore = defaultList.length < this.data.totalCount
      
      this.setData({
        defaultList: defaultList,
        displayList: defaultList,
        currentPage: this.data.currentPage + 1,
        hasMore: hasMore,
        loadingMore: false
      })
      
    } catch (err) {
      console.error('加载默认评论失败', err)
      // 使用模拟数据
      this.loadMockDefaultReviews(reset)
      this.setData({ loadingMore: false })
    }
  },

  // 加载更多（滚动分页）
  async loadMore() {
    if (this.data.hasSearched) {
      // 搜索模式分页
      await this.loadMoreSearch()
    } else {
      // 默认模式分页
      await this.loadDefaultReviews(false)
    }
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || []
      this.setData({ searchHistory: history.slice(0, 10) })
    } catch (e) {
      console.error('加载搜索历史失败', e)
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    if (!keyword.trim()) return
    
    try {
      let history = wx.getStorageSync('searchHistory') || []
      // 移除重复项
      history = history.filter(item => item !== keyword)
      // 添加到最前面
      history.unshift(keyword)
      // 只保留最近10条
      history = history.slice(0, 10)
      wx.setStorageSync('searchHistory', history)
      this.setData({ searchHistory: history })
    } catch (e) {
      console.error('保存搜索历史失败', e)
    }
  },

  // 清空搜索历史
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory')
          this.setData({ searchHistory: [] })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchText: e.detail.value })
  },

  // 清空搜索
  clearSearch() {
    this.setData({ searchText: '', hasSearched: false, searchResults: [] })
  },

  // 执行搜索
  async doSearch() {
    const keyword = this.data.searchText.trim()
    if (!keyword) {
      wx.showToast({ title: '请输入搜索内容', icon: 'none' })
      return
    }

    this.saveSearchHistory(keyword)
    this.setData({ hasSearched: true, searchResults: [], filterType: 'all' })
    
    wx.showLoading({ title: '搜索中...' })

    try {
      const db = wx.cloud.database()
      
      // 构建查询条件
      const _ = db.command
      let query = db.collection('reviews').where(
        _.or([
          { content: db.RegExp({ regexp: keyword, options: 'i' }) },
          { reviewerName: db.RegExp({ regexp: keyword, options: 'i' }) },
          { shopNames: db.RegExp({ regexp: keyword, options: 'i' }) },
          { tags: db.RegExp({ regexp: keyword, options: 'i' }) }
        ])
      )
      
      const res = await query.get()
      
      // 处理结果
      let results = res.data.map(item => ({
        ...item,
        time: this.formatTime(item.createTime),
        highlightedContent: this.highlightKeyword(item.content, keyword)
      }))
      
      // 排序
      results = this.sortResults(results, this.data.filterType)
      
      this.setData({ searchResults: results })
      wx.hideLoading()
      
    } catch (err) {
      wx.hideLoading()
      console.error('搜索失败', err)
      // 降级：使用本地模拟数据
      this.mockSearch(keyword)
    }
  },

  // 模拟搜索（降级方案）
  mockSearch(keyword) {
    // 模拟数据，实际项目中可删除
    const mockResults = [
      { _id: '1', reviewerName: '吃货小张', rating: 5, content: `${keyword}超级好吃！排队也值得`, shopNames: ['周姐炸串'], tags: ['夜宵'], likeCount: 23, createTime: new Date() },
      { _id: '2', reviewerName: '奶茶控', rating: 4, content: `${keyword}实惠又美味`, shopNames: ['高校夜市奶茶'], tags: ['奶茶', '实惠'], likeCount: 12, createTime: new Date() }
    ]
    const results = mockResults.map(item => ({
      ...item,
      time: this.formatTime(item.createTime),
      highlightedContent: this.highlightKeyword(item.content, keyword)
    }))
    this.setData({ searchResults: results })
  },

  // 高亮关键词
  highlightKeyword(text, keyword) {
    if (!text || !keyword) return text
    const regex = new RegExp(`(${keyword})`, 'gi')
    return text.replace(regex, '<span class="highlight">$1</span>')
  },

  // 排序结果
  sortResults(results, filterType) {
    const sorted = [...results]
    switch (filterType) {
      case 'latest':
        return sorted.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating)
      case 'like':
        return sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      default:
        return sorted
    }
  },

  // 设置筛选
  setFilter(e) {
    const filterType = e.currentTarget.dataset.type
    this.setData({ filterType })
    const sorted = this.sortResults(this.data.searchResults, filterType)
    this.setData({ searchResults: sorted })
  },

  // 点击历史搜索
  searchHistory(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ searchText: keyword })
    this.doSearch()
  },

  // 点击热门搜索
  searchHot(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ searchText: keyword })
    this.doSearch()
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    return `${month}月${day}日 ${hour}:${minute}`
  },

  // 跳转到评论详情
  goToReview(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/ReviewDetail/ReviewDetail?id=${id}`
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})