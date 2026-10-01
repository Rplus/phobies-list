import { DOMParser } from 'linkedom';
import { API_URL, DATA_DIR, custom_fetch } from './u.mjs';

const url = new URL(API_URL);

url.search = new URLSearchParams({
	action: 'parse',
	page: 'Template:Cards/Mobile',
	prop: 'text',
	format: 'json'
});

const data = await custom_fetch({ url });
const html = data.parse?.text?.['*'];

if (!html) {
	throw new Error('Cards/Mobile HTML not found.');
}

const document = new DOMParser().parseFromString(html, 'text/html');

const links = [...document.querySelectorAll('a:has(img)')];

const phobies = links.map(link => {
	const img = link.querySelector('img');

	const src = (img.dataset.src || img.src)
		.replace(/\/revision.+$/, '')
		.replace('https://static.wikia.nocookie.net/phobies/images/', '');

	return {
		name: link.title,
		link: link.href.replace('/wiki/', ''),
		img: src
	};
});

await Bun.write(
	`${DATA_DIR}/list.json`,
	JSON.stringify(phobies, null, '\t') + '\n'
);

console.log(` ## Fetched ${phobies.length} Phobies.`);