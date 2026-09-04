import wtf from 'wtf_wikipedia';
const target_templates = ['phobie', 'passive', 'specialability'];

const DATA_DIR = Bun.env.DATA_DIR;
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

function fn_parse_wikitext(wikitext = '') {
	const doc = wtf(wikitext);
	const all_data = doc.templates().map(tmpl => tmpl.json());
	const grouped = Object.groupBy(all_data, ({ template }) => template);
	const op = {
		...(grouped['phobie'] || [])[0],
		abilities: [
			...(grouped['passive'] || []),
			...(grouped['specialability'] || [])
		]
	};
	delete op.name;
	return op;
}

const phobies = await Bun.file(`${DATA_DIR}/list.json`).json();

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

		Object.assign(
			phobie,
			fn_parse_wikitext(wikitext),
		);

		phobie.wikitext = wikitext;
	}
}

await Bun.write(
	`${DATA_DIR}/details.json`,
	JSON.stringify(phobies, null, '\t') + '\n'
);

console.log(`Fetched ${phobies.length} Phobies.`);