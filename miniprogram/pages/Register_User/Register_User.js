// pages/Register_User/Register_User.js
Page({
  data: {
    currentTab: 'login',
    
    // 登录相关
    loginPhone: '',
    loginPassword: '',
    rememberMe: false,
    canLogin: false,
    
    // 注册相关
    username: '',
    regPhone: '',
    regPassword: '',
    confirmPassword: '',
    verifyCode: '',
    agreeTerms: false,
    canRegister: false,
    
    // 验证码倒计时
    codeText: '获取验证码',
    canGetCode: false,
    countdown: 0
  },

  onLoad() {
    // 检查是否有保存的登录信息
    this.checkSavedLogin();
  },

  // 检查保存的登录信息
  checkSavedLogin() {
    try {
      const savedPhone = wx.getStorageSync('savedPhone');
      const savedPwd = wx.getStorageSync('savedPwd');
      if (savedPhone && savedPwd) {
        this.setData({
          loginPhone: savedPhone,
          loginPassword: savedPwd,
          rememberMe: true,
          canLogin: true
        });
      }
    } catch (e) {
      console.log('读取缓存失败', e);
    }
  },

  // 切换登录/注册
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  // ========== 登录相关 ==========
  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({ 
      loginPhone: phone,
      canLogin: phone.length === 11 && this.data.loginPassword.length >= 6
    });
  },

  onPasswordInput(e) {
    const pwd = e.detail.value;
    this.setData({ 
      loginPassword: pwd,
      canLogin: this.data.loginPhone.length === 11 && pwd.length >= 6
    });
  },

  toggleRemember() {
    this.setData({ rememberMe: !this.data.rememberMe });
  },

  forgotPassword() {
    wx.showModal({
      title: '提示',
      content: '请联系客服重置密码\n客服邮箱: support@taneats.com',
      showCancel: false
    });
  },

  // 手机号登录
  handleLogin() {
    if (!this.data.canLogin) {
      wx.showToast({ title: '请输入正确的手机号和密码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...' });
    
    wx.cloud.callFunction({
      name: 'userLogin',
      data: {
        action: 'login',
        phone: this.data.loginPhone,
        password: this.data.loginPassword
      },
      success: (res) => {
        wx.hideLoading()
        
        if (res.result.code === 200) {
          // 保存登录状态
          if (this.data.rememberMe) {
            wx.setStorageSync('savedPhone', this.data.loginPhone)
            wx.setStorageSync('savedPwd', this.data.loginPassword)
          }
          
          const userInfo = res.result.data
          wx.setStorageSync('isLogin', true)
          wx.setStorageSync('userInfo', userInfo)
          
          wx.showToast({ title: '登录成功', icon: 'success' })
          
          setTimeout(() => {
            wx.navigateBack({
              fail: () => {
                wx.switchTab({ url: '/pages/Profile/Profile' })
              }
            })
          }, 1500)
        } else {
          wx.showToast({ title: res.result.message, icon: 'error' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('登录失败', err)
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    })
  },

  // 微信登陆，TODO:尚未能正确获取用户授权信息
  doWxLogin() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        // 获取到微信用户信息后，再调用云函数
        const wxUserInfo = res.userInfo
        
        wx.showLoading({ title: '登录中...' })
        
        wx.cloud.callFunction({
          name: 'userLogin',
          data: {
            action: 'wxLogin'
          },
          success: (result) => {
            wx.hideLoading()
            
            if (result.result.code === 200) {
              const userInfo = result.result.data
              // 合并微信头像昵称
              userInfo.nickname = wxUserInfo.nickName
              userInfo.avatar = wxUserInfo.avatarUrl
              
              wx.setStorageSync('isLogin', true)
              wx.setStorageSync('userInfo', userInfo)
              
              wx.showToast({ title: '登录成功', icon: 'success' })
              
              setTimeout(() => {
                wx.navigateBack({
                  fail: () => {
                    wx.switchTab({ url: '/pages/Profile/Profile' })
                  }
                })
              }, 1500)
            } else {
              wx.showToast({ title: result.result.message, icon: 'error' })
            }
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('微信登录失败', err)
            wx.showToast({ title: '网络错误，请重试', icon: 'none' })
          }
        })
      },
      fail: (err) => {
        console.log('授权失败', err)
        wx.showToast({ title: '您拒绝了授权', icon: 'none' })
      }
    })
  },

  // ========== 注册相关 ==========
  onUsernameInput(e) {
    const username = e.detail.value;
    this.setData({ username });
    this.checkRegisterValid();
  },

  onRegPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({ regPhone: phone });
    this.checkRegisterValid();
    // 手机号11位时可获取验证码
    this.setData({ canGetCode: phone.length === 11 });
  },

  onRegPasswordInput(e) {
    const pwd = e.detail.value;
    this.setData({ regPassword: pwd });
    this.checkRegisterValid();
  },

  onConfirmPasswordInput(e) {
    const pwd = e.detail.value;
    this.setData({ confirmPassword: pwd });
    this.checkRegisterValid();
  },

  onCodeInput(e) {
    const code = e.detail.value;
    this.setData({ verifyCode: code });
    this.checkRegisterValid();
  },

  toggleAgree() {
    this.setData({ agreeTerms: !this.data.agreeTerms });
    this.checkRegisterValid();
  },

  checkRegisterValid() {
    const { username, regPhone, regPassword, confirmPassword, verifyCode, agreeTerms } = this.data;
    const isValid = username.trim().length > 0 &&
                    regPhone.length === 11 &&
                    regPassword.length >= 6 &&
                    regPassword === confirmPassword &&
                    verifyCode.length === 6 &&
                    agreeTerms === true;
    this.setData({ canRegister: isValid });
  },

  // 获取验证码
  getVerifyCode() {
    if (!this.data.canGetCode) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    
    if (this.data.countdown > 0) return;
    
    wx.showLoading({ title: '发送中...' })
    
    wx.cloud.callFunction({
      name: 'sendSms',
      data: { phone: this.data.regPhone },
      success: (res) => {
        wx.hideLoading()
        
        if (res.result.code === 200) {
          wx.showToast({ title: '验证码已发送', icon: 'success' })
          // 自动填充验证码（仅测试用）
          if (res.result.data && res.result.data.code) {
            this.setData({ verifyCode: res.result.data.code })
            this.checkRegisterValid()
          }
          
          // 倒计时
          let countdown = 60
          this.setData({ countdown, codeText: `${countdown}秒后重试`, canGetCode: false })
          
          const timer = setInterval(() => {
            countdown--
            if (countdown <= 0) {
              clearInterval(timer)
              this.setData({ 
                countdown: 0, 
                codeText: '获取验证码',
                canGetCode: this.data.regPhone.length === 11
              })
            } else {
              this.setData({ codeText: `${countdown}秒后重试` })
            }
          }, 1000)
        } else {
          wx.showToast({ title: res.result.message, icon: 'error' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('发送验证码失败', err)
        wx.showToast({ title: '发送失败，请重试', icon: 'none' })
      }
    })
  },

  handleRegister() {
    if (!this.data.canRegister) {
      let msg = '';
      if (!this.data.username) msg = '请输入用户名';
      else if (this.data.regPhone.length !== 11) msg = '请输入正确的手机号';
      else if (this.data.regPassword.length < 6) msg = '密码至少6位';
      else if (this.data.regPassword !== this.data.confirmPassword) msg = '两次密码不一致';
      else if (this.data.verifyCode !== '123456') msg = '验证码错误';
      else if (!this.data.agreeTerms) msg = '请同意用户协议';
      wx.showToast({ title: msg || '请完善信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '注册中...' });
    
    wx.cloud.callFunction({
      name: 'userLogin',
      data: {
        action: 'register',
        phone: this.data.regPhone,
        password: this.data.regPassword,
        nickname: this.data.username
      },
      success: (res) => {
        wx.hideLoading()
        
        if (res.result.code === 200) {
          wx.showToast({ title: '注册成功', icon: 'success' })
          
          // 自动填充登录表单
          this.setData({
            loginPhone: this.data.regPhone,
            loginPassword: this.data.regPassword,
            currentTab: 'login'
          })
          
          setTimeout(() => {
            // 自动登录
            this.handleLogin()
          }, 1500)
        } else {
          wx.showToast({ title: res.result.message, icon: 'error' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('注册失败', err)
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    })
  },

  wxRegister() {
    wx.showToast({ title: '微信注册开发中', icon: 'none' });
  },

  qqRegister() {
    wx.showToast({ title: 'QQ注册开发中', icon: 'none' });
  },

  showTerms() {
    wx.showModal({
      title: '用户协议',
      content: '1. TanEats致力于为您提供便捷的美食信息服务。\n2. 请确保提供真实有效的注册信息。\n3. 用户应遵守平台规则，不得发布虚假评价。\n4. TanEats保留最终解释权。',
      showCancel: false
    });
  },

  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私保护。收集的信息仅用于提供服务，不会出售给第三方。详情请查看完整隐私政策。',
      showCancel: false
    });
  }
});