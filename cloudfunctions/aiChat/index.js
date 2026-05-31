// 云函数：AI 点餐助手
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ 
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 30000  // 设置超时时间为 30 秒
})

const db = cloud.database()
const _ = db.command

const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_API_URL = 'https://api.deepseek.com/chat/completions'
const MAX_CONTEXT_STALLS = 10
const MAX_PRODUCTS_PER_STALL = 5
const MAX_REVIEWS_PER_STALL = 3

exports.main = async (event, context) => {
  const { message, userId = '', history = [] } = event || {}

  if (!message || !String(message).trim()) {
    return { code: 400, message: '问题不能为空' }
  }

  try {
    const wxContext = cloud.getWXContext()
    const userProfile = await getUserProfile(userId, wxContext.OPENID)
    const foodContext = await buildFoodContext({
      message: String(message).trim(),
      userId: userProfile?._id || userId
    })

    if (foodContext.candidates.length === 0) {
      return {
        code: 200,
        data: {
          answer: '我暂时没有查到可推荐的营业店铺。可以稍后再试，或者去首页/搜索页看看是否已有摊主上架商品。',
          sourceShops: [],
          usedFallback: true
        }
      }
    }

    const fallbackAnswer = generateFallbackAnswer(String(message), foodContext)
    const sourceShops = foodContext.candidates.slice(0, 3).map(toSourceShop)

    let answer = fallbackAnswer
    let usedFallback = true

    if (process.env.AI_API_KEY) {
      try {
        answer = await callAiProvider({
          message: String(message).trim(),
          history,
          userProfile,
          foodContext
        })
        usedFallback = false
      } catch (err) {
        console.error('外部 AI 调用失败，改用本地兜底回答:', err)
      }
    }

    return {
      code: 200,
      data: {
        answer,
        sourceShops,
        usedFallback,
        contextStats: {
          stallCount: foodContext.stalls.length,
          candidateCount: foodContext.candidates.length
        }
      }
    }
  } catch (err) {
    console.error('AI 点餐助手失败:', err)
    return { code: 500, message: err.message || 'AI 点餐助手暂时不可用' }
  }
}

async function buildFoodContext({ message, userId }) {
  const stalls = await getActiveStalls()
  const stallIds = stalls.map(item => item._id)

  if (stallIds.length === 0) {
    return {
      message,
      stalls: [],
      candidates: [],
      budget: extractBudget(message),
      terms: extractTerms(message)
    }
  }

  const [products, orders, reviews, favorites, cartItems] = await Promise.all([
    getProducts(stallIds),
    getActiveOrders(stallIds),
    getReviews(stallIds),
    getFavorites(userId),
    getCartItems(userId)
  ])

  const productsByStall = groupBy(products, 'shopId')
  const ordersByStall = groupBy(orders, 'stallId')
  const reviewsByStall = groupReviewsByStall(reviews)
  const favoriteIds = new Set(favorites.map(item => item.stallId))
  const cartStallIds = new Set(cartItems.map(item => item.stallId))
  const budget = extractBudget(message)
  const terms = extractTerms(message)

  const decorated = stalls.map(stall => {
    const stallProducts = productsByStall[stall._id] || []
    const stallOrders = ordersByStall[stall._id] || []
    const stallReviews = reviewsByStall[stall._id] || []
    return decorateStall({
      stall,
      products: stallProducts,
      orders: stallOrders,
      reviews: stallReviews,
      isFavorite: favoriteIds.has(stall._id),
      inCart: cartStallIds.has(stall._id),
      budget,
      terms,
      message
    })
  })

  const candidates = decorated
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, MAX_CONTEXT_STALLS)

  return {
    message,
    budget,
    terms,
    stalls: decorated,
    candidates
  }
}

async function getActiveStalls() {
  const res = await db.collection('stalls')
    .where({ status: 'active' })
    .limit(50)
    .get()

  return res.data || []
}

async function getProducts(stallIds) {
  if (!stallIds.length) return []

  try {
    const res = await db.collection('products')
      .where({
        shopId: _.in(stallIds),
        isAvailable: true
      })
      .limit(100)
      .get()
    return res.data || []
  } catch (err) {
    console.error('查询商品失败:', err)
    return []
  }
}

async function getActiveOrders(stallIds) {
  if (!stallIds.length) return []

  try {
    const res = await db.collection('orders')
      .where({
        stallId: _.in(stallIds),
        status: _.in(['pending', 'confirmed'])
      })
      .limit(100)
      .get()
    return res.data || []
  } catch (err) {
    console.error('查询订单失败:', err)
    return []
  }
}

async function getReviews(stallIds) {
  if (!stallIds.length) return []

  try {
    const res = await db.collection('reviews')
      .where({
        shopIds: _.in(stallIds)
      })
      .limit(100)
      .get()
    return res.data || []
  } catch (err) {
    console.error('查询评价失败:', err)
    return []
  }
}

async function getFavorites(userId) {
  if (!userId) return []

  try {
    const res = await db.collection('favorites')
      .where({ userId })
      .limit(100)
      .get()
    return res.data || []
  } catch (err) {
    console.error('查询收藏失败:', err)
    return []
  }
}

async function getCartItems(userId) {
  if (!userId) return []

  try {
    const res = await db.collection('cart')
      .where({ userId })
      .limit(100)
      .get()
    return res.data || []
  } catch (err) {
    console.error('查询购物车失败:', err)
    return []
  }
}

async function getUserProfile(userId, openid) {
  let user = null

  if (userId) {
    user = await getUserById('users', userId) || await getUserById('user', userId)
  }

  if (!user && openid) {
    user = await getUserByOpenid('users', openid) || await getUserByOpenid('user', openid)
  }

  if (!user) return null

  return {
    _id: user._id,
    nickname: user.nickname || '用户',
    points: user.points || 0,
    coupons: user.coupons || 0
  }
}

async function getUserById(collectionName, id) {
  try {
    const res = await db.collection(collectionName).doc(id).get()
    return res.data || null
  } catch (err) {
    return null
  }
}

async function getUserByOpenid(collectionName, openid) {
  try {
    const res = await db.collection(collectionName)
      .where({ _openid: openid })
      .limit(1)
      .get()
    return res.data && res.data[0] ? res.data[0] : null
  } catch (err) {
    return null
  }
}

function decorateStall(options) {
  const {
    stall,
    products,
    orders,
    reviews,
    isFavorite,
    inCart,
    budget,
    terms,
    message
  } = options

  const pendingCount = orders.filter(item => item.status === 'pending').length
  const confirmedCount = orders.filter(item => item.status === 'confirmed').length
  const queueCount = pendingCount
  const waitMinutes = estimateWaitMinutes(pendingCount, confirmedCount, products)
  const isOpen = checkIsOpen(stall.businessHours)
  console.log(`店铺：${stall.shopName}, 营业时间：${stall.businessHours}, 是否营业：${isOpen}`)
  const sortedProducts = [...products].sort((a, b) => {
    const salesDiff = (b.salesCount || 0) - (a.salesCount || 0)
    if (salesDiff !== 0) return salesDiff
    return Number(a.price || 0) - Number(b.price || 0)
  })
  const minPrice = sortedProducts.length
    ? Math.min(...sortedProducts.map(item => Number(item.price || 0)))
    : 0
  const avgPrice = sortedProducts.length
    ? sortedProducts.reduce((sum, item) => sum + Number(item.price || 0), 0) / sortedProducts.length
    : 0
  const relevanceScore = calculateRelevance({
    stall,
    products: sortedProducts,
    reviews,
    terms,
    message
  })
  const budgetScore = calculateBudgetScore(sortedProducts, budget)
  const reviewScore = Number(stall.rating || 0) * 8 + Math.min(Number(stall.reviewCount || reviews.length || 0), 50) * 0.4
  const queueScore = Math.max(0, 24 - waitMinutes)
  const salesScore = Math.min(sortedProducts.reduce((sum, item) => sum + Number(item.salesCount || 0), 0), 500) / 25
  const statusScore = isOpen ? 28 : -18
  const preferenceScore = (isFavorite ? 12 : 0) + (inCart ? 8 : 0)
  const finalScore = statusScore + relevanceScore + budgetScore + reviewScore + queueScore + salesScore + preferenceScore

  return {
    id: stall._id,
    name: stall.shopName || '未命名店铺',
    category: stall.category || '其他',
    description: stall.description || '',
    location: stall.location || '',
    businessHours: stall.businessHours || '',
    isOpen,
    rating: Number(stall.rating || 0),
    reviewCount: Number(stall.reviewCount || reviews.length || 0),
    queueCount,
    pendingCount,
    confirmedCount,
    waitMinutes,
    minPrice,
    avgPrice: Math.round(avgPrice * 10) / 10,
    isFavorite,
    inCart,
    products: sortedProducts.slice(0, MAX_PRODUCTS_PER_STALL).map(item => ({
      id: item._id,
      name: item.name || '未命名商品',
      price: Number(item.price || 0),
      description: item.description || '',
      salesCount: Number(item.salesCount || 0)
    })),
    reviewHighlights: reviews
      .sort((a, b) => toTime(b.createTime) - toTime(a.createTime))
      .slice(0, MAX_REVIEWS_PER_STALL)
      .map(item => ({
        rating: Number(item.rating || 0),
        content: trimText(item.content || '', 80),
        tags: item.tags || []
      })),
    relevanceScore,
    finalScore: Math.round(finalScore * 10) / 10
  }
}

function calculateRelevance({ stall, products, reviews, terms, message }) {
  if (!terms.length) return 0

  const text = [
    stall.shopName,
    stall.category,
    stall.description,
    stall.location,
    ...products.map(item => `${item.name || ''} ${item.description || ''}`),
    ...reviews.map(item => `${item.content || ''} ${(item.tags || []).join(' ')}`)
  ].join(' ').toLowerCase()

  let score = 0
  terms.forEach(term => {
    if (text.includes(term.toLowerCase())) score += 18
  })

  if (/排队少|不用排队|快|赶时间/.test(message)) score += Math.max(0, 18 - products.length)
  if (/评分高|好评|口碑|推荐/.test(message)) score += Number(stall.rating || 0) * 4
  if (/收藏|常去|喜欢/.test(message)) score += 4

  return score
}

function calculateBudgetScore(products, budget) {
  if (!budget || !products.length) return 0

  const affordableCount = products.filter(item => Number(item.price || 0) <= budget).length
  if (affordableCount === 0) return -12

  return Math.min(20, affordableCount * 5)
}

function extractBudget(message) {
  const text = String(message || '')
  const match = text.match(/(?:预算|不超过|别超过|以内|低于|少于|小于|人均)?\s*(\d+(?:\.\d+)?)\s*(?:元|块|rmb|RMB|¥)/)
  if (!match) return null
  return Number(match[1])
}

function extractTerms(message) {
  const text = String(message || '').trim()
  const dictionary = [
    '炸串', '螺蛳粉', '奶茶', '饮品', '烧烤', '烤串', '甜品', '糕点', '粉面',
    '主食', '炒饭', '夜宵', '辣', '不辣', '甜', '清淡', '实惠', '便宜',
    '高评分', '排队少', '有优惠', '快', '热', '冰', '套餐'
  ]
  const terms = dictionary.filter(item => text.includes(item))
  const words = text
    .split(/[\s,，。！？!?、；;：:()（）]+/)
    .map(item => item.trim())
    .filter(item => item.length >= 2 && item.length <= 12)

  return Array.from(new Set([...terms, ...words]))
}

function estimateWaitMinutes(pendingCount, confirmedCount, products) {
  const avgPrep = products.some(item => /炸|烤|炒|粉|面/.test(`${item.name || ''}${item.description || ''}`)) ? 4 : 3
  return Math.max(0, pendingCount * avgPrep + Math.ceil(confirmedCount * 0.8))
}

// 判断是否在营业时间内
function checkIsOpen(businessHours) {
  if (!businessHours) return false
  
  // 解析营业时间，格式如："周一 17:00-23:00"
  // 支持格式：周一 17:00-23:00 或 周一至周五 17:00-23:00
  
  const weekMap = {
    '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7,
    '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7
  }
  
  const now = new Date() // 云函数里默认（UTC时间）
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const currentWeekday = beijingTime.getDay() || 7  // 周日 getDay() 返回 0，转为 7
  const currentHour = beijingTime.getHours()
  const currentMinute = beijingTime.getMinutes()
  const currentTotal = currentHour * 60 + currentMinute
  console.log(`当前时间： 周${currentWeekday}, 时${currentHour}, 分${currentMinute}`)
  
  // 处理时间段格式 "周一 17:00-23:00"
  const timeMatch = businessHours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
  if (!timeMatch) return false
  
  const startTotal = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2])
  const endTotal = parseInt(timeMatch[3]) * 60 + parseInt(timeMatch[4])
  
  // 处理星期几部分
  const weekPart = businessHours.split(' ')[0]  // 获取 "周一" 或 "周一至周五"
  
  // 单个星期，如 "周一"
  if (weekMap[weekPart]) {
    const targetWeekday = weekMap[weekPart]
    if (currentWeekday !== targetWeekday) return false
  }
  
  // 处理星期范围，如 "周一至周五"
  const weekRangeMatch = weekPart.match(/(周[一二三四五六日])至(周[一二三四五六日])/)
  if (weekRangeMatch) {
    const startWeek = weekMap[weekRangeMatch[1]]
    const endWeek = weekMap[weekRangeMatch[2]]
    if (currentWeekday < startWeek || currentWeekday > endWeek) return false
  }
  
  // 判断时间是否在范围内
  return currentTotal >= startTotal && currentTotal <= endTotal
}

function isWeekMatched(weekPart, currentWeekday) {
  const weekOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const normalized = String(weekPart || '').replace(/星期/g, '周')

  if (!normalized || normalized === '每天' || normalized === '每日') return true

  if (normalized.includes('至')) {
    const [start, end] = normalized.split('至')
    const startIndex = weekOrder.indexOf(start)
    const endIndex = weekOrder.indexOf(end)
    const currentIndex = currentWeekday - 1

    if (startIndex === -1 || endIndex === -1) return true
    if (startIndex <= endIndex) {
      return currentIndex >= startIndex && currentIndex <= endIndex
    }
    return currentIndex >= startIndex || currentIndex <= endIndex
  }

  if (normalized.includes('、')) {
    return normalized.split('、').some(item => weekOrder.indexOf(item) === currentWeekday - 1)
  }

  const targetIndex = weekOrder.indexOf(normalized)
  return targetIndex === -1 ? true : targetIndex === currentWeekday - 1
}

function generateFallbackAnswer(message, foodContext) {
  const candidates = foodContext.candidates
  const openCandidates = candidates.filter(item => item.isOpen)
  const list = openCandidates.length > 0 ? openCandidates : candidates
  const top = list.slice(0, 3)

  if (top.length === 0) {
    return '我查到了店铺数据，但暂时没有足够的菜单或评价信息来做推荐。可以换个关键词试试，比如“炸串”“排队少”“20元以内”。'
  }

  const budgetText = foodContext.budget ? `，预算 ${foodContext.budget} 元以内` : ''
  const lines = top.map((item, index) => {
    const productText = item.products.length
      ? item.products.slice(0, 3).map(product => `${product.name} ${product.price}元`).join('、')
      : '暂无上架商品详情'
    const reasons = []
    reasons.push(item.isOpen ? '当前营业中' : '当前可能已打烊')
    if (item.rating) reasons.push(`评分 ${item.rating}`)
    reasons.push(`预计等待约 ${item.waitMinutes} 分钟`)
    if (item.minPrice) reasons.push(`最低约 ${item.minPrice} 元`)
    if (item.isFavorite) reasons.push('你收藏过')

    return `${index + 1}. ${item.name}：${reasons.join('，')}。可看 ${productText}。`
  })

  return [
    `根据当前店铺、菜单、订单和评价数据${budgetText}，我更推荐：`,
    ...lines,
    '如果你更在意速度，优先选预计等待时间短的；如果你更在意味道，优先选评分和近期评价更好的店铺。'
  ].join('\n')
}

async function callAiProvider({ message, history, userProfile, foodContext }) {
  const apiUrl = process.env.AI_API_BASE_URL || DEFAULT_API_URL
  const model = process.env.AI_MODEL || DEFAULT_MODEL
  const maxTokens = Number(process.env.AI_MAX_TOKENS || 900)
  const temperature = Number(process.env.AI_TEMPERATURE || 0.45)
  const timeout = Number(process.env.AI_TIMEOUT_MS || 18000)

  const compactContext = {
    budget: foodContext.budget,
    queryTerms: foodContext.terms,
    user: userProfile ? {
      nickname: userProfile.nickname,
      points: userProfile.points,
      coupons: userProfile.coupons
    } : null,
    shops: foodContext.candidates.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      location: item.location,
      businessHours: item.businessHours,
      isOpen: item.isOpen,
      rating: item.rating,
      reviewCount: item.reviewCount,
      queueCount: item.queueCount,
      waitMinutes: item.waitMinutes,
      minPrice: item.minPrice,
      avgPrice: item.avgPrice,
      isFavorite: item.isFavorite,
      inCart: item.inCart,
      products: item.products,
      recentReviews: item.reviewHighlights
    }))
  }

  const systemPrompt = [
    '你是 TanEats 校园美食 AI 点餐助手。',
    '你只能基于提供的数据库上下文回答，不要编造不存在的店铺、商品、价格、排队人数、优惠或评价。',
    '优先考虑：当前营业中、排队/等待时间短、评分高、符合用户预算和口味、商品已上架。',
    '如果数据不足，要直接说明数据不足，并给出可以继续询问的方向。',
    '回答要自然、简洁、中文，适合微信小程序聊天界面。',
    '推荐店铺时请说明理由，包含等待时间、评分、价格或代表商品。'
  ].join('\n')

  const messages = [
    { role: 'system', content: systemPrompt },
    ...sanitizeHistory(history),
    {
      role: 'user',
      content: [
        `用户问题：${message}`,
        '当前数据库摘要如下：',
        JSON.stringify(compactContext)
      ].join('\n')
    }
  ]

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  }

  const response = await postJson(apiUrl, payload, {
    Authorization: `Bearer ${process.env.AI_API_KEY}`,
    'Content-Type': 'application/json'
  }, timeout)

  const answer = response &&
    response.choices &&
    response.choices[0] &&
    response.choices[0].message &&
    response.choices[0].message.content

  if (!answer) {
    throw new Error('AI 响应为空')
  }

  return String(answer).trim()
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .filter(item => item && (item.role === 'user' || item.role === 'assistant'))
    .slice(-6)
    .map(item => ({
      role: item.role,
      content: trimText(String(item.content || ''), 500)
    }))
}

function postJson(urlString, payload, headers, timeout) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString)
    const body = JSON.stringify(payload)
    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      port: url.port || 443,
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout
    }, (res) => {
      const chunks = []

      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let data = null

        try {
          data = text ? JSON.parse(text) : {}
        } catch (err) {
          return reject(new Error(`AI 响应不是 JSON：${text.slice(0, 120)}`))
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = data.error && data.error.message ? data.error.message : text
          return reject(new Error(`AI HTTP ${res.statusCode}: ${message}`))
        }

        resolve(data)
      })
    })

    req.on('timeout', () => {
      req.destroy(new Error('AI 请求超时'))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function toSourceShop(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    isOpen: item.isOpen,
    rating: item.rating,
    waitMinutes: item.waitMinutes
  }
}

function groupBy(list, key) {
  return (list || []).reduce((map, item) => {
    const value = item[key]
    if (!value) return map
    if (!map[value]) map[value] = []
    map[value].push(item)
    return map
  }, {})
}

function groupReviewsByStall(reviews) {
  const map = {}

  ;(reviews || []).forEach(review => {
    ;(review.shopIds || []).forEach(stallId => {
      if (!map[stallId]) map[stallId] = []
      map[stallId].push(review)
    })
  })

  return map
}

function toTime(value) {
  if (!value) return 0
  const date = value instanceof Date ? value : new Date(value)
  return date.getTime() || 0
}

function trimText(text, maxLength) {
  const value = String(text || '').trim()
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}
