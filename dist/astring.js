(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.astring = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*! http://mths.be/repeat v0.2.0 by @mathias */
if (!String.prototype.repeat) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var repeat = function(count) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			// `ToInteger`
			var n = count ? Number(count) : 0;
			if (n != n) { // better `isNaN`
				n = 0;
			}
			// Account for out-of-bounds indices
			if (n < 0 || n == Infinity) {
				throw RangeError();
			}
			var result = '';
			while (n) {
				if (n % 2 == 1) {
					result += string;
				}
				if (n > 1) {
					string += string;
				}
				n >>= 1;
			}
			return result;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'repeat', {
				'value': repeat,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.repeat = repeat;
		}
	}());
}

},{}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.default = astring;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Astring is a tiny and fast JavaScript code generator from an ESTree-compliant AST.
//
// Astring was written by David Bonnet and released under an MIT license.
//
// The Git repository for Astring is available at:
// https://github.com/davidbonnet/astring.git
//
// Please use the GitHub bug tracker to report issues:
// https://github.com/davidbonnet/astring/issues

var stringify = JSON.stringify;


var OPERATORS_PRECEDENCE = {
	'||': 3,
	'&&': 4,
	'|': 5,
	'^': 6,
	'&': 7,
	'==': 8,
	'!=': 8,
	'===': 8,
	'!==': 8,
	'<': 9,
	'>': 9,
	'<=': 9,
	'>=': 9,
	'in': 9,
	'instanceof': 9,
	'<<': 10,
	'>>': 10,
	'>>>': 10,
	'+': 11,
	'-': 11,
	'*': 12,
	'%': 12,
	'/': 12,
	'**': 12
};

var EXPRESSIONS_PRECEDENCE = {
	// Definitions
	ArrayExpression: 20,
	TaggedTemplateExpression: 20,
	ThisExpression: 20,
	Identifier: 20,
	Literal: 18,
	TemplateLiteral: 20,
	Super: 20,
	SequenceExpression: 20,
	// Operations
	MemberExpression: 19,
	CallExpression: 19,
	NewExpression: 19,
	ArrowFunctionExpression: 18,
	// Other definitions
	// Value 17 enables parenthesis in an `ExpressionStatement` node
	ClassExpression: 17,
	FunctionExpression: 17,
	ObjectExpression: 17,
	// Other operations
	UpdateExpression: 16,
	UnaryExpression: 15,
	BinaryExpression: 14,
	LogicalExpression: 13,
	ConditionalExpression: 4,
	AssignmentExpression: 3,
	YieldExpression: 2,
	RestElement: 1
};

function formatSequence(nodes, state, traveler) {
	/*
 Formats a sequence of `nodes`.
 */
	var output = state.output;

	output.write('(');
	if (nodes != null && nodes.length > 0) {
		traveler[nodes[0].type](nodes[0], state);
		var length = nodes.length;

		for (var i = 1; i < length; i++) {
			var param = nodes[i];
			output.write(', ');
			traveler[param.type](param, state);
		}
	}
	output.write(')');
}

function formatBinaryExpressionPart(node, parentNode, isRightHand, state, traveler) {
	/*
 Formats into the `output` stream a left-hand or right-hand expression `node` from a binary expression applying the provided `operator`.
 The `isRightHand` parameter should be `true` if the `node` is a right-hand argument.
 */
	var nodePrecedence = EXPRESSIONS_PRECEDENCE[node.type];
	var parentNodePrecedence = EXPRESSIONS_PRECEDENCE[parentNode.type];
	if (nodePrecedence > parentNodePrecedence) {
		traveler[node.type](node, state);
		return;
	} else if (nodePrecedence === parentNodePrecedence) {
		if (nodePrecedence === 13 || nodePrecedence === 14) {
			// Either `LogicalExpression` or `BinaryExpression`
			if (isRightHand) {
				if (OPERATORS_PRECEDENCE[node.operator] > OPERATORS_PRECEDENCE[parentNode.operator]) {
					traveler[node.type](node, state);
					return;
				}
			} else {
				if (OPERATORS_PRECEDENCE[node.operator] >= OPERATORS_PRECEDENCE[parentNode.operator]) {
					traveler[node.type](node, state);
					return;
				}
			}
		} else {
			traveler[node.type](node, state);
			return;
		}
	}
	state.output.write('(');
	traveler[node.type](node, state);
	state.output.write(')');
}

function reindent(text, indentation) {
	/*
 Returns the `text` string reindented with the provided `indentation`.
 */
	text = text.trimRight();
	var indents = '\n';
	var secondLine = false;
	var _text = text;
	var length = _text.length;

	for (var i = 0; i < length; i++) {
		var char = text[i];
		if (secondLine) {
			if (char === ' ' || char === '\t') {
				indents += char;
			} else {
				return indentation + text.trimLeft().split(indents).join('\n' + indentation);
			}
		} else {
			if (char === '\n') {
				secondLine = true;
			}
		}
	}
	return indentation + text.trimLeft();
}

function formatComments(comments, output, indent, lineEnd) {
	/*
 Inserts into `output` the provided list of `comments`, with the given `indent` and `lineEnd` strings.
 Line comments will end with `"\n"` regardless of the value of `lineEnd`.
 Expects to start on a new unindented line.
 */
	var length = comments.length;

	for (var i = 0; i < length; i++) {
		var comment = comments[i];
		output.write(indent);
		if (comment.type[0] === 'L')
			// Line comment
			output.write('// ' + comment.value.trim() + '\n');else
			// Block comment
			output.write('/*' + lineEnd + reindent(comment.value, indent) + lineEnd + indent + '*/' + lineEnd);
	}
}

function hasCallExpression(node) {
	/*
 Returns `true` if the provided `node` contains a call expression and `false` otherwise.
 */
	while (node != null) {
		var _node = node;
		var type = _node.type;

		if (type[0] === 'C' && type[1] === 'a') {
			// Is CallExpression
			return true;
		} else if (type[0] === 'M' && type[1] === 'e' && type[2] === 'm') {
			// Is MemberExpression
			node = node.object;
		} else {
			return false;
		}
	}
}

var ForInStatement = void 0,
    FunctionDeclaration = void 0,
    RestElement = void 0,
    BinaryExpression = void 0,
    ArrayExpression = void 0,
    BlockStatement = void 0;

var defaultGenerator = exports.defaultGenerator = {
	Program: function Program(node, state) {
		var indent = state.indent.repeat(state.indentLevel);
		var lineEnd = state.lineEnd;
		var output = state.output;
		var writeComments = state.writeComments;

		if (writeComments && node.comments != null) formatComments(node.comments, output, indent, lineEnd);
		var statements = node.body;
		var length = statements.length;

		for (var i = 0; i < length; i++) {
			var statement = statements[i];
			if (writeComments && statement.comments != null) formatComments(statement.comments, output, indent, lineEnd);
			output.write(indent);
			this[statement.type](statement, state);
			output.write(lineEnd);
		}
		if (writeComments && node.trailingComments != null) formatComments(node.trailingComments, output, indent, lineEnd);
	},

	BlockStatement: BlockStatement = function BlockStatement(node, state) {
		var indent = state.indent.repeat(state.indentLevel++);
		var lineEnd = state.lineEnd;
		var output = state.output;
		var writeComments = state.writeComments;

		var statementIndent = indent + state.indent;
		output.write('{');
		var statements = node.body;
		if (statements != null && statements.length > 0) {
			output.write(lineEnd);
			if (writeComments && node.comments != null) {
				formatComments(node.comments, output, statementIndent, lineEnd);
			}
			var length = statements.length;

			for (var i = 0; i < length; i++) {
				var statement = statements[i];
				if (writeComments && statement.comments != null) formatComments(statement.comments, output, statementIndent, lineEnd);
				output.write(statementIndent);
				this[statement.type](statement, state);
				output.write(lineEnd);
			}
			output.write(indent);
		} else {
			if (writeComments && node.comments != null) {
				output.write(lineEnd);
				formatComments(node.comments, output, statementIndent, lineEnd);
				output.write(indent);
			}
		}
		if (writeComments && node.trailingComments != null) formatComments(node.trailingComments, output, statementIndent, lineEnd);
		output.write('}');
		state.indentLevel--;
	},
	ClassBody: BlockStatement,
	EmptyStatement: function EmptyStatement(node, state) {
		state.output.write(';');
	},
	ExpressionStatement: function ExpressionStatement(node, state) {
		var precedence = EXPRESSIONS_PRECEDENCE[node.expression.type];
		if (precedence === 17 || precedence === 3 && node.expression.left.type[0] === 'O') {
			// Should always have parentheses or is an AssignmentExpression to an ObjectPattern
			state.output.write('(');
			this[node.expression.type](node.expression, state);
			state.output.write(')');
		} else {
			this[node.expression.type](node.expression, state);
		}
		state.output.write(';');
	},
	IfStatement: function IfStatement(node, state) {
		var output = state.output;

		output.write('if (');
		this[node.test.type](node.test, state);
		output.write(') ');
		this[node.consequent.type](node.consequent, state);
		if (node.alternate != null) {
			output.write(' else ');
			this[node.alternate.type](node.alternate, state);
		}
	},
	LabeledStatement: function LabeledStatement(node, state) {
		this[node.label.type](node.label, state);
		state.output.write(': ');
		this[node.body.type](node.body, state);
	},
	BreakStatement: function BreakStatement(node, state) {
		var output = state.output;

		output.write('break');
		if (node.label) {
			output.write(' ');
			this[node.label.type](node.label, state);
		}
		output.write(';');
	},
	ContinueStatement: function ContinueStatement(node, state) {
		var output = state.output;

		output.write('continue');
		if (node.label) {
			output.write(' ');
			this[node.label.type](node.label, state);
		}
		output.write(';');
	},
	WithStatement: function WithStatement(node, state) {
		var output = state.output;

		output.write('with (');
		this[node.object.type](node.object, state);
		output.write(') ');
		this[node.body.type](node.body, state);
	},
	SwitchStatement: function SwitchStatement(node, state) {
		var indent = state.indent.repeat(state.indentLevel++);
		var lineEnd = state.lineEnd;
		var output = state.output;
		var writeComments = state.writeComments;

		state.indentLevel++;
		var caseIndent = indent + state.indent;
		var statementIndent = caseIndent + state.indent;
		output.write('switch (');
		this[node.discriminant.type](node.discriminant, state);
		output.write(') \{' + lineEnd);
		var occurences = node.cases;
		var occurencesCount = occurences.length;

		for (var i = 0; i < occurencesCount; i++) {
			var occurence = occurences[i];
			if (writeComments && occurence.comments != null) formatComments(occurence.comments, output, caseIndent, lineEnd);
			if (occurence.test) {
				output.write(caseIndent + 'case ');
				this[occurence.test.type](occurence.test, state);
				output.write(':' + lineEnd);
			} else {
				output.write(caseIndent + 'default:' + lineEnd);
			}
			var consequent = occurence.consequent;
			var consequentCount = consequent.length;

			for (var _i = 0; _i < consequentCount; _i++) {
				var statement = consequent[_i];
				if (writeComments && statement.comments != null) formatComments(statement.comments, output, statementIndent, lineEnd);
				output.write(statementIndent);
				this[statement.type](statement, state);
				output.write(lineEnd);
			}
		}
		state.indentLevel -= 2;
		output.write(indent + '}');
	},
	ReturnStatement: function ReturnStatement(node, state) {
		var output = state.output;

		output.write('return');
		if (node.argument) {
			output.write(' ');
			this[node.argument.type](node.argument, state);
		}
		output.write(';');
	},
	ThrowStatement: function ThrowStatement(node, state) {
		var output = state.output;

		output.write('throw ');
		this[node.argument.type](node.argument, state);
		output.write(';');
	},
	TryStatement: function TryStatement(node, state) {
		var output = state.output;

		output.write('try ');
		this[node.block.type](node.block, state);
		if (node.handler) {
			var handler = node.handler;

			output.write(' catch (');
			this[handler.param.type](handler.param, state);
			output.write(') ');
			this[handler.body.type](handler.body, state);
		}
		if (node.finalizer) {
			output.write(' finally ');
			this[node.finalizer.type](node.finalizer, state);
		}
	},
	WhileStatement: function WhileStatement(node, state) {
		var output = state.output;

		output.write('while (');
		this[node.test.type](node.test, state);
		output.write(') ');
		this[node.body.type](node.body, state);
	},
	DoWhileStatement: function DoWhileStatement(node, state) {
		var output = state.output;

		output.write('do ');
		this[node.body.type](node.body, state);
		output.write(' while (');
		this[node.test.type](node.test, state);
		output.write(');');
	},
	ForStatement: function ForStatement(node, state) {
		var output = state.output;

		output.write('for (');
		if (node.init != null) {
			var init = node.init;

			state.noTrailingSemicolon = true;
			this[node.init.type](node.init, state);
			state.noTrailingSemicolon = false;
		}
		output.write('; ');
		if (node.test) this[node.test.type](node.test, state);
		output.write('; ');
		if (node.update) this[node.update.type](node.update, state);
		output.write(') ');
		this[node.body.type](node.body, state);
	},

	ForInStatement: ForInStatement = function ForInStatement(node, state) {
		var output = state.output;

		output.write('for (');
		var left = node.left;var type = left.type;

		state.noTrailingSemicolon = true;
		this[type](left, state);
		state.noTrailingSemicolon = false;
		// Identifying whether node.type is `ForInStatement` or `ForOfStatement`
		output.write(node.type[3] === 'I' ? ' in ' : ' of ');
		this[node.right.type](node.right, state);
		output.write(') ');
		this[node.body.type](node.body, state);
	},
	ForOfStatement: ForInStatement,
	DebuggerStatement: function DebuggerStatement(node, state) {
		state.output.write('debugger;' + state.lineEnd);
	},

	FunctionDeclaration: FunctionDeclaration = function FunctionDeclaration(node, state) {
		var output = state.output;

		output.write(node.generator ? 'function* ' : 'function ');
		if (node.id) output.write(node.id.name);
		formatSequence(node.params, state, this);
		output.write(' ');
		this[node.body.type](node.body, state);
	},
	FunctionExpression: FunctionDeclaration,
	VariableDeclaration: function VariableDeclaration(node, state) {
		var output = state.output;
		var declarations = node.declarations;

		output.write(node.kind + ' ');
		var length = declarations.length;

		if (length > 0) {
			this.VariableDeclarator(declarations[0], state);
			for (var i = 1; i < length; i++) {
				output.write(', ');
				this.VariableDeclarator(declarations[i], state);
			}
		}
		if (state.noTrailingSemicolon !== true) output.write(';');
	},
	VariableDeclarator: function VariableDeclarator(node, state) {
		this[node.id.type](node.id, state);
		if (node.init != null) {
			state.output.write(' = ');
			this[node.init.type](node.init, state);
		}
	},
	ClassDeclaration: function ClassDeclaration(node, state) {
		var output = state.output;

		output.write('class ');
		if (node.id) {
			output.write(node.id.name + ' ');
		}
		if (node.superClass) {
			output.write('extends ');
			this[node.superClass.type](node.superClass, state);
			output.write(' ');
		}
		this[node.body.type](node.body, state);
	},
	ImportDeclaration: function ImportDeclaration(node, state) {
		var output = state.output;

		output.write('import ');
		var specifiers = node.specifiers;
		var length = specifiers.length;

		if (length > 0) {
			var i = 0,
			    specifier = void 0;
			while (i < length) {
				if (i > 0) output.write(', ');
				specifier = specifiers[i];
				var type = specifier.type[6];
				if (type === 'D') {
					// ImportDefaultSpecifier
					output.write(specifier.local.name);
					i++;
				} else if (type === 'N') {
					// ImportNamespaceSpecifier
					output.write('* as ' + specifier.local.name);
					i++;
				} else {
					// ImportSpecifier
					break;
				}
			}
			if (i < length) {
				output.write('{');
				for (;;) {
					specifier = specifiers[i];
					var name = specifier.imported.name;

					output.write(name);
					if (name !== specifier.local.name) {
						output.write(' as ' + specifier.local.name);
					}
					if (++i < length) output.write(', ');else break;
				}
				output.write('}');
			}
			output.write(' from ');
		}
		this.Literal(node.source, state);
		output.write(';');
	},
	ExportDefaultDeclaration: function ExportDefaultDeclaration(node, state) {
		var output = state.output;

		output.write('export default ');
		this[node.declaration.type](node.declaration, state);
		if (EXPRESSIONS_PRECEDENCE[node.declaration.type] && node.declaration.type[0] !== 'F')
			// All expression nodes except `FunctionExpression`
			output.write(';');
	},
	ExportNamedDeclaration: function ExportNamedDeclaration(node, state) {
		var output = state.output;

		output.write('export ');
		if (node.declaration) {
			this[node.declaration.type](node.declaration, state);
		} else {
			output.write('{');
			var specifiers = node.specifiers;var length = specifiers.length;

			if (length > 0) {
				for (var i = 0;;) {
					var specifier = specifiers[i];
					var name = specifier.local.name;

					output.write(name);
					if (name !== specifier.exported.name) output.write(' as ' + specifier.exported.name);
					if (++i < length) output.write(', ');else break;
				}
			}
			output.write('}');
			if (node.source) {
				output.write(' from ');
				this.Literal(node.source, state);
			}
			output.write(';');
		}
	},
	ExportAllDeclaration: function ExportAllDeclaration(node, state) {
		var output = state.output;

		output.write('export * from ');
		this.Literal(node.source, state);
		output.write(';');
	},
	ExportDeclaration: function ExportDeclaration(node, state) {
		var output = state.output;

		output.write('export ');
		if (node.default) output.write('default ');
		if (node.declaration) {
			this[node.declaration.type](node.declaration, state);
		} else {
			if (!node.default) output.write('{');
			var specifiers = node.specifiers;var length = specifiers.length;

			if (length > 0) {
				for (var i = 0;;) {
					var specifier = specifiers[i];
					if (specifier.type === 'ExportBatchSpecifier') output.write('*');else {
						var name = specifier.id.name;

						output.write(name);
						if (name !== specifier.name.name) output.write(' as ' + specifier.name.name);
					}
					if (++i < length) output.write(', ');else break;
				}
			}
			if (!node.default) output.write('}');
			if (node.source) {
				output.write(' from ');
				this.Literal(node.source, state);
			}
			output.write(';');
		}
	},
	MethodDefinition: function MethodDefinition(node, state) {
		var output = state.output;

		if (node.static) output.write('static ');
		switch (node.kind[0]) {
			case 'g': // `get`
			case 's':
				// `set`
				output.write(node.kind + ' ');
				break;
			default:
				break;
		}
		if (node.value.generator) output.write('*');
		if (node.computed) {
			output.write('[');
			this[node.key.type](node.key, state);
			output.write(']');
		} else {
			this[node.key.type](node.key, state);
		}
		formatSequence(node.value.params, state, this);
		output.write(' ');
		this[node.value.body.type](node.value.body, state);
	},
	ClassExpression: function ClassExpression(node, state) {
		this.ClassDeclaration(node, state);
	},
	ArrowFunctionExpression: function ArrowFunctionExpression(node, state) {
		var output = state.output;
		var params = node.params;

		if (params != null) {
			if (params.length === 1 && params[0].type[0] === 'I') {
				// If params[0].type[0] starts with 'I', it can't be `ImportDeclaration` nor `IfStatement` and thus is `Identifier`
				output.write(params[0].name);
			} else {
				formatSequence(node.params, state, this);
			}
		}
		output.write(' => ');
		if (node.body.type[0] === 'O') {
			output.write('(');
			this.ObjectExpression(node.body, state);
			output.write(')');
		} else {
			this[node.body.type](node.body, state);
		}
	},
	ThisExpression: function ThisExpression(node, state) {
		state.output.write('this');
	},
	Super: function Super(node, state) {
		state.output.write('super');
	},

	RestElement: RestElement = function RestElement(node, state) {
		state.output.write('...');
		this[node.argument.type](node.argument, state);
	},
	SpreadElement: RestElement,
	YieldExpression: function YieldExpression(node, state) {
		var output = state.output;

		output.write(node.delegate ? 'yield*' : 'yield');
		if (node.argument) {
			output.write(' ');
			this[node.argument.type](node.argument, state);
		}
	},
	TemplateLiteral: function TemplateLiteral(node, state) {
		var output = state.output;
		var quasis = node.quasis;
		var expressions = node.expressions;

		output.write('`');
		var length = expressions.length;

		for (var i = 0; i < length; i++) {
			var expression = expressions[i];
			output.write(quasis[i].value.raw);
			output.write('${');
			this[expression.type](expression, state);
			output.write('}');
		}
		output.write(quasis[quasis.length - 1].value.raw);
		output.write('`');
	},
	TaggedTemplateExpression: function TaggedTemplateExpression(node, state) {
		this[node.tag.type](node.tag, state);
		this[node.quasi.type](node.quasi, state);
	},

	ArrayExpression: ArrayExpression = function ArrayExpression(node, state) {
		var output = state.output;

		output.write('[');
		if (node.elements.length > 0) {
			var elements = node.elements;var length = elements.length;

			for (var i = 0;;) {
				var element = elements[i];
				if (element != null) this[element.type](element, state);
				if (++i < length) {
					output.write(', ');
				} else {
					if (element == null) output.write(', ');
					break;
				}
			}
		}
		output.write(']');
	},
	ArrayPattern: ArrayExpression,
	ObjectExpression: function ObjectExpression(node, state) {
		var indent = state.indent.repeat(state.indentLevel++);
		var lineEnd = state.lineEnd;
		var output = state.output;
		var writeComments = state.writeComments;

		var propertyIndent = indent + state.indent;
		output.write('{');
		if (node.properties.length > 0) {
			output.write(lineEnd);
			if (writeComments && node.comments != null) formatComments(node.comments, output, propertyIndent, lineEnd);
			var comma = ',' + lineEnd;var properties = node.properties;var length = properties.length;

			for (var i = 0;;) {
				var property = properties[i];
				if (writeComments && property.comments != null) formatComments(property.comments, output, propertyIndent, lineEnd);
				output.write(propertyIndent);
				this.Property(property, state);
				if (++i < length) output.write(comma);else break;
			}
			output.write(lineEnd);
			if (writeComments && node.trailingComments != null) formatComments(node.trailingComments, output, propertyIndent, lineEnd);
			output.write(indent + '}');
		} else if (writeComments) {
			if (node.comments != null) {
				output.write(lineEnd);
				formatComments(node.comments, output, propertyIndent, lineEnd);
				if (node.trailingComments != null) formatComments(node.trailingComments, output, propertyIndent, lineEnd);
				output.write(indent + '}');
			} else if (node.trailingComments != null) {
				output.write(lineEnd);
				formatComments(node.trailingComments, output, propertyIndent, lineEnd);
				output.write(indent + '}');
			} else {
				output.write('}');
			}
		} else {
			output.write('}');
		}
		state.indentLevel--;
	},
	Property: function Property(node, state) {
		if (node.method || node.kind[0] !== 'i') {
			// Either a method or of kind `set` or `get` (not `init`)
			this.MethodDefinition(node, state);
		} else {
			var output = state.output;

			if (!node.shorthand) {
				if (node.computed) {
					output.write('[');
					this[node.key.type](node.key, state);
					output.write(']');
				} else {
					this[node.key.type](node.key, state);
				}
				output.write(': ');
			}
			this[node.value.type](node.value, state);
		}
	},
	PropertyPattern: function PropertyPattern(node, state) {
		var output = state.output;

		if (!node.shorthand) {
			if (node.computed) {
				output.write('[');
				this[node.key.type](node.key, state);
				output.write(']');
			} else {
				this[node.key.type](node.key, state);
			}
			output.write(': ');
		}
		this[node.pattern.type](node.pattern, state);
	},
	ObjectPattern: function ObjectPattern(node, state) {
		var output = state.output;

		output.write('{');
		if (node.properties.length > 0) {
			var properties = node.properties;var length = properties.length;

			for (var i = 0;;) {
				this[properties[i].type](properties[i], state);
				if (++i < length) output.write(', ');else break;
			}
		}
		output.write('}');
	},
	SequenceExpression: function SequenceExpression(node, state) {
		formatSequence(node.expressions, state, this);
	},
	UnaryExpression: function UnaryExpression(node, state) {
		var output = state.output;

		if (node.prefix) {
			output.write(node.operator);
			if (node.operator.length > 1) state.output.write(' ');
			if (EXPRESSIONS_PRECEDENCE[node.argument.type] < EXPRESSIONS_PRECEDENCE.UnaryExpression) {
				output.write('(');
				this[node.argument.type](node.argument, state);
				output.write(')');
			} else {
				this[node.argument.type](node.argument, state);
			}
		} else {
			// FIXME: This case never occurs
			this[node.argument.type](node.argument, state);
			state.output.write(node.operator);
		}
	},
	UpdateExpression: function UpdateExpression(node, state) {
		// Always applied to identifiers or members, no parenthesis check needed
		if (node.prefix) {
			state.output.write(node.operator);
			this[node.argument.type](node.argument, state);
		} else {
			this[node.argument.type](node.argument, state);
			state.output.write(node.operator);
		}
	},
	AssignmentExpression: function AssignmentExpression(node, state) {
		this[node.left.type](node.left, state);
		state.output.write(' ' + node.operator + ' ');
		this[node.right.type](node.right, state);
	},
	AssignmentPattern: function AssignmentPattern(node, state) {
		this[node.left.type](node.left, state);
		state.output.write(' = ');
		this[node.right.type](node.right, state);
	},

	BinaryExpression: BinaryExpression = function BinaryExpression(node, state) {
		var output = state.output;

		if (node.operator === 'in') {
			// Avoids confusion in `for` loops initializers
			output.write('(');
			formatBinaryExpressionPart(node.left, node, false, state, this);
			output.write(' ' + node.operator + ' ');
			formatBinaryExpressionPart(node.right, node, true, state, this);
			output.write(')');
		} else {
			formatBinaryExpressionPart(node.left, node, false, state, this);
			output.write(' ' + node.operator + ' ');
			formatBinaryExpressionPart(node.right, node, true, state, this);
		}
	},
	LogicalExpression: BinaryExpression,
	ConditionalExpression: function ConditionalExpression(node, state) {
		var output = state.output;

		if (EXPRESSIONS_PRECEDENCE[node.test.type] > EXPRESSIONS_PRECEDENCE.ConditionalExpression) {
			this[node.test.type](node.test, state);
		} else {
			output.write('(');
			this[node.test.type](node.test, state);
			output.write(')');
		}
		output.write(' ? ');
		this[node.consequent.type](node.consequent, state);
		output.write(' : ');
		this[node.alternate.type](node.alternate, state);
	},
	NewExpression: function NewExpression(node, state) {
		state.output.write('new ');
		var output = state.output;

		if (EXPRESSIONS_PRECEDENCE[node.callee.type] < EXPRESSIONS_PRECEDENCE.CallExpression || hasCallExpression(node.callee)) {
			output.write('(');
			this[node.callee.type](node.callee, state);
			output.write(')');
		} else {
			this[node.callee.type](node.callee, state);
		}
		formatSequence(node['arguments'], state, this);
	},
	CallExpression: function CallExpression(node, state) {
		var output = state.output;

		if (EXPRESSIONS_PRECEDENCE[node.callee.type] < EXPRESSIONS_PRECEDENCE.CallExpression) {
			output.write('(');
			this[node.callee.type](node.callee, state);
			output.write(')');
		} else {
			this[node.callee.type](node.callee, state);
		}
		formatSequence(node['arguments'], state, this);
	},
	MemberExpression: function MemberExpression(node, state) {
		var output = state.output;

		if (EXPRESSIONS_PRECEDENCE[node.object.type] < EXPRESSIONS_PRECEDENCE.MemberExpression) {
			output.write('(');
			this[node.object.type](node.object, state);
			output.write(')');
		} else {
			this[node.object.type](node.object, state);
		}
		if (node.computed) {
			output.write('[');
			this[node.property.type](node.property, state);
			output.write(']');
		} else {
			output.write('.');
			this[node.property.type](node.property, state);
		}
	},
	MetaProperty: function MetaProperty(node, state) {
		state.output.write(node.meta.name + '.' + node.property.name);
	},
	Identifier: function Identifier(node, state) {
		state.output.write(node.name);
	},
	Literal: function Literal(node, state) {
		if (node.raw != null) {
			state.output.write(node.raw);
		} else if (node.regex != null) {
			this.RegExpLiteral(node, state);
		} else {
			state.output.write(stringify(node.value));
		}
	},
	RegExpLiteral: function RegExpLiteral(node, state) {
		var regex = node.regex;

		state.output.write('new RegExp(' + stringify(regex.pattern) + ', ' + stringify(regex.flags) + ')');
	}
};

var Stream = function () {
	function Stream() {
		_classCallCheck(this, Stream);

		this.data = '';
	}

	Stream.prototype.write = function write(string) {
		this.data += string;
	};

	Stream.prototype.toString = function toString() {
		return this.data;
	};

	return Stream;
}();

function astring(node, options) {
	/*
 Returns a string representing the rendered code of the provided AST `node`.
 The `options` are:
 
 - `indent`: string to use for indentation (defaults to `\t`)
 - `lineEnd`: string to use for line endings (defaults to `\n`)
 - `startingIndentLevel`: indent level to start from (default to `0`)
 - `comments`: generate comments if `true` (defaults to `false`)
 - `output`: output stream to write the rendered code to (defaults to `null`)
 - `generator`: custom code generator (defaults to `defaultGenerator`)
 */
	var state = options == null ? {
		output: new Stream(),
		generator: defaultGenerator,
		indent: '\t',
		lineEnd: '\n',
		indentLevel: 0,
		writeComments: false,
		noTrailingSemicolon: false
	} : {
		// Functional options
		output: options.output ? options.output : new Stream(),
		generator: options.generator ? options.generator : defaultGenerator,
		// Formating options
		indent: options.indent != null ? options.indent : '\t',
		lineEnd: options.lineEnd != null ? options.lineEnd : '\n',
		indentLevel: options.startingIndentLevel != null ? options.startingIndentLevel : 0,
		writeComments: options.comments ? options.comments : false,
		// Internal state
		noTrailingSemicolon: false
	};
	// Travel through the AST node and generate the code
	state.generator[node.type](node, state);
	var output = state.output;

	return output.data != null ? output.data : output;
}

},{}],3:[function(require,module,exports){
'use strict';

require('string.prototype.repeat');
var astring = require('./astring');
astring.default.defaultGenerator = astring.defaultGenerator;
module.exports = astring.default;

},{"./astring":2,"string.prototype.repeat":1}]},{},[3])(3)
});