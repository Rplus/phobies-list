import { writeFile } from 'node:fs/promises';
import { DOMParser } from 'linkedom';

const data_dir = process.env.DATA_DIR;
const api_url = 'https://phobies.fandom.com/api.php';

function parse_template(wikitext, template_name) {
	const start = wikitext.search(
		new RegExp(`\\{\\{${template_name}\\b`, 'i')
	);

	if (start === -1) {
		return null;
	}

	let depth = 0;
	let end = -1;

	for (let i = start; i < wikitext.length - 1; i++) {
		const token = wikitext.slice(i, i + 2);

		if (token === '{{') {
			depth++;
			i++;
		} else if (token === '}}') {
			depth--;

			if (depth === 0) {
				end = i;
				break;
			}

			i++;
		}
	}

	if (end === -1) {
		return null;
	}

	const template = wikitext.slice(start + 2, end);
	const properties = {};

	for (const line of template.split('\n')) {
		const property = line.match(/^\s*\|\s*([^=]+?)\s*=\s*(.*?)\s*$/);

		if (!property) {
			continue;
		}

		const [, key, value] = property;

		properties[key.trim()] = value.trim();
	}

	return properties;
}

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
		img: src,
	};
});

for (let i = 0; i < phobies.length; i += 50) {
	const batch = phobies.slice(i, i + 50);

	const url = new URL(api_url);

	url.search = new URLSearchParams({
		action: 'query',
		prop: 'revisions',
		titles: batch.map(phobie => phobie.name).join('|'),
		rvslots: 'main',
		rvprop: 'content',
		formatversion: '2',
		format: 'json'
	});

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();

	for (const page of data.query.pages) {
		const phobie = phobies.find(
			item => item.name === page.title
		);

		if (!phobie) {
			continue;
		}

		const wikitext =
			page.revisions?.[0]?.slots?.main?.content ?? '';

		phobie.origin_data = {
			pageid: page.pageid,
			wikitext
		};

		const skill = parse_template(
			wikitext,
			'SpecialAbility'
		);

		if (skill) {
			phobie.origin_data.skill = skill;
		}
	}
}

const icons_name = new Set();

for (const phobie of phobies) {
	const icon_name = phobie.origin_data?.skill?.['icon-title'];

	if (icon_name) {
		icons_name.add(icon_name);
	}
}

const skill_icons = {};
const icons = [...icons_name];

for (let i = 0; i < icons.length; i += 50) {
	const batch = icons.slice(i, i + 50);

	const file_titles = batch.map(
		icon_name => `File:${icon_name}.png`
	);

	const url = new URL(api_url);

	url.search = new URLSearchParams({
		action: 'query',
		titles: file_titles.join('|'),
		prop: 'imageinfo',
		iiprop: 'url',
		formatversion: '2',
		format: 'json'
	});

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();

	await writeFile(
		`${data_dir}/phobies_icons_res_${i}.json`,
		JSON.stringify(data, null, '\t') + '\n'
	);

	for (const icon_name of batch) {
		const page = data.query?.pages?.find(
			page => page.title === `File:${icon_name}.png`
		);

		const image_url = page?.imageinfo?.[0]?.url;

		if (image_url) {
			skill_icons[icon_name] = image_url;
		}
	}
}


await writeFile(
	`${data_dir}/phobies_icons.json`,
	JSON.stringify(skill_icons, null, '\t') + '\n'
);

for (const phobie of phobies) {
	const icon_name = phobie.origin_data?.skill?.['icon-title'];

	if (!icon_name) {
		continue;
	}

	const icon_url = skill_icons[icon_name];

	if (icon_url) {
		phobie.origin_data.skill_icon = icon_url;
	}
}

await writeFile(
	`${data_dir}/phobies.json`,
	JSON.stringify(phobies, null, '\t') + '\n'
);

console.log(`Fetched ${phobies.length} Phobies.`);
console.log(`Found ${icons_name.size} skill icons.`);
console.log(`Fetched ${Object.keys(skill_icons).length} skill icons.`);