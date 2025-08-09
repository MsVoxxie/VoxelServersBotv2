export async function getImageSource(DisplayImageSource: string): Promise<string> {
	if (!DisplayImageSource) throw new Error('No DisplayImageSource provided');
	const [type, ...rest] = DisplayImageSource.split(':');
	const game = rest.join(':');
	let source: string;
	switch (type) {
		case 'internal':
			source = `${process.env.AMP_URI}/Plugins/ADSModule/Images/${game}.jpg`;
			break;
		case 'steam':
			source = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game}/header.jpg`;
			break;
		case 'url':
			source = game;
			break;
		default:
			throw new Error('Invalid type provided');
	}
	return source;
}
