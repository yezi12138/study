# webpack打包测试



## 前期准备



### 安装包

```javascript
cnpm install webpack webpack-cli --g
```

我安装的版本为:

1. "webpack": "^4.16.5" 
2. "webpack-cli": "^3.1.0" 

新建一个文件夹`test`

**初始化**： node init

新建三个文件 `index.js`  `sayBye`  `sayGood`

**目录如下**： 

----|---node_modules

​     |--- index.js

​     |--- sayBye .js

​     |--- sayGood.js



###  webpack.conf.js

```javascript
var path = require('path')


module.exports = {
  mode: 'development',
  entry: {
    index: './index'
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: '[name].js'
  }
}
```



### index.js

```javascript
import sayBye from './sayBye'
import sayGood from './sayGood'

sayBye();
sayGood();
```



### sayGood.js

```javascript
import sayBye from './sayBye'

export default function () {
  console.log('sayGood')
}
```



### sayBye.js

```javascript
export default function () {
  console.log('sayBye')
}
```



### package.json

```json
{
  "name": "test",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "webpack --config webpack.conf.js"
  },
  "author": "",
  "license": "ISC"
}

```





## 测试



### 1. 输出单文件， 不提取公共代码

> npm run start



#### 输出结果：

```javascript
PS C:\Users\yyq\Desktop\commonchunk> npm run start

> test@1.0.0 start C:\Users\yyq\Desktop\commonchunk
> webpack --config webpack.conf.js

Hash: 86917d67f59451e454c7
Version: webpack 4.16.5
Time: 118ms
Built at: 2018-08-08 14:14:33
   Asset      Size  Chunks             Chunk Names
index.js  5.17 KiB   index  [emitted]  index
Entrypoint index = index.js
[./index.js] 87 bytes {index} [built]
[./sayBye.js] 56 bytes {index} [built]
[./sayGood.js] 90 bytes {index} [built]
```

#### 结论 



### 2. 输出单文件， 提取公共代码 

#### 修改webpack.conf.js配置

```

```



