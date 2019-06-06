const {join:pathJoin} = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
module.exports = {
    entry:{
        app:'./src/index.js' // 入口文件的位置
    },
    output:{
        filename: '[name].[hash].js', // 输出文件名字的格式
        path:pathJoin(__dirname,'./dist') // 输出的绝对路径
    },
    module: {
      rules: [
          {
              test: /\.vue$/,
              use: ['vue-loader'] // +++
          },
          {
              test: /\.css$/,
              use: [{
                loader:MiniCssExtractPlugin.loader
            }, 'css-loader'] // +++
          }
      ]
  },
  plugins:[
    new HtmlWebpackPlugin({
        template:'index.html',// 指定模板html文件
        filename:'index.html'// 输出的html文件名称
    }),
    new MiniCssExtractPlugin({
        filename:'style.css' // 指定输出的css文件名.
    }),
    new VueLoaderPlugin() // +++
  ]
}