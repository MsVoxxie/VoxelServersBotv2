export const apps = [
	{
		name: 'VSBotv2',
		script: './dist/vsb.js',
		watch: ['dist'],
		ignore_watch: ['node_modules', '.git', 'package-lock.json', 'package.json'],
	},
];
