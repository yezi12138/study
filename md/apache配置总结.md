# apache配置总结

## 反向代理

将地址: `http:x.x.x.x`代理到`http:a.a.a.a`

```
## TODO: custom proxy config
Include etc/apache24/extra/httpd-proxy-custom.conf

 <If "%{REQUEST_URI} =~ m#^/x2m/pv/#">
   AddOutputFilterByType INFLATE;SUBSTITUTE;DEFLATE text/html application/json
   SubstituteMaxLineLength 10m
   Substitute 's~http://11.11.187.217:8805/~http://127.0.0.1:10399/x2m/pv/~in'
   Substitute 's~http:\/\/11.11.187.217:8805\/~http://127.0.0.1:10399/x2m/pv/~in'
   Header edit Set-Cookie (xview-static-auth=[^;]+);\s*Path=([^;]+) '$1; path=/x2m/pv$2'
   Substitute 's~</style>~</style><script src=http://127.0.0.1:10399/x2m/custom.js></script>~in'
 </If>

## Custom reverse proxy for iframe preview on 2018-12-17 by
RewriteRule ^/x2m/pv/(.*) http://11.11.187.217:8805/$1 [P,END]
```

##  改写header里面的cookie

Header edit Set-Cookie (xview-static-auth=[^;]+);\s*Path=([^;]+) '$1; path=/x2m/pv$2'



## 往页面添加js文件

Substitute 's~</style>~</style><script src=http://127.0.0.1:10399/x2m/custom.js></script>~in'



## 覆盖原文档自启动的函数，比如onload

在`httpd-proxy-custom.conf`

使用Substitute 字段，替换那些自启动的函数, 同时可以重写某些不兼容的函数

```
<IfDefine !APP_PROXY>^M
<If "reqenv('A2M_APPUUID') in {'82a69b650500594a8e11de7569e878f365777659'}">^M
        AddOutputFilterByType INFLATE;SUBSTITUTE text/html^M
        SubstituteMaxLineLength 10m^M
        Substitute 's~window.returnValue = Value;~document.forms.UserForm && document.forms.UserForm.userID.value.length && (window.parent.parent.controlValue = document.forms.UserForm.userID.value)~in'^M
        Substitute 's~changeurl();~console.log();~in'
          Substitute 's~ShowSignature~console.log~in'
        Substitute 's~window.close();~window.parent.parent.modalCallback();~in'^M
#       Substitute 's~else{window.parent.parent.modalCallback();}~else{try{window.opener.location.reload();if(history.length>1){history.go(-1)}else{window.close();}}catch(e){if(history.length>1){history.go(-1)}else{window.close();}}}~in'
^M
#       Substitute 's~catch(e){window.parent.parent.modalCallback();}~catch(e){try{window.opener.location.reload();if(history.length>1){history.go(-1)}else{window.close();}}catch(e){if(history.length>1){history.go(-1)}else{window.close()
;}}}~in'^M
        ^M
        Substitute 's~else{window.parent.parent.modalCallback();}~else{location.href = "/task portal/UITaskList/TaskList.aspx";}~in'^M
        Substitute 's~catch(e){window.parent.parent.modalCallback();}~catch(e){location.href = "/task portal/UITaskList/TaskList.aspx";}~in'^M
^M
</If>^M
</IfDefine>
```

