var fs = require('fs')
var contents = fs.readFileSync('./source.lsp', 'utf-8')

// Parser
var operators = ['+', '-', '*', '/', '>', '>=', '<', '<=']
var next
function parse (input, arr) {
  if (input === undefined) { return undefined }
  if (input.startsWith('(')) {
    next = parse(input.slice(1), [])
    if (next[0].slice(1) === '') {
      return next[1]
    }
    arr = arr.concat([next[1]])
    return parse(next[0].slice(1), arr)
  }
  if (input.startsWith(')')) {
    return [input, arr]
  }
  var result
  result = factory_parser(input).pop()
  if (result[1] === '') {
    return arr.concat(result[0])
  }
  return parse(result[1], arr.concat(result[0]))
}

function factory_parser (input) {
  var fnArr = [number_parser(input), opertor_parser(input), keyword_parser(input), space_parser(input)]
  return fnArr.filter(function (value) {
    return (typeof value === 'object')
  })
}

function elem (input) {
  var str = ''
  var sl = input[0]
  while (sl !== ' ' && sl !== ')') {
    str = str + sl
    sl = input.slice(1)[0]
    input = input.slice(1)
    if (sl === undefined) {
      break
    }
  }
  return [str, input]
}

function number_parser (input) {
  var first = elem(input)
  return (!isNaN(Number(first[0]))) ? first : false
}

function opertor_parser (input) {
  var first = elem(input)
  return (operators.indexOf(first[0]) !== -1) ? first : false
}

function keyword_parser (input) {
  var first = elem(input)
  return (typeof first[0] === 'string') ? first : false
}

function space_parser (input) {
  return (input[0] === ' ') ? [[], input.slice(1)] : false
}

var macroS = {}
function checkMacro (input) {
  if (input[0] === 'defmacro') {
    macroS[input[1]] = {}
    macroS[input[1]]['macroArgs'] = input[2]
    macroS[input[1]]['macroTemplate'] = tilda(input[3], input[1])
  }
  if (macroS[input[0]] !== undefined) {
    var newInput = macroS[input[0]]['macroTemplate']
    return tildaVal(newInput, input[0], input)
  }
  else {
    return input
  }
 }

 function tilda (input, key) {
   for (var i = 0; i < input.length; ++i) {
    if(typeof input[i] !== 'object') {
      var l = macroS[key]['macroArgs'].length
      for(var k = 0; k < l; ++k) {
        input[i] = input[i].replace(macroS[key]['macroArgs'][k], '~' + macroS[key]['macroArgs'][k])
      }
    }
    else {
      tilda(input[i], key)
    }
   }
   return input
 }

  function tildaVal (input, key, actualInput) {
    for (var i = 0; i < input.length; ++i) {
     if(typeof input[i] !== 'object') {
       var l = macroS[key]['macroArgs'].length
       for(var k = 0; k < l; ++k) {
         if (input[i] === '~' + macroS[key]['macroArgs'][k]) {
           input[i] = actualInput[k + 1]
         }
       }
     }
     else {
       tildaVal(input[i], key, actualInput)
     }
    }
    return input
  }

  // object having predefined and user-defined keywords
  var store = {
    '+': function (a, b) {
      return a + b
    },
    '-': function (a, b) {
      return a - b
    },
    '*': function (a, b) {
      return a * b
    },
    '/': function (a, b) {
      return a / b
    },
    '>': function (a, b) {
      return a > b
    },
    '<': function (a, b) {
      return a < b
    },
    '>=': function (a, b) {
      return a >= b
    },
    '<=': function (a, b) {
      return a <= b
    },
    'equal?': function (a, b) {
      return (a === b)
    },
    'number?': function (a) {
      return !isNaN(a)
    },
    'sqr': function (a) {
      return a * a
    },
    'sqrt': function (a) {
      return Math.sqrt(a)
    }
  }

  // function for special statements like define
  // console.log(special(parse('(define A 5)', [])))
  function special (input) {
    if (input === undefined) { return undefined }
    var firstElem = input.shift()
    if (firstElem === 'define') {
      store[input.shift()] = evaluator(input)
    }
    else if (firstElem === 'set!') {
      store[input.shift()] = evaluator(input)
    }
    else if (firstElem === 'if') {
      var emp = []
      if (special(input.shift())) {
        emp.push(input.shift())
        return special(emp)
      }
      input.shift()
      emp.push(input.shift())
      return special(emp)
    }
    input.unshift(firstElem)
    return evaluator(input)
  }

  // evaluator function for evaluating expressions, variables and literals
  function evaluator (input) {
    var firstElem = input.shift()
    var argsArr = []
    var fn

    if (typeof Number(firstElem) === 'number' && Number(firstElem) === Number(firstElem)) {
      return Number(firstElem)
    }
    if (store[firstElem] !== undefined) {
      if (typeof store[firstElem] === 'number') {
        return store[firstElem]
      }
      fn = store[firstElem]
      var l = input.length
      for (var i = 0; i < l; ++i) {
        argsArr.push(evaluator(input))
      }
      if (argsArr.length === 1) {
        return fn(argsArr.pop())
      }
      return argsArr.reduce(fn)
    }
    if (firstElem[0] === 'lambda') {
      if (input.length === 0) {
        return firstElem
      }
      var ln = firstElem[1].length
      for (var k = 0; k < ln; ++k) {
        store[firstElem[1][k]] = Number(input[k])
      }
      if (typeof firstElem[2] === 'object') {
        return special(firstElem[2])
      }
      var arr = []
      arr.push(firstElem[2])
      return special(arr)
    }
    if (typeof firstElem === 'object') {
      return evaluator(firstElem)
    }
    if (firstElem === 'quote') {
      return input.shift()
    }
    if (firstElem === 'begin') {
      var len = input.length
      for (var j = 0; j < len; ++j) {
        if (j === len - 1) {
          return special(input.shift())
        }
        special(input.shift())
      }
    }
  }


var programParser = input => input
.trim()
.split('\n')
.map(exp => {
  let val = special(checkMacro(parse(exp, [])))
  return val === undefined ? 'undefined' : val
})

console.log(programParser(contents))
//console.log(store)
