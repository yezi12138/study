/**
 * 测试promise
 */

const PENDING = "pending"
const RESOLVED = "resolved"
const REJECTED = "rejected"
const WAITING = "waiting"
var index = 0

function noop() {}

/**
 * 
 * @param {*} fn 
 * _state 自身的状态
 * _deferreds then的队列
 * _name 测试用的ID
 */
const Ypromise = function (fn) {
  // 对外暴露的参数
  // _deferreds 队列参数
  this._state = PENDING
  this._value = undefined
  this._deferreds = []
  this._name = ++index

  doResolve(fn, this)
}

/**
 * 
 * @param {*} fn 
 * @param {*} promise 
 * 
 * 入口执行函数
 */
function doResolve (fn, promise) {
  let done = false
  var outerResolve = function (value) {
    if (done) return
    done = true
    resolve(promise, value)
  }
  var outerReject = function (e) {
    if (done) return
    done = true
    reject(promise, e)
  }
  fn(outerResolve, outerReject)
}

  /**
   * 
   * @param {Promise} self 
   * @param {*} value 
   * 
   * 管道处理器，判断value值的类型，进入不同的函数去处理
   * 
   * 当传进来的是一个promise 则进入无限等待状态
   * 当传进来是一个普通函数 则递归入口函数
   * 当传进来是一个普通类型 则进入核心处理函数，将函数延后执行
   */
  let resolve = (self, value) => {
    if (value === self) {
      return reject(
        self,
        new TypeError('A promise cannot be resolved with itself.')
      )
    }
    if (value && (typeof value === 'object' || typeof value === 'function')) {
      let then = value.then
      if (then === self.then && value instanceof Ypromise) {
        // 让promise进入等待状态
        self._state = WAITING
        self._value = value
        // 将self压进then栈
        exec(self)
      } else if (typeof then === 'function') {
        // 递归
        doResolve(then.bind(value), self)
        return
      }
    }
    // 如果newValue为普通类型，则直接结束
    self._state = RESOLVED
    self._value = value
    exec(self)
  }
  /**
   * 
   * @param {*} value 传进来的值
   * 执行队列里面失败的函数
   * 如果执行中出错，则捕获处理
   * 因为不是立刻执行，所以要将then里面的函数延后执行
   */
  let reject = (promise, value) => {
    console.log('进入reject： ', value)
    if (this._state === PENDING) {
      this._state = REJECTED
      this.value = value
      _onRejectFn.forEach(fn => fn(this._value))
    }
  }

/**
 * 
 * @param {*} onResolved 
 * @param {*} onRejected 
 * 
 * 返回一个新的promise对象
 */
Ypromise.prototype.then = function (onResolved, onRejected) {
  console.log('-------执行then---------')
  var res = new Ypromise(noop) // 返回一个新的promise
  handle(this, new Hander(res, onResolved, onRejected)) // 将then函数压入栈
  return res
}

function Hander (promise, onFulfilled, onRejected) {
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.promise = promise
}

/**
 * 
 * @param {*} self 
 * @param {*} deferred 处理器
 * 
 */
function handle(self, deferred) {
  // 交换控制权
  while (self._state === WAITING) {
    self = self._value
  }
  // 压入队列
  if (self._state === PENDING) {
    self._deferreds.push(deferred)
    return
  }
  handleResolved(self, deferred)
}

/**
 * 
 * @param {*} self 
 * 执行then队列函数
 */
function exec (self) {
  for (var i = 0; i < self._deferreds.length;i++) {
    handle(self, self._deferreds[i])
  }
  self._deferreds = []
}

/**
 * 
 * @param {*} self 
 * @param {*} deferred 
 * 
 * 核心处理函数
 * 
 */
function handleResolved (self, deferred) {
  setTimeout(() => {
    var cb = self._state === RESOLVED ? deferred.onFulfilled : deferred.onRejected
    // 如果不存在返回值，则进入下一个then的处理
    if (!cb) {
      if (self._state === RESOLVED) {
        resolve(deferred.promise, self._value)
      } else {
        reject(deferred.promise, self._value)
      }
      return
    }
    // 存在返回值，则先跑一边函数，再执行下一个then
    var ret = cb(self._value)
    resolve(deferred.promise, ret)
  })
}


/**
 * 当不设置defferedState的时候
 * 
 * 流程如下： fn()--->reslove()--->exec()[ self._deferreds = [] ]--->handle()--->handleResolved()
 * 因为没有先执行then，所以_deferreds数组为空，此时data数据就无法传递下去
 * 正常时先存储then队列，然后执行resolve
 */
