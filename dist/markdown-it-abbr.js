;(function (f) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = f()
  } else if (typeof define === 'function' && define.amd) {
    define([], f)
  } else {
    var g
    if (typeof window !== 'undefined') {
      g = window
    } else if (typeof global !== 'undefined') {
      g = global
    } else if (typeof self !== 'undefined') {
      g = self
    } else {
      g = this
    }
    g.markdownitAbbr = f()
  }
})(function () {
  var define, module, exports
  return (function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = 'function' == typeof require && require
            if (!f && c) return c(i, !0)
            if (u) return u(i, !0)
            var a = new Error("Cannot find module '" + i + "'")
            throw ((a.code = 'MODULE_NOT_FOUND'), a)
          }
          var p = (n[i] = { exports: {} })
          e[i][0].call(
            p.exports,
            function (r) {
              var n = e[i][1][r]
              return o(n || r)
            },
            p,
            p.exports,
            r,
            e,
            n,
            t
          )
        }
        return n[i].exports
      }
      for (
        var u = 'function' == typeof require && require, i = 0;
        i < t.length;
        i++
      )
        o(t[i])
      return o
    }
    return r
  })()(
    {
      1: [
        function (require, module, exports) {
          'use strict'
          module.exports = function sub_plugin(md) {
            var escapeRE = md.utils.escapeRE,
              arrayReplaceAt = md.utils.arrayReplaceAt
            var OTHER_CHARS = ' \r\n$+<=>^`|~'
            var UNICODE_PUNCT_RE = md.utils.lib.ucmicro.P.source
            var UNICODE_SPACE_RE = md.utils.lib.ucmicro.Z.source
            function abbr_def(state, startLine, endLine, silent) {
              var label,
                title,
                ch,
                labelStart,
                labelEnd,
                pos = state.bMarks[startLine] + state.tShift[startLine],
                max = state.eMarks[startLine]
              if (pos + 2 >= max) {
                return false
              }
              if (state.src.charCodeAt(pos++) !== 42) {
                return false
              }
              if (state.src.charCodeAt(pos++) !== 91) {
                return false
              }
              labelStart = pos
              for (; pos < max; pos++) {
                ch = state.src.charCodeAt(pos)
                if (ch === 91) {
                  return false
                } else if (ch === 93) {
                  labelEnd = pos
                  break
                } else if (ch === 92) {
                  pos++
                }
              }
              if (labelEnd < 0 || state.src.charCodeAt(labelEnd + 1) !== 58) {
                return false
              }
              if (silent) {
                return true
              }
              label = state.src
                .slice(labelStart, labelEnd)
                .replace(/\\(.)/g, '$1')
              title = state.src.slice(labelEnd + 2, max).trim()
              if (label.length === 0) {
                return false
              }
              if (title.length === 0) {
                return false
              }
              if (!state.env.abbreviations) {
                state.env.abbreviations = {}
              }
              if (typeof state.env.abbreviations[':' + label] === 'undefined') {
                state.env.abbreviations[':' + label] = title
              }
              state.line = startLine + 1
              return true
            }
            function abbr_replace(state) {
              var i,
                j,
                l,
                tokens,
                token,
                text,
                nodes,
                pos,
                reg,
                m,
                regText,
                regSimple,
                currentToken,
                blockTokens = state.tokens
              if (!state.env.abbreviations) {
                return
              }
              regSimple = new RegExp(
                '(?:' +
                  Object.keys(state.env.abbreviations)
                    .map(function (x) {
                      return x.substr(1)
                    })
                    .sort(function (a, b) {
                      return b.length - a.length
                    })
                    .map(escapeRE)
                    .join('|') +
                  ')'
              )
              regText =
                '(^|' +
                UNICODE_PUNCT_RE +
                '|' +
                UNICODE_SPACE_RE +
                '|[' +
                OTHER_CHARS.split('').map(escapeRE).join('') +
                '])' +
                '(' +
                Object.keys(state.env.abbreviations)
                  .map(function (x) {
                    return x.substr(1)
                  })
                  .sort(function (a, b) {
                    return b.length - a.length
                  })
                  .map(escapeRE)
                  .join('|') +
                ')' +
                '($|' +
                UNICODE_PUNCT_RE +
                '|' +
                UNICODE_SPACE_RE +
                '|[' +
                OTHER_CHARS.split('').map(escapeRE).join('') +
                '])'
              reg = new RegExp(regText, 'g')
              for (j = 0, l = blockTokens.length; j < l; j++) {
                if (blockTokens[j].type !== 'inline') {
                  continue
                }
                tokens = blockTokens[j].children
                for (i = tokens.length - 1; i >= 0; i--) {
                  currentToken = tokens[i]
                  if (currentToken.type !== 'text') {
                    continue
                  }
                  pos = 0
                  text = currentToken.content
                  reg.lastIndex = 0
                  nodes = []
                  if (!regSimple.test(text)) {
                    continue
                  }
                  while ((m = reg.exec(text))) {
                    if (m.index > 0 || m[1].length > 0) {
                      token = new state.Token('text', '', 0)
                      token.content = text.slice(pos, m.index + m[1].length)
                      nodes.push(token)
                    }
                    token = new state.Token('link_open', 'a', 1)
                    token.attrs = [['href', '#' + m[2]]]
                    nodes.push(token)
                    token = new state.Token('abbr_open', 'abbr', 1)
                    token.attrs = [
                      ['title', state.env.abbreviations[':' + m[2]]],
                    ]
                    nodes.push(token)
                    token = new state.Token('text', '', 0)
                    token.content = m[2]
                    nodes.push(token)
                    token = new state.Token('abbr_close', 'abbr', -1)
                    nodes.push(token)
                    token = new state.Token('link_close', 'a', -1)
                    nodes.push(token)
                    reg.lastIndex -= m[3].length
                    pos = reg.lastIndex
                  }
                  if (!nodes.length) {
                    continue
                  }
                  if (pos < text.length) {
                    token = new state.Token('text', '', 0)
                    token.content = text.slice(pos)
                    nodes.push(token)
                  }
                  blockTokens[j].children = tokens = arrayReplaceAt(
                    tokens,
                    i,
                    nodes
                  )
                }
              }
            }
            md.block.ruler.before('reference', 'abbr_def', abbr_def, {
              alt: ['paragraph', 'reference'],
            })
            md.core.ruler.after('linkify', 'abbr_replace', abbr_replace)
          }
        },
        {},
      ],
    },
    {},
    [1]
  )(1)
})
