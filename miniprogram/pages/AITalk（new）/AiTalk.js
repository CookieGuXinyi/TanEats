// pages/AITalk/AiTalk.js
Page({
  data: {
    inputValue: '',
    loading: false,
    scrollIntoView: '',
    quickQuestions: [
      '现在有什么排队少的推荐？',
      '20元以内吃什么比较好？',
      '想吃辣一点的夜宵',
      '评分高的店铺有哪些？'
    ],
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '你好，我是 TanEats AI 点餐助手。你可以问我现在吃什么、哪家排队少、预算内怎么选，或者按口味找店铺。',
        sourceShops: []
      }
    ]
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: 'AI 点餐助手' })
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  sendQuickQuestion(e) {
    const question = e.currentTarget.dataset.question
    this.setData({ inputValue: question }, () => {
      this.sendMessage()
    })
  },

  async sendMessage() {
    const message = (this.data.inputValue || '').trim()

    if (!message) {
      wx.showToast({ title: '请输入问题', icon: 'none' })
      return
    }

    if (this.data.loading) return

    const userMessage = this.createMessage('user', message)
    const pendingMessage = this.createMessage('assistant', '正在结合当前店铺、菜单、评价和排队情况分析...')
    const historyForApi = this.buildHistory([...this.data.messages, userMessage])
    const messages = [...this.data.messages, userMessage, pendingMessage]

    this.setData({
      messages,
      inputValue: '',
      loading: true,
      scrollIntoView: pendingMessage.id
    })

    try {
      const userInfo = wx.getStorageSync('userInfo') || {}
      const res = await wx.cloud.callFunction({
        name: 'aiChat',
        data: {
          message,
          userId: userInfo._id || '',
          history: historyForApi
        }
      })

      const result = res.result || {}
      if (result.code !== 200) {
        throw new Error(result.message || 'AI 服务暂时不可用')
      }

      this.replaceMessage(pendingMessage.id, {
        content: result.data.answer,
        sourceShops: result.data.sourceShops || [],
        usedFallback: result.data.usedFallback || false
      })
    } catch (err) {
      console.error('AI 问答失败', err)
      this.replaceMessage(pendingMessage.id, {
        content: '我暂时没能连上 AI 服务。你可以稍后再试，或者先去搜索页按评分、排队和分类筛选店铺。',
        sourceShops: [],
        usedFallback: true
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  createMessage(role, content) {
    return {
      id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      sourceShops: []
    }
  },

  replaceMessage(id, patch) {
    const messages = this.data.messages.map(item => {
      if (item.id !== id) return item
      return { ...item, ...patch }
    })

    this.setData({
      messages,
      scrollIntoView: id
    })
  },

  buildHistory(messages) {
    return messages
      .filter(item => item.role === 'user' || item.role === 'assistant')
      .slice(-8)
      .map(item => ({
        role: item.role,
        content: item.content
      }))
  },

  goToShop(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return

    wx.navigateTo({
      url: `/pages/StallDetail/StallDetail?id=${id}`
    })
  },

  clearChat() {
    if (this.data.loading) return

    wx.showModal({
      title: '清空对话',
      content: '确定清空当前 AI 对话吗？',
      success: (res) => {
        if (!res.confirm) return
        this.setData({
          inputValue: '',
          scrollIntoView: 'welcome',
          messages: [
            {
              id: 'welcome',
              role: 'assistant',
              content: '对话已清空。你可以继续问我现在吃什么、哪家排队少、预算内怎么选。',
              sourceShops: []
            }
          ]
        })
      }
    })
  }
})
