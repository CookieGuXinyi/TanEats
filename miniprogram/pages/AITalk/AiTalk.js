// pages/AITalk/AiTalk.js
Page({
  data: {
    messages: [
      { id: 1, content: '你好！我是吃货机器人 🍜 想吃什么？我可以帮你推荐附近的美食！', isUser: false, time: '10:00' }
    ],
    inputValue: '',
    scrollToView: 'bottom',
    quickQuestions: ['今晚吃什么', '排队最少的推荐', '今天有什么优惠', '推荐辣的'],
    loading: false
  },

  onLoad() {
    this.scrollToBottom();
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  async sendMessage() {
    const content = this.data.inputValue.trim();
    if (!content) return;
    if (this.data.loading) return;

    // 添加用户消息
    const userMsg = {
      id: Date.now(),
      content: content,
      isUser: true,
      time: this.getCurrentTime()
    };

    // 添加加载中的 AI 消息
    const pendingId = Date.now() + 1;
    const pendingMsg = {
      id: pendingId,
      content: '正在分析中...',
      isUser: false,
      time: this.getCurrentTime()
    };

    const newMessages = [...this.data.messages, userMsg, pendingMsg];
    
    this.setData({
      messages: newMessages,
      inputValue: '',
      loading: true
    });
    this.scrollToBottom();

    try {
      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo') || {};
      
      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'aiChat',
        data: {
          message: content,
          userId: userInfo._id || ''
        }
      });

      const result = res.result || {};
      
      // 重要：使用当前的 newMessages 进行更新，而不是 this.data.messages
      const updatedMessages = newMessages.map(msg => {
        if (msg.id === pendingId) {
          if (result.code === 200) {
            return { ...msg, content: result.data.answer };
          } else {
            return { ...msg, content: result.message || '服务暂时不可用，请稍后再试' };
          }
        }
        return msg;
      });

      this.setData({
        messages: updatedMessages,
        loading: false
      });
      
    } catch (err) {
      console.error('AI 调用失败', err);
      
      // 使用 newMessages 进行更新
      const updatedMessages = newMessages.map(msg => {
        if (msg.id === pendingId) {
          return { ...msg, content: '网络开了点小差，请稍后再试～' };
        }
        return msg;
      });

      this.setData({
        messages: updatedMessages,
        loading: false
      });
    }
    
    this.scrollToBottom();
  },

  sendQuickQuestion(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputValue: question });
    this.sendMessage();
  },

  getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollToView: 'bottom' });
    }, 100);
  },

  goToShop(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/StallDetail/StallDetail?id=${id}`
      });
    }
  }
});