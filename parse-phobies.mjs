import { readFile, writeFile } from 'node:fs/promises';

const data_dir = process.env.DATA_DIR;

const source_file = `${data_dir}/phobies.json`;
const output_file = `${data_dir}/phobies-parsed.json`;

function parse_phobie(wikitext) {
	const start = wikitext.search(/\{\{Phobie\b/i);

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

function normalize_damage_range(value) {
	if (!value) {
		return value;
	}

	const normalized_value = value.toLowerCase();

	if (
		normalized_value === 'single target attack' ||
		normalized_value === 'single targeted attack'
	) {
		return 'Single Target Attack';
	}

	return value;
}

function normalize_attack_type(value) {
	if (!value) {
		return value;
	}

	const normalized_value = value.toLowerCase();

	if (
		normalized_value === 'line of sight'
	) {
		return 'Line of Sight';
	}

	return value;
}

const data = JSON.parse(await readFile(source_file, 'utf8'));

const parsed_data = data.map((item) => {
	const wikitext = item.origin_data?.wikitext;
	const properties = wikitext ? parse_phobie(wikitext) : null;

	if (!properties) {
		return item;
	}

	return {
		name: item.name,
		link: item.link,
		img: item.img,
		cost: properties.cost,
		race: properties.race,
		rarity: properties.rarity,
		movement_range: properties['movement-range'],
		movement_type: properties['movement-type'],
		attack_range: properties['attack-range'],
		health: properties.health,
		attack: properties.attack,
		attack_type: normalize_attack_type(properties['attack-type']),
		damage_range: normalize_damage_range(properties['damage-range']),
		description: properties.description,
		stress_level: properties['stress level']
	};
});

await writeFile(
	output_file,
	JSON.stringify(parsed_data, null, '\t') + '\n'
);

console.log(`Parsed ${parsed_data.length} Phobies.`);
