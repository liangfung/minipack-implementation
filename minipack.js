const path = require('path')
const fs = require('fs')
const babylon = require('babylon')
const traverse = require('babel-traverse').default
const { transformFromAst } = require('babel-core')

let ID = 0

/**
 * 解析模块并返回一个对象，包括：
 *  1.模块ID
 *  2.模块filename(相对于父模块的相对路径)
 *  3.babylon解析成ast，再从AST转化为的commonjs风格的代码模块string
 *  4.模块的依赖(arr,存储依赖的相对路径)
 * 
 * @param {string} filename 
 * @returns {Object} {id, dependencies, filename, code}
 */
function createAsset(filename) {
  // 给id赋值并且让全局的ID累加，下一个asset就
  const id = ID++
  const content = fs.readFileSync(filename, 'utf-8')
  // 使用babylon编译成ast
  const ast = babylon.parse(content, {
    sourceType: 'module'
  })
  const dependencies = []
  // 找出import declaration，push到dependency
  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value)
    }
  })
  // 将AST transform成源码
  const { code } = transformFromAst(ast, null, {
    presets: ['env']
  })

  return {
    dependencies,
    // content,
    filename,
    id,
    code
  }
}

/**
 * 返回一个queue来表示dependencies graph
 * 从入口文件开始解析，遇到依赖就递归调用createAsset()函数，直到解析完所有的依赖，生成的asset依次push到graph queue中
 * 同时在每个模块解析后返回的asset中添加mapping属性，用于将模块中的依赖分别映射到queue中的位置
 * @param {string} entry 
 * @returns {array} graph queue
 */
function createGraph(entry) {
  const entryAsset = createAsset(entry)
  const queue = [entryAsset]

  // dirname 父模块的dirname，父模块所在目录的绝对路径
  const dirname = path.dirname(entryAsset.filename)

  // 从entry asset开始递归解析，构建 `dependencies graph` (本例中的graph是个数组)
  for (const asset of queue) {
    const { dependencies } = asset

    // asset.mapping, asset.dependencies ---> queue[i]
    asset.mapping = {}

    dependencies.forEach(relativePath => {
      const absolutionPath = path.join(dirname, relativePath)
      const child = createAsset(absolutionPath)

      asset.mapping[relativePath] = child.id

      queue.push(child)
    })
  }

  return queue
}

/**
 * 返回的bundle是一个立即执行函数(string类型)，参数是modules(array类型)
 * modules是个数组，每个item `key: value`，value是module wrapper function 和 module mapping组成的数组
 * module wrapper function 包裹 module code 是为了形成module各自的scope，模块和模块之间不互相污染
 * module wrapper function接收三个构造出来的参数，分写是 require(), module, exports。
 * require接收id，返回modules中的该id的 module wrapper function 及 mapping，为递归调用做准备
 * @param {array} graph 
 * @returns {string} bundle file string
 */
function bundle(graph) {
  let modules = ''

  graph.forEach(mod => {
    modules += `${mod.id}: [
      (function(require, module, exports){
        ${mod.code}
      }),
      ${JSON.stringify(mod.mapping)}
      ],`
  })

  // 重点是拼一个require inject到module wrapper function的参数
  // require()接收id，拿到相对应的module wrapper function，inject一个localRequire函数，
  // 因为编译成commonjs风格的代码，所有module.code中会有require('./message.js')这样的语句，localRequire函数在JS运行过程遇到'./message.js'
  // 会根据asset的mapping拿到id，根据id到modules中的 module wrapper function并执行，如果模块code有对exports属性操作，则exports属性会改变
  // require()会将执行过 wrapper function之后的 module.exports对象返回
  const result = `
  (function(modules){
    function require(id) {
      const [fn, mapping] = modules[id]
      function localRequire(path) {
        const id = mapping[path]
        return require(id)
      }
      const module = { exports: {} }
      fn(localRequire, module, module.exports)

      return module.exports
    }
    require(0)
  })({${modules}})`

  return result
}

const graph = createGraph('./example/entry.js')
const result = bundle(graph)
console.log(result)