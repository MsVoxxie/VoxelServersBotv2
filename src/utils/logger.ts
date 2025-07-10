import colors from 'colors';

function logInfo(context: string, message: string) {
	console.log(colors.cyan(`[${context}]`), message);
}

function logWarn(context: string, message: string) {
	console.log(colors.yellow(`[${context}]`), message);
}

function logError(context: string, err: unknown) {
	if (err instanceof Error) {
		console.log(colors.red(`[${context}]`), err.message, '\n', err.stack);
	} else {
		console.log(colors.red(`[${context}]`), err);
	}
}

function logSuccess(context: string, message: string) {
	console.log(colors.green(`[${context}]`), message);
}

export default {
	info: logInfo,
	warn: logWarn,
	error: logError,
	success: logSuccess,
};
