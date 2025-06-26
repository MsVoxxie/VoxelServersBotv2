// Console colors
import colors from 'colors';

// [INFO] console out
const info = function (message: string) {
	console.log(colors.cyan('[INFO]'), message);
};

// [WARN] console out
const warn = function (message: string) {
	console.log(colors.yellow('[WARN]'), message);
};
// [ERROR] console out
const error = function (message: string) {
	console.log(colors.red('[ERROR]'), message);
};

// [SUCCESS] console out
const success = function (message: string) {
	console.log(colors.green('[SUCCESS]'), message);
};

// [CAPI] console out
const capi = function (message: string) {
	console.log(colors.rainbow('[CAPI]'), message);
};

// Module exports
export default {
	info,
	warn,
	error,
	success,
	capi,
};
