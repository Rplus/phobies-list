import { readFile, writeFile } from 'node:fs/promises';

const data_dir = process.env.DATA_DIR;
const api_url = 'https://phobies.fandom.com/api.php';

function parse_templates(wikitext, template_names) {
	const templates = [];

	for (const template_name of template_names) {
		let search_position = 0;

		while (true) {
			const match = wikitext.slice(search_position).match(
				new RegExp(`\\{\\{${template_name}\\b`, 'i')
			);

			if (!match) {
				break;
			}

			const start = search_position + match.index;

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
				break;
			}

			const template = wikitext.slice(start + 2, end);
			const properties = {};

			for (const line of template.split('\n')) {
				// const property = line.match(/^\s*\|\s*([^=]+?)\s*=\s*(.*?)\s*$/);
				const property = line.match(/(?:^|\|)\s*([^|+=]+?)\s*=\s*([^|]*)/);


				if (!property) {
					continue;
				}

				const [, key, value] = property;

				const normalized_key = key
					.trim()
					.replace(/[\s-]+/g, '_');

				const normalized_value = normalize_property_value(
					normalized_key,
					value.trim()
				);

				properties[normalized_key] = normalized_value;
			}

			templates.push({
				template_name,
				properties
			});

			search_position = end + 2;
		}
	}

	return templates;
}

function normalize_property_value(key, value) {
	const replacements = {
		attack_type: {
			'line of sight': 'Line of Sight',
		},
		damage_range: {
			'single targeted attack': 'Single Target Attack',
			'single target attack': 'Single Target Attack',
		}
	};

	const rule = replacements[key];

	if (!rule) {
		return value;
	}

	return rule[value.toLowerCase()] ?? value;
}

const phobies = JSON.parse(
	await readFile(`${data_dir}/list.json`, 'utf8')
);

for (let i = 0; i < phobies.length; i += 50) {
	const batch = phobies.slice(i, i + 50);

	console.log(
		`Fetching details ${i + 1}-${i + batch.length} / ${phobies.length}...`
	);

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

	for (const page of data.query?.pages ?? []) {
		const phobie = phobies.find(
			item => item.name === page.title
		);

		if (!phobie) {
			continue;
		}

		const wikitext =
			page.revisions?.[0]?.slots?.main?.content ?? '';

		const phobie_template = parse_templates(
			wikitext,
			['Phobie']
		)[0];

		const ability_templates = parse_templates(
			wikitext,
			['Passive', 'SpecialAbility']
		);

		const phobie_properties = {
			...phobie_template?.properties
		};

		delete phobie_properties.name;

		Object.assign(
			phobie,
			phobie_properties
		);

		phobie.abilities = ability_templates.map(
			ability => ({
				type: ability.template_name,
				...ability.properties
			})
		);

		phobie.wikitext = wikitext;
	}
}

await writeFile(
	`${data_dir}/details.json`,
	JSON.stringify(phobies, null, '\t') + '\n'
);

console.log(`Fetched ${phobies.length} Phobies.`);