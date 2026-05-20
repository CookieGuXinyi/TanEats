# TanEats - 校园周边摊贩美食小程序

TanEats 是一款面向校园周边小吃摊贩和学生用户的美食发现与互动平台。当前版本完成了前端静态 UI 框架搭建和微信云开发环境的初步集成，具体功能正在逐一推进中。

## 当前版本功能

### 已完成
- 八个核心页面的静态 UI 框架：发现页、地图视图、消息中心、个人资料、用户注册、商家仪表板、AI 聊天、摊位地图
- 微信云开发环境配置
- 用户、摊位申请、商铺、产品数据库集合（`users`, `stall_applications`, `stalls`, `products`）创建
- 手机号注册与登录功能（当前为模拟验证码发送）
- 摊主商铺注册功能，商铺信息修改功能，商品增删改查与上架状态切换功能
- 个人资料页面与摊主工作台动态展示真实用户数据
- 未完成功能模拟数据填充，支持基础交互演示

## 技术栈

- 微信小程序原生框架（WXML + WXSS + JavaScript）
- 微信云开发（云函数 + 云数据库）
- Git 版本管理

## 项目结构
```
TanEats/
├── cloudfunctions/ # 云函数目录
│ ├── sendSms/ # 短信发送云函数（待接入真实服务）
│ ├── submitApplication/ # 提交申请云函数
│ └── userLogin/ # 用户登录云函数
├── miniprogram/ # 小程序前端代码
│ ├── pages/ # 页面文件
│ │ ├── AITalk/ # AI 聊天页面
│ │ ├── Discover/ # 发现页
│ │ ├── Map/ # 地图视图
│ │ ├── Message/ # 消息中心
│ │ ├── MyApplications/ # 我的申请
│ │ ├── Profile/ # 个人资料
│ │ ├── Register_User/ # 用户注册
│ │ ├── Register_Vendor/ # 商家注册
│ │ ├── Vendor/ # 商家仪表板
│ │ ├── example/ # 示例页面
│ │ └── index/ # 首页
│ ├── components/ # 自定义组件
│ │ └── cloudTipModal/ # 云开发提示弹窗组件
│ ├── images/ # 图片资源
│ │ └── icons/ # 图标文件夹
│ ├── app.js
│ ├── app.json
│ ├── app.wxss
│ ├── envList.js # 云环境配置
│ └── sitemap.json
├── .cloudbase/ # 云开发本地缓存
│ └── container/
│ └── debug.json
├── project.config.json # 项目配置
├── project.private.config.json # 私有配置（本地）
├── uploadCloudFunction.sh # 云函数上传脚本
└── README.md
```

## 版本记录

- v0.1.0 - 静态 UI 演示版本
- v0.2.0 - 云开发初步集成版本，实现手机号注册/登录，并显示相应个人主页内容
- v0.2.1 - 实现摊主商铺注册功能，当前为手动后台审核（未来待开发审核员页面）
- v0.2.2 - 实现个人对应店铺信息显示与编辑功能，商品增删改查与上架状态切换功能

## 团队

TanEats 开发团队: 顾心怡，黄姝颜，史向涛

---

*项目持续迭代中*