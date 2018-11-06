/**************************************************
公有云 - 拨测函数，并发送告警邮件
TIPS: 
1. CMQ暂时没有node版本的SDK

参考: 
1. https://cloud.tencent.com/document/product/583/19504 - 拨测函数（python版）
2. https://cloud.tencent.com/document/product/406/5851 - CMQ接口文档
***************************************************/

const Capi = require('qcloudapi-sdk')
const request = require('request')

// 使用 cmq 所需的鉴权/配置信息
const SECRET_ID = 'xxx' // 请替换为您的 SecretId
const SECRET_KEY = 'xxx' // 请替换为您的 SecretKey
const CMQ_TOPIC_NAME = 'CMQ_TOPIC_NAME' // 请替换为您的 Topic 名称
const CMQ_REGION = 'gz' // cmq主题所在地域

// 拨测失败后，告警邮件需要通知的邮箱列表
const EMAIL_NOTIFY_LIST = ['******@qq.com', '******@qq.com']

// 拨测失败后，发出告警邮件的邮箱，请根据您自身设置的邮箱地址进行修改
const FROM_ADDR = '******@qq.com'

// 拨测失败后，发出告警邮件的邮箱，请根据您自身设置的邮箱地址进行修改
const TEST_URL_LIST = ['http://wrong.tencent.com', 'http://www.qq.com']

/**简易CMQ-SDK */
function CMQRequestHelper(SecretId, SecretKey) {
  // CMQ云api构建
  this.requestHelper = new Capi({
    SecretId,
    SecretKey,
    serviceType: `cmq-topic-${CMQ_REGION}`
  })
  this.inited = true
}
CMQRequestHelper.prototype.publishMessage = function(
  region,
  topicName,
  msgBody
) {
  if (!this.inited) throw Error('请先实例化CMQRequestHelper~')
  const self = this
  return new Promise((resolve, reject) => {
    let params = {
      Region: region,
      Action: 'PublishMessage',
      topicName,
      msgBody
    }
    self.requestHelper.request(params, function(error, data) {
      if (error) {
        reject(error)
      } else {
        resolve(data)
      }
    })
  })
}

const cmqRequestInst = new CMQRequestHelper(SECRET_ID, SECRET_KEY)

function sendCMQ(body) {
  let promiseArr = []
  promiseArr = EMAIL_NOTIFY_LIST.map(toAddr => {
    return cmqRequestInst.publishMessage(
      CMQ_REGION,
      CMQ_TOPIC_NAME,
      JSON.stringify({
        fromAddr: FROM_ADDR,
        toAddr: toAddr,
        title: 'Please note: PlayCheck Error 拨测地址异常，请检查',
        body: body
      })
    )
  })
  return Promise.all(promiseArr)
}

function testUrl(urlList) {
  let errorInfo = []
  let promiseArr = []
  promiseArr = urlList.map(url => {
    return request(
      {
        url,
        timeout: 3000
      },
      function(e, r, body) {
        if (e) errorInfo.push(e)
      }
    )
  })
  return Promise.all(promiseArr).then(() => sendCMQ(errorInfo.join('\r\n')))
}

exports.main_handler = (event, context, callback) => {
  testUrl(TEST_URL_LIST).then(res => {
    callback(null, res)
  })
}
