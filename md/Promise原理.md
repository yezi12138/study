# Promise原理

源码： https://github.com/then/promise/blob/master/src/core.js



基于源码简化，大致功能是一样的



## 测试代码

```javascript
<script>
    window.onload = function () {
      var promise1 = new Ypromise(function (resolve, reject) {
        console.log('完成创建Ypromise')
        setTimeout(() => {
          console.log('%c吃早餐,等待4秒', 'color:red')
          resolve(1)
        }, 2000)
      })
      var promise2 = promise1.then((data) => {
        var promise4 = new Ypromise((resolve) => {
          setTimeout(() => {
            console.log('%c吃午餐,等待3秒', 'color:red', data)
            resolve(2)
          }, 3000)
        })
        return promise4
      })
      var promise3 = promise2.then((data) => {
        console.log('%c吃晚餐', 'color:red',data)
      })
      console.log('promise1', promise1)
      console.log('promise2',promise2)
      console.log('promise3',promise3)
    }
  </script>
```





## 代码分析

### promise主对象

```javascript
const PENDING = "pending"
const RESOLVED = "resolved"
const REJECTED = "rejected"
const WAITING = "waiting"
var index = 0
function noop() {} // 空函数，用来返回新的promise

/**
 * 
 * @param {*} fn 
 * _state 自身的状态
 * _deferreds then的队列
 * _name 测试用的ID
 */
const Ypromise = function (fn) {
  // 对外暴露的参数
  this._state = PENDING
  this._value = undefined
  this._deferreds = []
  this._name = ++index
  
  // 入口函数
  doResolve(fn, this)
}
```





### doResolve函数

```javascript
/**
 * 
 * @param {*} fn 
 * @param {*} promise 
 * 
 * 入口执行函数
 * done 确保成功或失败函数只执行一次
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
```

备注： 外部调用的`resolve`对应内部的`outerResolve`, 和内部的`resolve`完全不一样



### resolve函数

```javascript
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
        // 执行then队列函数
        exec(self)
      } else if (typeof then === 'function') {
        // 递归
        doResolve(then.bind(value), self)
        return
      }
    }
    // 执行then队列函数
    self._state = RESOLVED
    self._value = value
    exec(self)
  }
```

这里只对value的类型进行判断，然后进入到不同的处理函数中



### exec函数

```javascript
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
```



### handle函数

```javascript
/**
 * 
 * @param {*} self 
 * @param {Hander} deferred 处理器
 * 
 * 根据状态，决定是压入队列，还是交换控制权，还是执行最终处理函数
 */
function handle(self, deferred) {
  // 交换控制权， 仅当内部返回promise，为了链式调用，这一步很重要，下面讲解
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
```





### handleResolved函数

```javascript
/**
 * 
 * @param {promise} self 
 * @param {Hander} deferred 
 * 
 * 核心处理函数
 *
 * setTimeout 为了模拟asap函数，将任务执行顺序后移
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
```



### then函数

```javascript
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
```



## 核心点分析

promise有两个重大的核心点最重要

1. resolve(value)中value的值是如何传递的
2. 如何链式调用promise，并且保持链式的正确性



### value的值是如何传递的

假设我们测试例子为： 

```javascript
var fn1 = function (resolve, reject) {
    console.log('完成创建Ypromise')
    setTimeout(() => {
      console.log('%c吃早餐,等待4秒', 'color:red')
      resolve(1)
    }, 2000)
  }
var promise1 = new Ypromise(fn1)
var promise2 = promise1.then((data) => {
  cosole.log('promise2: ', data)
})
```

流程如下： 

1. 执行doResolve, 此时对应执行fn1,立刻打印`完成创建Ypromise`， 然后执行setTimeout
2. 此时定时器在运行，定时器的任务暂存在队列后面，执行then函数（then的执行者是promise1），因为promise1的state还处于pedding，执行handle，将then函数（也就是promise2）压入promise1的_deferreds 队列中
3. 这一步所有的主任务都结束了，重新轮巡setTimeout，发现fn1内部的setTimeout执行完毕，输入`吃早餐,等待4秒`，然后执行`resolve（1）`，也就相当于执行promise内部的`outerResolve(1) `,  要分清外部的resolve和内部的resolve
4. 因为传进来的是1，也就是普通类型，resolve直接进入第三个分支，也就是最后一个函数`exec`，
5. exec中遍历promise1所有的deffered（Hander对象，保存的promise2对象和成功失败回调），执行handle函数，因为promise1的state变成了resolved，直接执行handleResolved（promise1, deferred）
6. 因为deferred存在成功回调，所以先执行一次成功的回调，也就是promise1.then里面的内容，此时输出`promise2: 1`, 此时ret = undefined,执行resolve（promise2，undefined）
7. 因为undefined是普通类型，进入exec ，因为promise2不存在then队列，所以直接结束循环，此时全部任务均已完成



> 1. 每一个promise的then队列中都只存在一个任务，链式的意思是： promise1(promise2)  promise2(promise3)
> 2. 每一个then方法都会返回一个新的promise
> 3. value值得传递主要是在handleResolved函数中实现



### 如何链式调用promise

测试代码： 

```javascript
var promise1 = new Ypromise(function (resolve, reject) {
    console.log('完成创建Ypromise')
    setTimeout(() => {
      console.log('%c吃早餐,等待4秒', 'color:red')
      resolve(1)
    }, 2000)
  })
var promise2 = promise1.then((data) => {
var promise4 = new Ypromise((resolve) => {
  setTimeout(() => {
    console.log('%c吃午餐,等待3秒', 'color:red', data)
    resolve(2)
  }, 3000)
})
return promise4
})
var promise3 = promise2.then((data) => {
console.log('%c吃晚餐', 'color:red',data)
})
console.log('promise1', promise1)
console.log('promise2',promise2)
console.log('promise3',promise3)
```

then队列顺序是 promise1 --> promise2 -->  promise3
执行得顺序是 promise1 --> promise2 --> promise4 ---> promise3



如图： 

![1537945399669](C:\Users\yyq\AppData\Local\Temp\1537945399669.png)



链式调用得关键是控制权的转移

在promise1阶段，进入 `handleResolved(promise1, hander) `之后(hander内部存的是promise1的then信息)，执行promise1的then函数，返回ret = promise4

其实resolve(deferred.promise, ret)  === resolve(promise2, promise4) 

在`resolve`判断value为promise类型，也就是说promise2 .state = waiting

```javascript
promise2  = {
    state: WAITING,
   _value: promise4,
   deffereds: [ promise3 ]
}

```

在进入handle函数之后，判断状态为waiting，交换控制权

```javascript
// 交换控制权
  while (self._state === WAITING) {
    self = self._value
  }
  handleResolved(self, deferred) // handleResolved(promise4, { promise3 })
// 完成从2->3 到 4->3控制权交换
```

