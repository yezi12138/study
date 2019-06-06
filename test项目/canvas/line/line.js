function getMousePos (canvas, event) {
  var rect = canvas.getBoundingClientRect();
  var x = event.clientX - rect.left * (canvas.width / rect.width);
  var y = event.clientY - rect.top * (canvas.height / rect.height);
  return { x, y }
}

function getlength (fromDot, toDot) {
  return Math.sqrt(Math.pow((fromDot[1] - toDot[1]), 2) + Math.pow((fromDot[0] - toDot[0]), 2)).toFixed(2)
}

function addPath (pathArr, from, to, fromDirection, toDirection) {
  var offset = 5 // 正常是低于1，为了敏捷响应设置大点
  var fromDot = from.pos[fromDirection]
  var toDot = to.pos[toDirection]
  let k = (fromDot[1] - toDot[1]) / (fromDot[0] - toDot[0])
  let b = fromDot[1] - fromDot[0] * k
  let equation = function (dot) {
    let ab = getlength(fromDot, toDot)
    let ac = getlength(fromDot, dot)
    let bc = getlength(toDot, dot)
    return Math.abs(dot[0] * k + b - dot[1]) < offset && ab - ac >= 0 && ab - bc >= 0
  }
  pathArr.push({
    from,
    to,
    fromDirection,
    toDirection,
    fromDot,
    toDot,
    equation
  })
}

function requestAnimationFrame (fn) {
  let requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 30)
    }
  return requestAnimationFrame(fn)
}

function cancelAnimationFrame (id) {
  let cancelAnimationFrame =
    window.cancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    clearTimeout
  cancelAnimationFrame(id)
}

class Topology {
  /**
   *
   * @param {*} options
   * el 绑定画布的元素
   * animation 是否开启动画
   * canvasProps canvas的属性
   * tree 是否为树模式，默认开启
   * hoverFn 鼠标经过线条的事件
   * noHoverFn 鼠标离开线条的事件
   */
  constructor(options) {
    this.options = options
    this.options.gap = options.gap || {
      x: 30,
      y: 10
    }
    this.canvas = null
    // 缓存线条的路径
    this.pathArr = []
    this.options.canvasProps = {
      lineWidth: 3,
      lineJoin: 'round',
      strokeStyle: '#6D92DE',
      globalCompositeOperation: 'source-over'
    }
    this.tree = null
    // 缓存每个区的位置
    this.maxPos = {}
    this.options.tree = this.options.tree === false ? false : true
    if (this.options.tree) {
      this._init()
    } else {
      this._createCanvas()
    }
    // 监听事件
    if (this.options.hoverFn) {
      this.canvas.addEventListener("mousemove", event => {
        var pos = getMousePos(this.canvas, event);
        // 判断点在路径上
        var flag = false
        this.pathArr.forEach(item => {
          if (item.equation([pos.x, pos.y])) {
            flag = true
            this.options.hoverFn(item)
          }
        })
        if (!flag) {
          this.options.noHoverFn()
        }
      });
    }
  }
  _init () {
    this._createCanvas()
    this.options.tag = this.options.tag ? this.options.tag : 'div'
    this.tree = this._initTree()
    this.__initElProp(this.tree)
    this.reDraw(true)
    window.addEventListener(
      'resize',
      () => {
        this.reDraw(true)
      },
      false
    )
  }

  _initDataTag (node, parentNode, index) {
    if (!parentNode) {
      node.dataset.tTag = 't'
      return
    } else {
      let tag = parentNode.node.dataset.tTag
      node.dataset.tTag = `${tag}-${index}`
    }
  }

  _initTree () {
    let bg = null
    if (this.options.el instanceof HTMLElement) {
      bg = this.options.el
    } else {
      bg = document.body.querySelector(this.options.el)
    }
    let root = bg.children[0]
    if (!root) {
      console.log('不存在根节点')
      return
    }
    this._initDataTag(root)
    let childrenTag = this.options.childrenTag || 't-children'
    /**
     * 递归生成关系树
     * @param {*} node 当前节点
     * @param {*} 父节点
     * @return [object] 树形结构的对象
     */
    let _createJson = (node, parentNode) => {
      let children = Array.from(node.children).filter(item =>
        item.classList.contains(childrenTag)
      )
      let treeNode = {
        tTag: node.dataset.tTag,
        node: node,
        parentNode: parentNode,
        children: null,
        expand: false,
        show: false, // 是否显示
        error: false // 是否故障
      }
      if (node.dataset.expand || node.dataset.expand === 'true') {
        treeNode.expand = true
      }
      if (children && children.length > 0) {
        treeNode.children = {}
        children = children[0].children
        Array.from(children).forEach((childrenNode, idx) => {
          this._initDataTag(childrenNode, treeNode, ++idx)
        })
        Array.from(children).forEach(childrenNode => {
          let itemObj = _createJson(childrenNode, treeNode)
          treeNode.children[itemObj.tTag] = itemObj
        })
      }
      return treeNode
    }
    let tree = _createJson(root, null)
    return {
      t: tree
    }
  }

  _createCanvas () {
    this.options.el.style.position = 'relative'
    let canvas = document.createElement('canvas')
    canvas.id = 't-canvas'
    canvas.width = 3000
    canvas.height = 3000
    canvas.style.position = 'absolute'
    canvas.style.zIndex = '0'
    this.canvas = canvas
    this.options.el.appendChild(this.canvas)
  }

  _initPos (node) {
    Object.keys(node).forEach(key => {
      let el = node[key].node
      if (!node[key].show) {
        el.pos = null
      } else {
        el.pos = this._caculateElPos(el)
      }
      if (node[key].children) {
        this._initPos(node[key].children)
      }
    })
  }

  __initElProp (node) {
    Object.keys(node).forEach(key => {
      let el = node[key].node
      if (node[key].tTag === 't') {
        el.className = 't-root'
        node[key].show = true
      } else {
        el.className = 't-item'
        node[key].show = false
      }
      // 添加展开收缩事件
      el.addEventListener(
        'click',
        e => {
          e.stopPropagation()
          this.toggle(node[key].tTag)
        },
        false
      )
      node[key].children && this.__initElProp(node[key].children)
    })
  }

  // 相对于canvas的距离
  _caculateElPos (el) {
    let rect = el.getBoundingClientRect()
    let canvasRect = this.canvas.getBoundingClientRect()
    rect = {
      left: rect.left - canvasRect.left,
      right: rect.left - canvasRect.left + rect.width,
      top: rect.top - canvasRect.top,
      bottom: rect.top - canvasRect.top + rect.height,
      width: rect.width,
      height: rect.height
    }
    let pos = {
      left: [rect.left, rect.top + rect.height / 2],
      right: [rect.left + rect.width, rect.top + rect.height / 2],
      top: [rect.left + rect.width / 2, rect.top],
      bottom: [rect.left + rect.width / 2, rect.top + rect.height]
    }
    return pos
  }

  _animationTo (ctx, originFromX, originFromY, originToX, originToY) {
    return new Promise(resolve => {
      let INCREMENT = 10
      let run = (fromX, fromY, toX, toY, resolve) => {
        if (toY - fromY === 0 && toX - fromX === 0) {
          resolve()
          return
        }
        requestAnimationFrame(() => {
          let INCREMENT_X = originFromX <= originToX ? INCREMENT : -INCREMENT
          let INCREMENT_Y = originFromY <= originToY ? INCREMENT : -INCREMENT
          let from = (fromX += INCREMENT_X)
          let to = (fromY += INCREMENT_Y)
          if (
            (originFromX <= originToX && from >= toX) ||
            (originFromX >= originToX && from <= toX)
          ) {
            from = toX
          }
          if (
            (originFromY <= originToY && to >= toY) ||
            (originFromY >= originToY && to <= toY)
          ) {
            to = toY
          }
          ctx.lineTo(from, to)
          ctx.stroke()
          run(from, to, toX, toY, resolve)
        })
      }
      run(
        Math.floor(originFromX),
        Math.floor(originFromY),
        Math.floor(originToX),
        Math.floor(originToY),
        resolve
      )
    })
  }

  find (tTag) {
    let arr = tTag.split('-')
    let index = arr.shift()
    let value = this.tree[index]
    while (value && arr.length > 0) {
      index = index + '-' + arr.shift()
      value = value.children[index]
    }
    if (arr.children) {
      value = null
    }
    return value
  }

  async showNode (item, isRender = true) {
    if (item.children) {
      item.node.classList.remove('add-icon')
      item.node.classList.add('reduce-icon')
      let values = Object.values(item.children)
      let yLevel = -Math.floor(values.length / 2)
      let beforeLeftNode = null,
        beforeRightNode = null
      let right = 0,
        left = 0
      // 同组比较， 找出最边界的点，如果不够长，则X轴增加差值
      if (item.parentNode) {
        Object.values(item.parentNode.children).forEach(node => {
          let r = node.node.pos.right[0]
          let l = node.node.pos.left[0]
          if (l < left || (left === 0 && l > 0)) {
            left = l
          }
          if (r > right) {
            right = r
          }
        })
      }
      for (let i = 0; i < values.length; i++) {
        let nodeObj = values[i]
        let node = nodeObj.node
        node.style.display = 'inline-block'
        nodeObj.show = true
        if (nodeObj.children) {
          node.classList.remove('reduce-icon')
          node.classList.add('add-icon')
        }
        let offset = 0
        let XLENGTH = 0
        // 初始化方向
        if (item.tTag === 't') {
          if (i % 2 === 0) {
            node.dataset.direction = 'left'
          } else {
            node.dataset.direction = 'right'
          }
        } else if (item.node.dataset.direction === 'left') {
          node.dataset.direction = 'left'
        } else if (item.node.dataset.direction === 'right') {
          node.dataset.direction = 'right'
        }
        // 初始化位置
        if (node.dataset.direction === 'left') {
          if (left === 0) {
            offset = 0
          } else {
            offset = (item.node.pos.left[0] - left) * 2
            offset = offset <= 0 ? 0 : offset
          }
          XLENGTH = -(this.options.gap.x + node.offsetWidth + offset)
          node.style.left = XLENGTH + 'px'
          if (beforeLeftNode) {
            node.style.top =
              this.options.gap.y +
              beforeLeftNode.offsetHeight +
              beforeLeftNode.offsetTop +
              'px'
          } else {
            node.style.top =
              yLevel * this.options.gap.y +
              item.node.offsetHeight / 2 -
              node.offsetHeight / 2 +
              'px'
          }
          beforeLeftNode = node
        } else {
          if (left === 0) {
            offset = 0
          } else {
            offset = (right - item.node.pos.right[0]) * 2
            offset = offset <= 0 ? 0 : offset
          }
          XLENGTH = -(this.options.gap.x + node.offsetWidth + offset)
          node.style.right = XLENGTH + 'px'
          if (beforeRightNode) {
            node.style.top =
              this.options.gap.y +
              beforeRightNode.offsetHeight +
              beforeRightNode.offsetTop +
              'px'
          } else {
            node.style.top =
              yLevel * this.options.gap.y +
              item.node.offsetHeight / 2 -
              node.offsetHeight / 2 +
              'px'
          }
          beforeRightNode = node
        }
        // beforeNode && console.log(beforeNode.offsetTop, beforeNode.offsetHeight, this.options.gap.y + beforeNode.offsetHeight + beforeNode.offsetTop)
      }
      // 记录位置
      item.expand = true
      this._initPos({
        [item.tTag]: item
      })
      this._refleshMaxPos(item)
      this._jugdePos(item)
      isRender && this.reDraw()
    }
  }

  // 记录整组子节点的边界
  _refleshMaxPos (node) {
    var isConsole = false
    node = node || this.tree.t
    if (!node.expand || !node.children || !node.show) {
      return
    }
    let length = node.tTag.split('-').length + 1
    let values = Object.values(node.children)
    if (!values[0].show) {
      return
    }
    let top = values[0].node.pos.top[1]
    let bottom = values[values.length - 1].node.pos.bottom[1]
    let right = 0,
      left = 0
    values.forEach(node => {
      let r = node.node.pos.right[0]
      let l = node.node.pos.left[0]
      if (l < left || (left === 0 && l > 0)) {
        left = l
      }
      if (r > right) {
        right = r
      }
    })
    if (!this.maxPos[length]) {
      this.maxPos[length] = [
        {
          top,
          left,
          right,
          bottom,
          node: node,
          tTag: node.tTag
        }
      ]
    } else {
      // 去除重复
      this.maxPos[length] = this.maxPos[length].filter(obj => {
        if (obj.tTag === node.tTag) {
          return false
        } else if (!obj.node.expand) {
          return false
        } else {
          return true
        }
      })
      this.maxPos[length].push({
        top,
        bottom,
        left,
        right,
        node: node,
        tTag: node.tTag
      })
      // 排序,防止碰撞检测时候先检测
    }
    isConsole &&
      console.log(node.tTag, '更新', length, '为: ', this.maxPos[length])
    values.forEach(item => {
      this._refleshMaxPos(item)
    })
  }

  /**
   * 重新调整位置
   * @param {*} sbilingNode 兄弟节点
   * @param {*} showNode
   */
  async _jugdePos (showNode) {
    let iscConsole = true
    if (
      showNode.tTag === 't' ||
      !showNode.children ||
      showNode.children === 0
    ) {
      return
    }
    let showArr = showNode.tTag.split('-')
    let length = showArr.length + 1
    let values = Object.values(showNode.children)
    let top = values[0].node.pos.top[1]
    let bottom = values[values.length - 1].node.pos.bottom[1]
    let ylevelArr = this.maxPos[length]
    // 判断是否更改
    let isChange = false
    // 如果不存在数组，则保存
    // y轴碰撞
    ylevelArr.forEach(item => {
      if (item.tTag !== showNode.tTag) {
        let flag = false
        // 判断为同方向
        let sameDirection =
          item.node.node.dataset.direction === showNode.node.dataset.direction
        // 判断是否碰撞
        let isCollision =
          sameDirection && !(bottom < item.top || top > item.bottom)
        iscConsole &&
          isCollision &&
          console.log(
            '发生y轴碰撞: ',
            showNode.node,
            '------->',
            item.node.node
          )
        // 判断位于碰撞取域的上下方
        if (isCollision) {
          let isTopOverlapping = false
          let itemArr = item.tTag.split('-')
          let showArr = showNode.tTag.split('-')
          showArr.shift()
          itemArr.shift()
          while (showArr.length !== 0) {
            let a = showArr.shift()
            let b = itemArr.shift()
            if (a > b) {
              isTopOverlapping = false
              break
            } else if (a < b) {
              isTopOverlapping = true
              break
            }
          }
          iscConsole && console.log('y轴碰撞方向: ', isTopOverlapping)
          if (!flag && isTopOverlapping && showNode.tTag !== item.tTag) {
            iscConsole && console.log('上方重叠内含')
            isChange = true
            flag = true
            let offset = bottom - item.top
            this._recursiveChange(showNode, offset, null, false)
            this._initPos(this.tree)
          }

          /**
           * 下方重叠内含
           */
          if (!flag && !isTopOverlapping && showNode.tTag !== item.tTag) {
            iscConsole && console.log('下方重叠内含', showNode.node.pos)
            isChange = true
            flag = true
            let offset = item.bottom - top
            this._recursiveChange(showNode, offset, null, true)
            this._initPos(this.tree)
          }
        }
      }
    })
    // x轴碰撞
    let xlevelArr = this.maxPos[length - 1]
    xlevelArr.forEach(item => {
      // 判断为同方向
      let direction = item.node.node.dataset.direction
      let sameDirection = direction === showNode.node.dataset.direction
      // 判断是否碰撞
      let isCollision =
        item.tTag !== showNode.parentNode.tTag &&
        sameDirection &&
        !(bottom < item.top || top > item.bottom)
      if (isCollision) {
        let right = 0
        if (direction === 'right') {
          right =
            showNode.node.pos.right[0] +
            (values[0].node.pos.left[0] - showNode.node.pos.right[0]) / 2 -
            this.options.canvasProps.lineWidth / 2
        } else {
          right =
            showNode.node.pos.left[0] -
            (showNode.node.pos.left[0] - values[0].node.pos.right[0]) / 2 +
            this.options.canvasProps.lineWidth / 2
        }
        if (direction === 'right' && right < item.right) {
          iscConsole &&
            console.log(
              'x轴右侧碰撞: ',
              showNode.node,
              '------->',
              item.node.node
            )
          let offset = (item.right - right) * 2
          values.forEach(node => {
            node.node.style.right =
              parseInt(node.node.style.right, 10) - offset + 'px'
          })
        }
        if (direction === 'left' && right > item.left) {
          iscConsole &&
            console.log(
              'x轴左侧碰撞: ',
              showNode.node,
              '------->',
              item.node.node
            )
          let offset = (right - item.left) * 2
          values.forEach(node => {
            node.node.style.left =
              parseInt(node.node.style.left, 10) - offset + 'px'
          })
        }
      }
    })
    isChange && this._refleshMaxPos()
  }

  /**
   * 递归极端计算位置
   * @param {*} node 递归的节点
   * @param {*} offset 偏移的距离
   * @param {*} afterNodes 可选，存在则直接获取，不在则通过_getSibling获取
   */
  _recursiveChange (node, offset, afterNodes, isSelfMove = true) {
    let arr = node.tTag.split('-')
    if (isSelfMove) {
      node.node.style.top =
        parseInt(node.node.style.top, 10) +
        Math.abs(offset) +
        this.options.gap.y +
        'px'
    }
    if (!afterNodes) {
      afterNodes = this._getSibling(node).afterNodes
    }
    // 遍历下面兄弟节点
    if (afterNodes.length > 0) {
      afterNodes.forEach(item => {
        let sameDirection =
          item.node.dataset.direction === node.node.dataset.direction
        sameDirection &&
          (item.node.style.top =
            parseInt(item.node.style.top, 10) +
            Math.abs(offset) +
            this.options.gap.y +
            'px')
      })
    }

    // 递归父节点
    if (node.parentNode && node.parentNode.tTag !== 't') {
      this._recursiveChange(node.parentNode, offset, null, false)
    }
  }

  async reDraw (isReExpand) {
    var run = async (node, isReExpand) => {
      if (isReExpand) {
        if (node && node.expand) {
          await this.showNode(node, false)
          let children = Object.values(node.children || [])
          for (let i = 0; i < children.length; i++) {
            await run(children[i], isReExpand)
          }
        }
      } else {
        if (node && node.expand) {
          let children = Object.values(node.children || [])
          for (let i = 0; i < children.length; i++) {
            let item = children[i]
            await this.draw(node.node, item.node)
            await run(item)
          }
        }
      }
    }
    this.clear()
    if (isReExpand) {
      this.maxPos = {}
    }
    await run(this.tree.t, isReExpand)
    if (isReExpand) {
      await this.reDraw()
    }
    await this._reDrawError()
  }

  async _reDrawError () {
    var run = async node => {
      if (node.tTag !== 't' && node.error && node.show) {
        this.drawErrorLine(node.parentNode.node, node.node)
      }
      let children = Object.values(node.children || [])
      for (let i = 0; i < children.length; i++) {
        let item = children[i]
        await run(item)
      }
    }
    await run(this.tree.t)
  }

  /**
   * 获取下面的兄弟节点
   */
  _getSibling (node) {
    let beforeNodes = []
    let afterNodes = []
    if (node.tTag !== 't') {
      let arr = node.tTag.split('-')
      let index = arr.pop()
      let item = null
      let count = Number(index)
      while (count > 0) {
        arr.push(--count)
        item = this.find(arr.join('-'))
        item && beforeNodes.push(item)
        arr.pop()
      }
      count = Number(index)
      item = null
      do {
        arr.push(++count)
        item = this.find(arr.join('-'))
        item && afterNodes.push(item)
        arr.pop()
      } while (item)
    }
    return { beforeNodes, afterNodes }
  }

  async hideNode (nodeObj) {
    nodeObj.node.classList.remove('reduce-icon')
    nodeObj.node.classList.add('add-icon')
    var run = function (nodeObj) {
      if (nodeObj.expand) {
        nodeObj.expand = false
        let arr = Object.values(nodeObj.children)
        for (let i = 0; i < arr.length; i++) {
          let item = arr[i]
          item.node.style.display = 'none'
          item.show = false
          if (item.children) {
            run(item)
          }
        }
      }
    }
    run(nodeObj)
    // 重绘
    if (nodeObj.tTag !== 't') {
      this.reDraw(true)
    } else {
      this.clear()
    }
  }

  clear () {
    let ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   *
   * @param {*} from 来源元素
   * @param {*} to 连接元素
   */
  draw (from, to) {
    if (this.options.drag) {
      this._initPos(this.tree)
    }
    let ctx = this.canvas.getContext('2d')
    ctx.beginPath()
    Object.keys(this.options.canvasProps).forEach(key => {
      ctx[key] = this.options.canvasProps[key]
    })
    let direction = to.dataset.direction
    if (direction === 'left') {
      ctx.moveTo(from.pos.left[0], from.pos.left[1])
      ctx.lineTo(
        (to.pos.right[0] - from.pos.left[0]) / 2 + from.pos.left[0],
        from.pos.right[1]
      )
      ctx.lineTo(
        (to.pos.right[0] - from.pos.left[0]) / 2 + from.pos.left[0],
        to.pos.right[1]
      )
      ctx.lineTo(to.pos.right[0], to.pos.right[1])
      ctx.stroke()
    } else {
      ctx.moveTo(from.pos.right[0], from.pos.right[1])
      ctx.lineTo(
        (to.pos.left[0] - from.pos.right[0]) / 2 + from.pos.right[0],
        from.pos.left[1]
      )
      ctx.lineTo(
        (to.pos.left[0] - from.pos.right[0]) / 2 + from.pos.right[0],
        to.pos.left[1]
      )
      ctx.lineTo(to.pos.left[0], to.pos.left[1])
      ctx.stroke()
    }
  }

  async drawErrorLine (from, to) {
    // 画红线动画
    if (this.options.drag) {
      this._initPos(this.tree)
    }
    let ctx = this.canvas.getContext('2d')
    ctx.beginPath()
    Object.keys(this.options.canvasProps).forEach(key => {
      ctx[key] = this.options.canvasProps[key]
    })
    ctx.strokeStyle = 'red'
    if (this.options.animation) {
      let direction = to.dataset.direction
      if (direction === 'left') {
        ctx.moveTo(from.pos.left[0], from.pos.left[1])
        await this._animationTo(
          ctx,
          from.pos.left[0],
          from.pos.left[1],
          (to.pos.right[0] - from.pos.left[0]) / 2 + from.pos.left[0],
          from.pos.right[1]
        )
        await this._animationTo(
          ctx,
          (to.pos.right[0] - from.pos.left[0]) / 2 + from.pos.left[0],
          from.pos.right[1],
          (to.pos.right[0] - from.pos.left[0]) / 2 + from.pos.left[0],
          to.pos.right[1]
        )
        await this._animationTo(
          ctx,
          (to.pos.right[0] - from.pos.left[0]) / 2 + from.pos.left[0],
          to.pos.right[1],
          to.pos.right[0],
          to.pos.right[1]
        )
      } else {
        ctx.moveTo(from.pos.right[0], from.pos.right[1])
        await this._animationTo(
          ctx,
          from.pos.right[0],
          from.pos.right[1],
          (to.pos.left[0] - from.pos.right[0]) / 2 + from.pos.right[0],
          from.pos.left[1]
        )
        await this._animationTo(
          ctx,
          (to.pos.left[0] - from.pos.right[0]) / 2 + from.pos.right[0],
          from.pos.left[1],
          (to.pos.left[0] - from.pos.right[0]) / 2 + from.pos.right[0],
          to.pos.left[1]
        )
        await this._animationTo(
          ctx,
          (to.pos.left[0] - from.pos.right[0]) / 2 + from.pos.right[0],
          to.pos.left[1],
          to.pos.left[0],
          to.pos.left[1]
        )
      }
    } else {
      ctx.strokeStyle = 'red'
      let direction = to.dataset.direction
      if (direction === 'left') {
        ctx.moveTo(from.pos.left[0], from.pos.left[1])
        ctx.lineTo(
          (to.pos.right[0] - from.pos.left[0]) / 2 + from.pos.left[0],
          from.pos.right[1]
        )
        ctx.lineTo(
          (to.pos.right[0] - from.pos.left[0]) / 2 + from.pos.left[0],
          to.pos.right[1]
        )
        ctx.lineTo(to.pos.right[0], to.pos.right[1])
        ctx.stroke()
      } else {
        ctx.moveTo(from.pos.right[0], from.pos.right[1])
        ctx.lineTo(
          (to.pos.left[0] - from.pos.right[0]) / 2 + from.pos.right[0],
          from.pos.left[1]
        )
        ctx.lineTo(
          (to.pos.left[0] - from.pos.right[0]) / 2 + from.pos.right[0],
          to.pos.left[1]
        )
        ctx.lineTo(to.pos.left[0], to.pos.left[1])
        ctx.stroke()
      }
    }
  }

  /**
   * 提供单纯线条画路径，不用规定树形结构
   */
  staticDraw (from, to, options = {
    fromDirection: 'right',
    toDirection: 'left'
  }) {
    from.pos = this._caculateElPos(from)
    to.pos = this._caculateElPos(to)
    // 绘画
    let ctx = this.canvas.getContext('2d')
    ctx.beginPath()
    Object.keys(this.options.canvasProps).forEach(key => {
      ctx[key] = this.options.canvasProps[key]
    })
    var fromDot = from.pos[options.fromDirection]
    var toDot = to.pos[options.toDirection]
    this.drawArrow(ctx, fromDot[0], fromDot[1], toDot[0], toDot[1])
    ctx.stroke()
    addPath(this.pathArr, from, to, options.fromDirection, options.toDirection)
  }

  drawArrow (ctx, fromX, fromY, toX, toY, theta, headlen) {
    var theta = theta || 30,
      headlen = headlen || 10,
      angle = Math.atan2(fromY - toY, fromX - toX) * 180 / Math.PI,
      angle1 = (angle + theta) * Math.PI / 180,
      angle2 = (angle - theta) * Math.PI / 180,
      topX = headlen * Math.cos(angle1),
      topY = headlen * Math.sin(angle1),
      botX = headlen * Math.cos(angle2),
      botY = headlen * Math.sin(angle2);
    Object.keys(this.options.canvasProps).forEach(key => {
      ctx[key] = this.options.canvasProps[key]
    })
    ctx.save();
    ctx.beginPath();
    var arrowX, arrowY;
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    arrowX = toX + topX;
    arrowY = toY + topY;
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(toX, toY);
    arrowX = toX + botX;
    arrowY = toY + botY;
    ctx.lineTo(arrowX, arrowY);
    ctx.stroke();
    ctx.restore();
  }

  toggle (tTag) {
    let item = this.find(tTag)
    if (item.expand) {
      this.hideNode(item)
    } else {
      this.showNode(item)
    }
  }
}
