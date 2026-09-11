import { API_URL, DATA_DIR, custom_fetch } from './u.mjs';

const phobies = await Bun.file(`${DATA_DIR}/details.json`).json();
const images = await Bun.file(`${DATA_DIR}/allimages_lookup.json`).json();

for (const phobie of phobies) {
	delete phobie.wikitext;
	if (phobie.file) {
		const title = phobie.file === 'front' ? phobie.name + ' front' : phobie.file;
		const fn = `${title}`.toLowerCase().replaceAll(' ', '_');
		const img = images[fn];
		if (img) {
			phobie.file = fn_shorten_url(img.url);
		} else {
			console.error(404, phobie.name, phobie.file);
		}
	}

	for (const ability of phobie.abilities ?? []) {
		const icon_name = ability['icon-title'];

		if (icon_name) {
			const fn = `${icon_name}`.toLowerCase().replaceAll(' ', '_');
			const img = images[fn];
			if (img) {
				ability['icon-title'] = fn_shorten_url(img.url);
			} else {
				console.error(406, ability.title, ability.icon_title);
			}
		}
	}
}

function fn_shorten_url(url = '') {
	return url
		.replace('https://static.wikia.nocookie.net/phobies/images/', '')
		.replace(/\/revision.+$/, '');
}

await Bun.write(
	`${DATA_DIR}/data_with_icon.json`,
	JSON.stringify(phobies, null, '\t') + '\n'
);

{ // genarate js directly
	const outputJsPath = `./data_with_icon.js`;
	const jsContent = `const heros = ${JSON.stringify(phobies, null, 0)};\n` + `const parsing_time = new Date().toISOString();`;
	await Bun.write(outputJsPath, jsContent);
	console.log(` ## 成功生成 JS 檔案：${outputJsPath}`);
}
