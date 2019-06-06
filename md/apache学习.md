#  apache学习

## 基本命令

1. httpd -k start 启动服务
2. httpd -k stop 关闭服务
3. httpd -k restart  重启服务
4. httpd -t 检测语法错误



## 更改网站目录

### 路径： httpd.conf

```properties
DocumentRoot "${path}"
# path的路径相对于根路径，比如我装在C盘，那就是c:\
```

### 遇到的问题

1. 更改了配置文件，重启apache，发现页面没有变化，甚至修改运行的端口，也没有变化。**最后打开任务管理器，手动关闭重启apache，发现修改成功**。



## 添加访问权限

### 路径禁止访问

```properties
<Directory "${SRVROOT}/htdocs">
    Options FollowSymLinks
    AllowOverride None
    Require all denied
</Directory>
```

![1547691700794](C:\Users\yyq\AppData\Local\Temp\1547691700794.png)

### 拒绝特定ip访问

```properties
<Directory "${SRVROOT}/htdocs">
    Options FollowSymLinks
    AllowOverride None
    Require all granted
    deny from 192.168.1.0
</Directory>
```





## 禁止资源访问

#### 禁止相对目录资源

```properties
<Location /static/>
   Order allow,deny
   Deny from all
</Location> 
```

![1547692809049](C:\Users\yyq\AppData\Local\Temp\1547692809049.png)



#### 禁止图片,文件资源

```properties
<Directory />
# ..other
    <FilesMatch \.(?i:gif|jpe?g|png)$>
       Order allow,deny
       Deny from all
    </FilesMatch> 
</Directory>
```

![1547692989841](C:\Users\yyq\AppData\Local\Temp\1547692989841.png)

更改正则匹配，可以对特定资源限定，

1. `<FilesMatch login-icon\.2b53739d\.(?i:gif|jpe?g|png)$>`，对上图第一个图片限制
2. `<FilesMatch \.json$>`, 对json限制





## 修改网页内容

#### 全局修改

```properties
<Location "/">
    AddOutputFilterByType SUBSTITUTE text/html application/json
    SubstituteMaxLineLength 10m
    Substitute 's~captcha~captcha123123~in'
</Location> 
```

![1547707116650](C:\Users\yyq\AppData\Local\Temp\1547707116650.png)

其中`application/json` `text/html`是要修改的文件类型，如果去掉`application/json` ，则不能改到json文件中的值



AddOutputFilterByType使用必须开启以下内容

>  LoadModule filter_module modules/mod_filter.so 



Substitute使用必须开启以下内容

> LoadModule substitute_module modules/mod_substitute.so 



#### 特定页面/请求修改

```properties
<If "%{REQUEST_URI} =~ m#^/config.json#">
   AddOutputFilterByType SUBSTITUTE text/html application/json
    SubstituteMaxLineLength 10m
    Substitute 's~captcha~captcha123123~in'
 </If>
```

![1547708770890](C:\Users\yyq\AppData\Local\Temp\1547708770890.png)

![1547708784077](C:\Users\yyq\AppData\Local\Temp\1547708784077.png)

这里只有`config.json`文件中的captcha被修改



#### 插入新内容

同样使用`Substitute`

```properties
<Location "/">
    AddOutputFilterByType SUBSTITUTE text/html application/json
    SubstituteMaxLineLength 10m
    Substitute 's~captcha~captcha123123~in'
    Substitute 's~</body>~<script src=./static/a.js></script></body>'
</Location>
```

![1547709263652](C:\Users\yyq\AppData\Local\Temp\1547709263652.png)



## 替换代理地址

### 一般使用

```properties
<Directory />
    RewriteEngine On
    RewriteRule "^index\.html$"  "welcome.html"
</Directory>
```

![1547713115962](C:\Users\yyq\AppData\Local\Temp\1547713115962.png)

直接将index.html请求替换成welcome.html



### 拦截特定路径地址

```properties
RewriteEngine On
RewriteRule ^/static/(.*) http://11.11.187.217:8805/$1

# 或者写在特定的路径下
# 两者的写法不同，请注意
# <Location "/">
#     AddOutputFilterByType SUBSTITUTE text/html application/json
#     SubstituteMaxLineLength 10m
#     Substitute 's~captcha~captcha123123~in'
#     Substitute 's~</body>~<script src=./static/a.js></script></body>'
#     RewriteEngine On
#     RewriteRule ^(.*)/static/(.*) http://11.11.187.217:8805/$2
# </Location>
```





## Apache htaccess 中的RewriteCond 

[Apache htaccess 中的RewriteCond 规则介绍 (转)](https://www.cnblogs.com/zhang36/p/6186004.html)