## TS + Vue + element



## 引入element

入口处文件main.ts

```javascript
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI)
```



### 全局方式定义

新建一个<name>.d.ts文件

```javascript
declare module 'vue/types/vue.js' {
  interface Vue {
    $Message: any,
    $Modal: any
  }
}
```





## 引入外部js包

需要在<name>.d.ts文件中声明， 之后就可以正常使用

```javascript
declare module "qs"
```



### 外部包方法使用

常规使用,比如说element的验证

```javascript
this.$refs['form'].validate((valid: Boolean) => {
  if (valid) {
    this.$emit('login', true)
  } else {
    this.$emit('login', false)
    return false
  }
})
```

**这样是会报错:**

> ​    Property 'validate' does not exist on type 'Vue | Element | Vue[] | Element[]'.   Property 'validate' does not exist on type 'Vue'. 

因为我们没有定义相对应接口



解决方法如下：

1. 断言 (<value> as <type>)

   ```javascript
   (this.$refs['form'] as any).validate((valid: Boolean) => {
     if (valid) {
       this.$emit('login', true)
     } else {
       this.$emit('login', false)
       return false
     }
   })
   ```

2. 分开定义

   ```javascript
   let form: any = this.$refs['form']
   form.validate((valid: Boolean) => {
     if (valid) {
       this.$emit('login', true)
     } else {
       this.$emit('login', false)
       return false
     }
   })
   ```

   



## promise finally

promise finally是es2018的语法，如果要在ts中使用，需要装载

**promise.finally.ts**

```javascript
/**
 * 增加finally方法
 */

export default function () {
  if (!(Promise.prototype as any).finally) {
    (Promise.prototype as any).finally = function (callback: any) {
      let P = this.constructor
      return this.then(
        (value: any) => P.resolve(callback()).then(() => value),
        (reason: any) => P.resolve(callback()).then(() => { throw reason })
      )
    }
  }
}

```





## vue-property-decorator 

要使用@prop @watch

**首要前提是必须让类经过@Component修饰，否则不起作用**

```javascript
@Component
export default class TableTemp extends Vue {
  @Prop({
      default （） {
      	return {
          tableData: [],
          tableSetting: [],
          fetchUrl: ''
        }
  	}
  }) config!: any         // !号一定要加
}
```



## this指向问题

```js
table: {
    operation: {
      btns: [
        {
          label: '详情',
          type: 'text',
          fn: (row: any) => {
            console.log(this)
            this.openDetail({})
          }
        }
      ]
    }
}

openDetail (data: any) {
    console.log(this)
    this.detailData = data ? data : {}
    this.showDetail = true
}
```

这里两者指向得this不同， 第一个this指向的是未编译的VUE类，第二个是编译后的组件，如下图

![1536030054291](C:\Users\yyq\AppData\Local\Temp\1536030054291.png)

![1536030086160](C:\Users\yyq\AppData\Local\Temp\1536030086160.png)

所以在table-temp组件内部，无法获取到组件实例，必须借助函数，间接触发

