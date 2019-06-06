
'use strict';

var asap = require('asap/raw');

function noop() {}

var LAST_ERROR = null;
var IS_ERROR = {};
function getThen(obj) {
  try {
    return obj.then;
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}
function tryCallTwo(fn, a, b) {
  try {
    fn(a, b);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

module.exports = Promise;


/**
 * 
 * @param {*} fn 
 * _state 自身的状态
 * _state 0初始值; 1当前Promise实例后续只有一个then的时候; 2当前Promise实例后续有多个then的时候.
 */
function Promise(fn) {
  if (typeof this !== 'object') {
    throw new TypeError('Promises must be constructed via new');
  }
  if (typeof fn !== 'function') {
    throw new TypeError('Promise constructor\'s argument is not a function');
  }
  this._deferredState = 0;   // 0 初始状态 1为成功状态 2为失败状态
  this._state = 0;
  this._value = null;
  this._deferreds = null;
  if (fn === noop) return;
  doResolve(fn, this);
}
Promise._onHandle = null;
Promise._onReject = null;
Promise._noop = noop;

Promise.prototype.then = function(onFulfilled, onRejected) {
  if (this.constructor !== Promise) {
    return safeThen(this, onFulfilled, onRejected);
  }
  var res = new Promise(noop);
  handle(this, new Handler(onFulfilled, onRejected, res));
  return res;
};

function safeThen(self, onFulfilled, onRejected) {
  return new self.constructor(function (resolve, reject) {
    var res = new Promise(noop);
    res.then(resolve, reject);
    handle(self, new Handler(onFulfilled, onRejected, res));
  });
}

/**
 * 
 * @param {*} self 
 * @param {*} deferred 数组或者单个函数
 * 
 * 将deferred进行合并
 */
function handle(self, deferred) {
  while (self._state === 3) {
    self = self._value;
  }
  if (Promise._onHandle) {
    Promise._onHandle(self);
  }
  if (self._state === 0) {
    if (self._deferredState === 0) {
      self._deferredState = 1;
      self._deferreds = deferred;
      return;
    }
    if (self._deferredState === 1) {
      self._deferredState = 2;
      self._deferreds = [self._deferreds, deferred];
      return;
    }
    self._deferreds.push(deferred);
    return;
  }
  handleResolved(self, deferred);
}

/**
 * 
 * @param {*} self 
 * 将then压进队列
 */
function finale(self) {
  if (self._deferredState === 1) {
    handle(self, self._deferreds);
    self._deferreds = null;
  }
  if (self._deferredState === 2) {
    for (var i = 0; i < self._deferreds.length; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }
}


/**
 * 
 * @param {*} self 
 * @param {*} deferred 
 * 
 * asap 类似将当前fn转成microtask，在当前event loop末尾执行.
 */
function handleResolved(self, deferred) {
  asap(function() {
    var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      if (self._state === 1) {
        resolve(deferred.promise, self._value);
      } else {
        reject(deferred.promise, self._value);
      }
      return;
    }
    var ret = tryCallOne(cb, self._value);
    if (ret === IS_ERROR) {
      reject(deferred.promise, LAST_ERROR);
    } else {
      resolve(deferred.promise, ret);
    }
  });
}

/**
 * 
 * @param {Promise} self 
 * @param {*} newValue 
 */
function resolve(self, newValue) {
  // newValue是传进resolve的值，不能和self相同，否则进入无限循环
  if (newValue === self) {
    return reject(
      self,
      new TypeError('A promise cannot be resolved with itself.')
    );
  }
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    /**
     * 尝试获取then，如果获取出错，则reject出去
     * 获取为undefined或者then函数，则进行下一步
     */
    var then = getThen(newValue);
    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR);
    }
    /**
     * 判断then的类型
     * 如果then为promise的then类型，则进入finale,执行while进入等待状态
     * 如果then为普通函数，则继续调用doResolve
     */
    if (
      then === self.then &&
      newValue instanceof Promise
    ) {
      self._state = 3;
      self._value = newValue;
      finale(self);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self);
      return;
    }
  }
  // 如果newValue为普通类型，则直接结束
  self._state = 1;
  self._value = newValue;
  finale(self);
}

function reject(self, newValue) {
  self._state = 2;
  self._value = newValue;
  if (Promise._onReject) {
    Promise._onReject(self, newValue);
  }
  finale(self);
}

function Handler(onFulfilled, onRejected, promise){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * 
 * @param {*} fn 
 * @param {*} promise 
 * 
 * 执行首次函数，其中resolve, reject只能执行一次
 * 如果执行出错，则记录为最后出错的地方，reject出去
 * 
 * outerResolve 外部实际传进去的resolve
 * outerReject 外部实际传进去的reject
 * tryCallTwo可以理解为装饰器，记录错误位置
 */
function doResolve(fn, promise) {
  // 标记符
  var done = false;
  var outerResolve = function (value) {
    if (done) return;
    done = true;
    resolve(promise, value);
  }
  var outerReject = function (reason) {
    if (done) return;
    done = true;
    reject(promise, reason);
  }

  var res = tryCallTwo(fn, outerResolve, outerReject); //  等同于 fn = (outerResolve, outerReject) => {//}

  if (!done && res === IS_ERROR) {
    done = true;
    reject(promise, LAST_ERROR);
  }
}