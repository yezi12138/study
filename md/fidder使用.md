# fidder使用

## 资源替换为别的路径

### AutoResponder

![1547778439304](C:\Users\yyq\AppData\Local\Temp\1547778439304.png)

![1547778450390](C:\Users\yyq\AppData\Local\Temp\1547778450390.png)



### urlreplace

```
urlreplace www.demo.com www.dev.demo.com
```

取消

```
urlreplace
```



### CustomRules.js

```
请先在CustomRules.js 找到：
 
  static function OnBeforeRequest ( oSession : Session ) {
   // ...
 }
在函式OnBeforeRequest 中加入：
 
  if ( oSession . HostnameIs ( 'www.demo.com' ) )
   oSession . hostname = 'www.dev.demo.com' ;
```





## 拦截请求，修改参数

![1547779608512](C:\Users\yyq\AppData\Local\Temp\1547779608512.png)

![1547779620813](C:\Users\yyq\AppData\Local\Temp\1547779620813.png)