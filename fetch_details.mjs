import wtf from 'wtf_wikipedia';
import { API_URL, DATA_DIR, custom_fetch } from './u.mjs';

const target_templates = ['phobie', 'passive', 'specialability'];

function normalize_property_value(key, value) {
	// console.log(key, value);
	const replacements = {
		'attack-type': {
			'line of sight': 'Line of Sight',
		},
		'damage-range': {
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

	for (let prop in op) {
		op[prop] = normalize_property_value(prop, op[prop]);
	}
	return op;
}

const phobies = await Bun.file(`${DATA_DIR}/list.json`).json();

for (let i = 0; i < phobies.length; i += 50) {
	const batch = phobies.slice(i, i + 50);

	console.log(
		` ..Fetching details ${i + 1}-${i + batch.length} / ${phobies.length}...`
	);

	const url = new URL(API_URL);

	url.search = new URLSearchParams({
		action: 'query',
		prop: 'revisions',
		titles: batch.map(phobie => phobie.name).join('|'),
		rvslots: 'main',
		rvprop: 'content',
		formatversion: '2',
		format: 'json'
	});

	const response = await custom_fetch(url);

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

console.log(` ## Fetched ${phobies.length} Phobies.`);