# vue响应式原理



详细的响应图可以看官网： https://cn.vuejs.org/v2/guide/reactivity.html

## template

```html
<div id="app">
	<span v-text="textValue"></span>
	<input v-value="textValue" type="text" />
	<p v-html="body"></p>
</div>
```



## script

### 辅助函数

```javascript
/**
   * 类型检测
   * @prop <String> type 类型
   * 带type则检测是否为该类型，没有则返回值的类型
   * @return <Boolean, String>
   */

 function typeTest (obj, type) {
   if (type) {
    type = type.replace(/\w/, ($1) => $1.toUpperCase())
    return Object.prototype.toString.call(obj) === `[object ${type}]`
   } else {
    let typeStr = Object.prototype.toString.call(obj)
    return typeStr.slice(8, -1).toLowerCase()
   }
 }

  /**
   * 获取节点
   * @prop <String | HTMLElement> el
   */
  function getNode (el) {
    if (el instanceof HTMLElement) {
      return el
    } else if (typeTest(el, 'string')) {
      return document.querySelector(el)
    }
    return null
  }
```



### class vue

```javascript
class Vue {
	constructor (options) {
  		this.$el = options.el
  		this.$data = options.data
 	 	new Observe(this.$data)
 	 	new Compile(this)
	}
}
```





### class Observe

```javascript
/** 
   * 1: 监听数据
   * 2：派发事件
   */
  class Observe {
    constructor (data = {}) {
      this.observe(data)
    }
    observe (data) {
      for (let key in data) {
        if (data.hasOwnProperty(key)) {
          if (typeTest(data[key], 'object')) {
            this.observe(data[key])
          } else {
            this.defineProperty(data, key, data[key])
          }
        }
      }
    }
    defineProperty (data, key, value) {
      let dep = new Dep()
      Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get: function () {
          dep.depend()
          return value
        },
        set: function (val) {
          if (val === value) {
            return
          }
          value = val
          dep.notify()
        }
      })
    }
  }
```





### class Dep

```javascript
/** 
   * 1: 依赖管理器
   * 2：收集依赖
   * 3：更新数据
   */
class Dep {
    constructor () {
      this.subscribers = []
    }
    depend () {
      if (Dep.target) {
        Dep.target.addDep(this)
      }
    }
    subscribe (watcher) {
      this.subscribers.push(watcher)
    }
    notify () {
      this.subscribers.forEach(watcher => {
        watcher.update()
      })
    }
  }
```



### class Watcher

```javascript
/**
   * el 元素
   * binding = { name, expression, el, value }
   */
  class Watcher {
    constructor (vm, binding) {
      console.log('Watcher', binding)
      this.$vm = vm
      this.$binding = binding
      this.init()
    }
    update () {
      this.parse()
      console.log('update', this.$binding.name)
      let fn = directiveManage.get(this.$binding.name)
      if (typeTest(fn, 'function')) {
        fn(this.$binding.el, this.$binding, this.$vm)
      } else {
        console.log('不存在此指令处理函数', this.$binding.name)
      }
    }
    addDep (dep) {
      dep.subscribe(this)
    }
    init () {
      Dep.target = this
      this.update()
      Dep.target = null
    }
    parse () {
      let exp = this.$binding.expression
      let arr = exp.split('.')
      let value = this.$vm.$data
      for (let i = 0; i < arr.length; i++) {
        if (!value && i < arr.length) {
          console.log(`解析值出错, 表达式： ${this.$binding.expression}`)
          return
        }
        let key = arr[i]
        value = value[key]
        console.log('Watcher render expression', 'key:', key, 'value', value)
      }
      this.$binding.value = value
    }
  }
```



### class compile

```javascript
/**
   * 编译模板
   * 对指令进行分析和依赖收集触发
   */
class Compile {
    constructor (vm = {}) {
      this.$vm = vm
      this.parse(this.$vm.$el)
    }
    parse (node) {
      if (!node) {
        console.log('el 不存在')
        return
      }
      let root = null
      try {
        root = getNode(node)
        if (root) {
          Object.keys(root.attributes).forEach(key => {
            let item = root.attributes[key]
            let label = item.name
            let value = item.value
            if (label.indexOf('v-') > -1 || label.indexOf(':') > -1) {
              let name = label.replace('v-', '').replace(':', '')
              console.log('指令：', name)
              // 此处会触发数据的getter函数，进行依赖收集
              new Watcher(this.$vm, {
                name: name,
                value: null,
                expression: value,
                el: root
              })
            }
          })
          if (root.children.length > 0) {
            Array.from(root.children).forEach(node => {
              this.parse(node)
            })
          }
        }
      } catch (e) {
         console.log('捕捉attributes出错', e)
      }
    }
    render (el, bindValue, directive) {}
  }
```





### 指令注册

```javascript
/** 
   * 1: 注册指令
   * 2：注册响应指令绑定数据变化的函数
   */
  class Directive {
    constructor () {
      this.map = new Map()
    }
  }
  Directive.prototype.add = function (name, fn) {
    if (this.map.get(name)) {
      return
    } else {
      this.map.set(name, fn)
    }
  }
  Directive.prototype.remove = function (name, fn) {
    if (this.map.get(name)) {
      this.map.remove(name)
    }
  }
  Directive.prototype.get = function (name) {
    return this.map.get(name)
  }
  let directiveManage = new Directive()
  directiveManage.add('text', function (el, { value }) {
    el.textContent = value
  })
  directiveManage.add('value', function (el, { value, expression }, vm) {
    let data = vm.$data
    el.value = value
    el.addEventListener('input', function (val) {
      vm.$data[expression] = el.value
    })
  })
  directiveManage.add('html', function (el, { value, expression }) {
    el.innerHTML = value
  })
```



### 如何收集依赖

1. 在oberve类中，我们使用`Object.defineproperty`来定义数据的`setter`和`getter`，每个数据的定义里面，会首先定义一个依赖收集器`Dep`

2. 在getter函数中，我们调用dep.depend(),这个函数在获取数据时候会自动调用，有意思的是触发-收集的作用域转移

   先是在getter中设置好`dep.depend()`,然后在complie模板中，找到指令字符，创建一个`Watcher`类，`Watcher`类内部执行`init()`,将`Dep.target`指向`Watcher`自身，然后获取指令对应的数据，这时候触发`dep.depend()`，因为存在Dep.target(即Watcher)，执行`Watcher实例的addDep（this）方法`，传进去当时创建好的`dep依赖收集实例`，再执行`dep.subscribe(this)`,将wather实例推入到dep收集器的队列中

   巧妙利用全局的Dep.target实例，让wather和dep完成依赖的收集