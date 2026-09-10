const DATA_DIR = Bun.env.DATA_DIR;

// download_allimages.js

const API_URL = 'https://phobies.fandom.com/api.php';

async function fetch_all_images() {
	let aicontinue = null;
	const all_images = [];

	while (true) {
		const params = new URLSearchParams({
			action: 'query',
			list: 'allimages',
			ailimit: 'max',
			aiprop: 'url',
			format: 'json',
			formatversion: '2',
		});

		if (aicontinue) {
			params.set('aicontinue', aicontinue);
		}

		const response = await fetch(
			`${API_URL}?${params.toString()}`
		);

		if (!response.ok) {
			throw new Error(
				`HTTP ${response.status}`
			);
		}

		const data = await response.json();
		const images = data?.query?.allimages ?? [];

		all_images.push(...images);

		console.log(
			` # Fetched ${images.length}, total=${all_images.length}`
		);

		if (!data?.continue?.aicontinue) {
			break;
		}

		aicontinue = data.continue.aicontinue;

		console.log(
			` ..Continue from: ${aicontinue}`
		);
	}

	return all_images;
}

function build_lookup(images) {
	const lookup = {};

	for (const image of images) {
		const title = image.title;
		lookup[image.name.toLowerCase().replace(/\..{3,4}$/g, '')] = {
			name: image.name,
			url: image.url,
			// title,
		};
	}

	return lookup;
}

const images = await fetch_all_images();

await Bun.write(
	`${DATA_DIR}/allimages.json`,
	JSON.stringify(images, null, '\t')
);

await Bun.write(
	`${DATA_DIR}/allimages_lookup.json`,
	JSON.stringify(
		build_lookup(images),
		null,
		'\t'
	)
);

console.log(
	` ## Done. Total images: ${images.length}`
);
