// app.js
App({
  onLaunch: function () {
    console.log("TenEats 启动！");
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d4gr0o1h16e4afe57', // 替换为您的云环境ID
        traceUser: true
      })
    }
  },
  globalData: {
    userInfo: null,
    isLogin: false
  }
});
