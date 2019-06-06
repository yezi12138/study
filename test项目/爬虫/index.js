const superagent = require('superagent')
const cheerio = require('cheerio')
const inquirer = require('inquirer')

// 诸天技能面板
class BookInsect {
  constructor() {
    this.bookshelf = []
    this.top = []
    this.directory = [
      {
        name: '搜索书',
        key: 'search'
      },
      {
        name: '获取热门',
        key: 'getTop'
      },
      {
        name: '获取最新',
        key: 'new'
      },
      {
        name: '打开历史浏览记录',
        key: 'history'
      }
    ]
    this.main()
  }
  initDirectory() {
    inquirer
      .prompt({
        name: 'directory',
        type: 'rawlist',
        choices: this.directory,
        message: '请选择:'
      })
      .then(res => {
        let action = this.directory.find(item => item.name === res.directory)
        this.execAction(action.key)
      })
  }

  execAction(action, ...args) {
    try {
      this[action](...args)
    } catch (e) {
      console.log('函数执行失败: ', action)
    }
  }

  search() {
    inquirer.prompt({
      type: 'input',
      name: 'name',
      message: '请输入书名'
    })
      .then(res => {
        this.execAction('getBook', res.name)
      })
  }

  getBook(fictionName) {
    superagent.get(`https://www.qidian.com/search?kw=${encodeURI(fictionName)}`).end((err, res) => {
      if (err) {
        // 如果访问失败或者出错，会这行这里
        console.log(`抓取失败 - ${err}`)
      } else {
        // 访问成功，请求页面所返回的数据会包含在res
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
        this.getSelectBook(infos)
      }
    });
  }

  getSelectBook(books) {
    inquirer
      .prompt({
        name: 'selectBook',
        type: 'rawlist',
        choices: books,
        message: '请选择书本:'
      })
      .then(res => {
        let selectBook = books.find(book => book.name === res.selectBook)
        this.execAction('bookInterface', selectBook)
      })
  }

  bookInterface(selectBook) {
    let choices = [
      {
        name: '直接阅读',
        key: 'read'
      },
      {
        name: '指定章节',
        key: 'fromRead'
      },
      {
        name: '继续阅读',
        key: 'continueRead'
      }
    ]
    inquirer
      .prompt({
        name: 'bookInterface',
        type: 'rawlist',
        choices: choices,
        message: '请选择目录:'
      })
      .then(res => {
        let action = choices.find(item => item.name === res.bookInterface)
        this.execAction(action.key, selectBook)
      })
  }

  continueRead () {
    let url = 'https://read.qidian.com/chapter/k3rvXjA58sLmkXioLmMPXw2/PJNtCduIcqDwrjbX3WA1AA2'
    this.parseContent(url)
  }

  getFiction(url) {
      superagent.get(url).end((err, res) => {
        if (err) {
          // 如果访问失败或者出错，会这行这里
          console.log(`抓取失败 - ${err}`)
        } else {
          let $ = cheerio.load(res.text);
          let readUrl = 'https:' + $('.book-info a.J-getJumpUrl').attr('href')
          this.parseContent(readUrl)
        }
      });
    }

  read(selectBook) {
    this.getFiction(selectBook.href)
  }

  parseContent (readUrl) {
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
        this.togglePage(nextUrl)
      }
    })
  }

  togglePage (nextUrl) {
    inquirer.prompt({
      type: 'confirm',
      name: 'next',
      message: '是否翻到下一页:'
    })
      .then(res => {
        if (res.next) {
          this.parseContent(nextUrl)
        }
      })
  }

  getTop() {
    superagent.get(`https://www.qidian.com`).end((err, res) => {
      if (err) {
        console.log(`抓取失败 - ${err}`)
      } else {
        let $ = cheerio.load(res.text);
        let infos = []
        $('.book-list-wrap ul li').each((idx, ele) => {
          let title = $(ele).find('.name').text()
          let href = $(ele).find('.name').attr('href')
          let author = $(ele).find('.author').text()
          let item = {
            title,
            href: 'https:' + href,
            author,
            name: title + ' / ' + author
          };
          infos.push(item)
        });
        this.getSelectBook(infos)
      }
    });
  }

  main() {
    this.initDirectory()
  }
}

  let a = new BookInsect()