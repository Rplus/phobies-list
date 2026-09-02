import { writeFile } from 'node:fs/promises';
import { DOMParser } from 'linkedom';

const data_dir = process.env.DATA_DIR;
const api_url = 'https://phobies.fandom.com/api.php';

const url = new URL(api_url);

url.search = new URLSearchParams({
	action: 'parse',
	page: 'Template:Cards/Mobile',
	prop: 'text',
	format: 'json'
});

const response = await fetch(url);

if (!response.ok) {
	throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const data = await response.json();
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
		link: link.href,
		img: src
	};
});

await writeFile(
	`${data_dir}/list.json`,
	JSON.stringify(phobies, null, '\t') + '\n'
);

console.log(`Fetched ${phobies.length} Phobies.`);