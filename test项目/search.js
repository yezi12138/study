function deepSearch (node, stack) {
  if (node) {
    stack.push(node)
    if (node.children) {
      Array.from(node.children).forEach(item => {
        deepSearch(item, stack)
      })
    }
  }
  return stack
}

function widenSearch (node) {
  let stack = []
  if (node) {
    stack.push(node)
    while(stack.length > 0) {
      let node = stack.shift()
      console.log(node.name)
      if (node.children) {
        stack = stack.concat(node.children)
      }
    }
  }
}


var mockData = {
  name: 'root',
  children: [
    {
      name: '1-2',
      children: [
        {
          name: '1-2-1',
          children: [
            
          ]
        },
        {
          name: '1-2-2',
          children: [
            {
              name: '1-2-2-1',
            }
          ]
        }
      ]
    },
    {
      name: '1-3',
      children: [
        {
          name: '1-3-1',
          children: [
            {
              name: '1-3-1-1'
            },
            {
              name: '1-3-1-2'
            },
            {
              name: '1-3-1-3'
            }
          ]
        },
        {
          name: '1-3-2'
        },
        {
          name: '1-3-3'
        }
      ]
    },
    {
      name: '1-4',
      children: [
        {
          name: '1-4-1',
          children: [
            {
              name: '1-4-1-1'
            }
          ]
        }
      ]
    }
  ]
}

// deepSearch(mockData, [])
widenSearch(mockData)