import { readFile, writeFile } from 'node:fs/promises';

const data_dir = process.env.DATA_DIR;
const api_url = 'https://phobies.fandom.com/api.php';

const phobies = JSON.parse(
	await readFile(`${data_dir}/details.json`, 'utf8')
);

const icon_names = new Set();

for (const phobie of phobies) {
	for (const ability of phobie.abilities ?? []) {
		const icon_name = ability.icon_title;

		if (icon_name) {
			icon_names.add(icon_name);
		}
	}
}

const icons = [...icon_names];
const skill_icons = {};

for (let i = 0; i < icons.length; i += 50) {
	const batch = icons.slice(i, i + 50);

	console.log(
		`Fetching icons ${i + 1}-${i + batch.length} / ${icons.length}...`
	);

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

	for (const icon_name of batch) {
	const page = data.query?.pages?.find(
		page => page.title === `File:${icon_name.replace(/_/g, ' ')}.png`
	);

	const image_url = page?.imageinfo?.[0]?.url;

	if (image_url) {
		skill_icons[icon_name] = image_url;
	} else {
		console.log(`Icon not found: ${icon_name}`);
	}
}
}

for (const phobie of phobies) {
	delete phobie.wikitext;

	for (const ability of phobie.abilities ?? []) {
		const icon_name = ability.icon_title;

		if (!icon_name) {
			continue;
		}

		const icon_url = skill_icons[icon_name];

		if (icon_url) {
			ability.icon_url = icon_url
				.replace('https://static.wikia.nocookie.net/phobies/images/', '')
				.replace(/\/revision.+$/, '');
		} else {
			console.error(123, icon_name);
		}
	}
}

await writeFile(
	`${data_dir}/data_with_icon.json`,
	JSON.stringify(phobies, null, '\t') + '\n'
);
await writeFile(
	`${data_dir}/icons.json`,
	JSON.stringify(skill_icons, null, '\t') + '\n'
);

console.log(`Found ${icons.length} unique ability icons.`);
console.log(`Fetched ${Object.keys(skill_icons).length} ability icons.`);