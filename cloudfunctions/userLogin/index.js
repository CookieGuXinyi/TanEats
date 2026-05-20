// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 初始化数据库对象
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, phone, password, nickname } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 手机号注册
  if (action === 'register') {
    // 检查手机号是否已存在
    const existUser = await db.collection('users').where({
      phone: phone
    }).get()
    
    if (existUser.data.length > 0) {
      return { code: 400, message: '手机号已注册' }
    }
    
    // 创建新用户
    const newUser = {
      phone: phone,
      password: password, // 实际应用应加密存储
      nickname: nickname || '美食爱好者',
      avatar: '👤',
      points: 0,
      coupons: 0,
      createTime: new Date(),
      lastLoginTime: new Date()
    }
    
    const result = await db.collection('users').add({ data: newUser })
    return { 
      code: 200, 
      message: '注册成功',
      data: { _id: result._id, ...newUser }
    }
  }
  
  // 手机号登录
  if (action === 'login') {
    const user = await db.collection('users').where({
      phone: phone,
      password: password
    }).get()
    
    if (user.data.length === 0) {
      return { code: 401, message: '手机号或密码错误' }
    }
    
    // 更新最后登录时间
    await db.collection('users').doc(user.data[0]._id).update({
      data: { lastLoginTime: new Date() }
    })
    
    return { 
      code: 200, 
      message: '登录成功',
      data: user.data[0]
    }
  }
  
  // 微信登录（自动注册）
  if (action === 'wxLogin') {
    // 查找是否已有该openid的用户
    let user = await db.collection('users').where({
      _openid: openid
    }).get()
    
    if (user.data.length === 0) {
      // 新用户，自动创建
      const newUser = {
        nickname: '微信用户',
        avatar: '💚',
        points: 0,
        coupons: 0,
        phone: '',
        createTime: new Date(),
        lastLoginTime: new Date()
      }
      const result = await db.collection('users').add({ data: newUser })
      user = { data: [{ _id: result._id, ...newUser }] }
    } else {
      // 更新登录时间
      await db.collection('users').doc(user.data[0]._id).update({
        data: { lastLoginTime: new Date() }
      })
    }
    
    return {
      code: 200,
      message: '登录成功',
      data: user.data[0]
    }
  }
  
  // 获取用户信息
  if (action === 'getUserInfo') {
    const user = await db.collection('users').where({
      _openid: openid
    }).get()
    
    if (user.data.length === 0) {
      return { code: 404, message: '用户不存在' }
    }
    return { code: 200, data: user.data[0] }
  }
  
  return { code: 400, message: '未知操作' }
}