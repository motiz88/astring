function nativeRepeat( s, count ) {
	return String.prototype.repeat.call( s, count )
}

const libraryRepeat = require( 'repeat-string' )

module.exports.repeat = String.prototype.repeat ? nativeRepeat : libraryRepeat