const express = require('express');
const app = express();
const superagent = require('superagent');
const cheerio = require('cheerio');
const inquirer = require('inquirer')


let fiction = []
let fictionName = ''
let lastUrl = 'https://read.qidian.com/chapter/fmw97IO6Tvddi5-cWpsVtA2/1vpio9PBof3wrjbX3WA1AA2'

// ...

let server = app.listen(3000, function () {
  let host = server.address().address;
  let port = server.address().port;
});


inquirer.prompt({
  type: 'input',
  name: 'name',
  message: '请输入书名'
})
.then(res => {
  getHTML(res.name)
})

/**
 * superagent
 */
function getHTML (fictionName) {
  superagent.get(`https://www.qidian.com/search?kw=${encodeURI(fictionName)}`).end((err, res) => {
    if (err) {
      // 如果访问失败或者出错，会这行这里
      console.log(`抓取失败 - ${err}`)
    } else {
      // 访问成功，请求页面所返回的数据会包含在res
      let books = getFictionUrl(res)
      getSelectBook(books)
    }
  });
}

/**
 * 获取fiction链接
 */
function getFictionUrl(res) {
  let $ = cheerio.load(res.text);
  let infos = []
  $('div#result-list ul > li').each((idx, ele) => {
    let title = $(ele).find('.book-mid-info > h4 a').text()
      let href = $(ele).find('.book-mid-info > h4 a').attr('href')
      let author = $(ele).find('.book-mid-info > p.author .name').text()
      let item = {
        title,
        href: 'https:' + href,
        author,
        name: title + ' / ' + author
      };
    infos.push(item)
  });
  return infos
}

/**
 * 选中书
 */
function getSelectBook(books) {
  inquirer
    .prompt({
      name: 'selectBook',
      type: 'rawlist',
      choices: books,
      message: '请选择书本:'
    })
    .then(res => {
      let selectBook = books.find(book => book.name = res.selectBook)
      continuePage(selectBook.href)
    })
}

function getFiction (url) {
  superagent.get(url).end((err, res) => {
    if (err) {
      // 如果访问失败或者出错，会这行这里
      console.log(`抓取失败 - ${err}`)
    } else {
      let $ = cheerio.load(res.text);
      let readUrl = 'https:' + $('.book-info a.J-getJumpUrl').attr('href')
      parseContent(readUrl)
    }
  });
}

function parseContent (readUrl) {
  console.log('readUrl', readUrl)
  superagent.get(readUrl).end((err, res) => {
    if (err) {
      // 如果访问失败或者出错，会这行这里
      console.log(`抓取失败 - ${err}`)
    } else {
      let $ = cheerio.load(res.text);
      let title = $('.text-head h3.j_chapterName').text()
      let content = $('div.read-content p');
      let nextUrl = 'https:' + $('.chapter-control #j_chapterNext').attr('href')
      console.log('\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n')
      console.log(`
      
          ******************
      *       ${title}         *
          ******************
      
      `)
      content.each((index, p) => {
        console.log($(p).text())
      })
      togglePage(nextUrl)
    }
  })
}

function togglePage (nextUrl) {
  inquirer.prompt({
    type: 'confirm',
    name: 'next',
    message: '是否翻到下一页:'
  })
  .then(res => {
    if (res.next) {
      parseContent(nextUrl)
    }
  })
}

function continuePage (url) {
  inquirer.prompt({
    type: 'confirm',
    name: 'continue',
    message: '是否继续上一次阅读的位置 :'
  })
  .then(res => {
    if (res.continue) {
      parseContent(lastUrl)
    } else {
      parseContent(url)
    }
  })
}