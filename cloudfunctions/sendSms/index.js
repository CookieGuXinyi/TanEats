// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 临时存储验证码（实际应用应使用云数据库）
const codeCache = {}

// 云函数入口函数
exports.main = async (event, context) => {
  const { phone } = event
  
  // 生成6位随机验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  // 存储验证码，5分钟过期
  codeCache[phone] = {
    code: code,
    expireTime: Date.now() + 5 * 60 * 1000
  }
  
  // 演示：打印到控制台
  console.log(`验证码 ${code} 已发送到 ${phone}`)
  
  // 实际生产环境：调用短信服务商API
  // 这里返回验证码方便测试（正式环境不要返回）
  return { 
    code: 200, 
    message: '验证码已发送',
    data: { code: code }  // 测试时返回，正式应删除
  }
}

// 导出验证码验证函数（供注册时使用）
const verifyCode = (phone, code) => {
  const record = codeCache[phone]
  if (!record) return false
  if (record.expireTime < Date.now()) return false
  return record.code === code
}