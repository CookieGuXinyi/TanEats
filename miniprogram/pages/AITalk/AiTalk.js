// pages/AITalk/AiTalk.js
Page({
  data: {
    messages: [
      { id: 1, content: '你好！我是吃货机器人 🍜 想吃什么？我可以帮你推荐附近的美食！', isUser: false, time: '10:00' }
    ],
    inputValue: '',
    scrollToView: 'bottom',
    quickQuestions: ['今晚吃什么', '排队最少的推荐', '今天有什么优惠', '推荐辣的']
  },

  onLoad() {
    this.scrollToBottom();
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  sendMessage() {
    const content = this.data.inputValue.trim();
    if (!content) return;

    // 添加用户消息
    const userMsg = {
      id: Date.now(),
      content: content,
      isUser: true,
      time: this.getCurrentTime()
    };

    // AI 响应（模拟）
    const aiResponse = this.getAIResponse(content);
    const aiMsg = {
      id: Date.now() + 1,
      content: aiResponse,
      isUser: false,
      time: this.getCurrentTime()
    };

    this.setData({
      messages: [...this.data.messages, userMsg, aiMsg],
      inputValue: ''
    });
    this.scrollToBottom();
  },

  sendQuickQuestion(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputValue: question });
    this.sendMessage();
  },

  getAIResponse(question) {
    // 模拟 AI 响应，后期可接入真实 AI 接口
    const responses = [
      '根据实时数据，推荐您试试"周姐炸串"，目前排队3人，评分4.8！',
      '今晚"柳州螺蛳粉"有跨店优惠，搭配奶茶立减3元～',
      '根据您的位置，附近"铁板炒饭"现在排队较少，约5分钟可取。',
      '推荐您尝尝"酸辣粉"，目前有买一送一活动，热度很高！'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  },

  getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollToView: 'bottom' });
    }, 100);
  }
});