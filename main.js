// init
// init
// init

const is_dev = location.protocol !== 'https:';
// const is_dev = false;

const WIKISITE = 'https://phobies.fandom.com/wiki/';
const WIKI_PATH = 'https://static.wikia.nocookie.net/phobies/images/';
const IMG_PATH = is_dev ? './images/' : WIKI_PATH;
const DEFAULT_ICON = 'e/e8/Lippy.png';
// const WIKISITE = 'https://phobies.antifandom.com/';
// const WIKISITE = 'https://breezewiki.com/phobies/';

let props = [
	'name',
	'cost',
	'race',
	'rarity',
	'movement-type',
	'movement-range',
	'attack-type',
	'attack-range',
	'health',
	'attack',
	'damage-range',
	'abilities',
];

let switcher_props = [
	'cost',
	'race',
	'rarity',
	'movement-range',
	'movement-type',
	'attack-range',
	'attack-type',
	'damage-range',
];

let filter_props = [
	'race',
	'cost',
	'rarity',
	'movement-range',
	'movement-type',
	'attack-range',
	'attack-type',
	'damage-range',
];

let filter_rendering_grounp = [
	'race',
	'cost',
	'rarity',
	'movement-range',
	'movement-type',
	'attack-range',
	'attack-type',
	'damage-range',
	// {
	// 	title: 'type',
	// 	items: [
	// 		'damage_type',
	// 		'armor_type',
	// 	],
	// 	open: true,
	// },
];

const baned_props = [
	'link',
	'img',
	'file',
	'template',
	'abilities',
	'order',
];

const skill_baned_props = [
	'type',
	'title',
	'icon-title',
	'icon-url',
	'template',
];

String.prototype.sanitize = function() {
	return this.replace(/[,\s\']/g, '_');
};

// init order number
const TEXT_BASE = 10000000;

heros.forEach(hero => {
	hero.order = {};
	props.forEach((prop, index) => {
		if (prop === 'abilities') {
			return;
		}
		// 使用 ?? 和 ||，直接把 undefined, null, '' 統一過濾並轉成字串 '0'
		let order_target = (hero[prop] ?? '') || '0';

		// 1. 處理純數字字串
		if (!isNaN(order_target)) {
			hero.order[prop] = Number(order_target);
		}

		// 2. 處理文字字串（純英數優化版，完全消滅內部隱藏迴圈）
		else {
			// const str = order_target;
			const str = order_target.toUpperCase();
			const c1 = str.codePointAt(0) ?? 32; // 第一個字，沒字補空格 (32)
			const c2 = str.codePointAt(1) ?? 32; // 第二個字
			const c3 = str.codePointAt(2) ?? 32; // 第三個字

			// 透過 256 進位制做純數學拼接，第一個字元權重最高，且絕不溢位碰撞
			const textWeight = (c1 * 65536) + (c2 * 256) + c3;

			hero.order[prop] = TEXT_BASE + textWeight;
		}
	});
});

let us_cate = fn_get_us_cate(location);
el_filters.innerHTML = fn_gen_filterdom();

if (!us_cate) {
	el_list.innerHTML = fn_gen_list();
} else {
	init_grouped_hero(us_cate);
}

const mediaQuery = window.matchMedia('(min-width: 1300px)');
if (mediaQuery.matches) {
	el_form_details.open = true;
}

function fn_get_us_cate(url_obj = location) {
	let _us = new URLSearchParams(url_obj.search);
	let _us_cate = ( switcher_props.includes(_us.get('cate')) && _us.get('cate') );
	return _us_cate || '';
}

function init_grouped_hero(_cate = switcher_props[0]) {
	el_list.classList.add('is-grouped');
	el_switcher.value = _cate;
	el_list.innerHTML = fn_gen_groupby(_cate);
}

fn_gen_switcher();

function fn_gen_switcher() {
	el_switcher.innerHTML = `<option value="">= list view =</option>` + switcher_props.map(prop => {
		return `<option value="${prop}" ${prop === us_cate ? 'selected' : ''}>${prop}</option>`;
	}).join('');

	el_switcher.addEventListener('change', (e) => {
		let _cate = e.target.value;
		console.log(e.target.value);
		if (_cate) {
			// location.href = `?cate=${_cate}`;
			window.history.pushState(null, '', `?cate=${_cate}`);
		} else {
			location.href = './index.html';
		}
	});

	if (window.navigation) {
		navigation.addEventListener('navigate', (event) => {
			if (!event.destination.sameDocument) {
				return;
			}
			let _us_cate = fn_get_us_cate(new URL(event.destination.url));
			if (_us_cate) {
				init_grouped_hero(_us_cate);
			} else {
				location.href = './index.html';
			}
		});
	}
}

function fn_gen_groupby(_cate) {
	console.log(22, 'fn_gen_groupby');
	let prop_2nd = 'race';

	// o_filters

	let heros_grouped = Object.groupBy(heros, (i) => i[_cate]);
	for (let cate in heros_grouped) {
		heros_grouped[cate] = Object.groupBy(heros_grouped[cate], i => i.race);
	}

	// console.log(22, heros_grouped);
	let _html = '';
	let s_class = o_filters[prop_2nd];

	for (let cate in heros_grouped) {
		let _hero_html = '';

		for (let _class of s_class) {
		// for (let _class in heros_grouped[cate]) {
			let _class_html = heros_grouped[cate][_class]?.map((hero) => {
				return fn_gen_grouped_hero(hero);
			}).join('') || '';
			_hero_html += `<div class="grouped-heros-classbox">${_class_html}</div>`;
		}

		_html += `<div class="grouped-heros-cate" data-cate="${_cate}">
			<h3>${cate}</h3>
			<div class="grouped-heros-box">
				${_hero_html}
			</div>
		</div>`;
	}

	return _html;

	function fn_sumarray(array) {
		return array.reduce((all, cur) => all + cur, 0);
	}

	function fn_gen_grouped_hero(hero, index) {
		let _props = fn_gen_hero_props(hero);
		return `
			<div class="grouped-hero item" ${_props}>
				<img src="${IMG_PATH}${hero.img}" width="60" height="60" loading="lazy" referrerpolicy="no-referrer">
				<button class="grouped-hero__details-btn" onclick="fn_toggle_dialog(true, '${hero.name}')"></button>
				<div class="grouped-hero__name">
					<a href="${WIKISITE}${hero.link}" target="_blank" rel="noopener noreferrer">${hero.name}</a>
				</div>
			</div>
		`
	}
}

function fn_gen_hero_props(hero) {
	return props.map(p => {
		if (p === 'slots') {
			return ['slot1', 'slot2', 'slot3'].map(j => ` data-${j}_${hero[j]}`).join('');
		}
		return ` data-${p}_${(hero[p] + '').sanitize()}`;
	}).join('');
}

function fn_gen_list() {
	return (
		'<li id="el_head" class="head" data-dir="-1">' + props.map((p, index) => `<div data-index="${index}">
			<span class="label">${p.split('_').join('\n')}</span>
		</div>`).join('') + '</li><style id="el_head_style"></style>'
	) +
	heros.map(hero => {
		let _props = fn_gen_hero_props(hero);
		let orders_style = props.map(p => `--order-${p}: ${hero.order[p]};`).join(' ');
		return (
			`<li class="item" ${_props} style="${orders_style}">`
			+ props.map(p => fn_gen_td(hero, p)).join('')
			+ '</li>'
		);
	}).join('');

	function fn_gen_td(hero, p) {
		let ctx = hero[p];

		if (p === 'name') {
			ctx = `<img src="${IMG_PATH}${hero.img}" width="60" height="60" loading="lazy" referrerpolicy="no-referrer" onclick="fn_toggle_dialog(true, '${hero.name}')"><br/><a href="${WIKISITE}${hero.link}" target="_blank" rel="noopener noreferrer">${hero[p]}</a>`;
		} else if (p === 'abilities') {
			let _skills = hero[p];
			if (_skills) {
				ctx = _skills.map((s, si) => {
					let _url = WIKI_PATH + (s['icon-title'] || DEFAULT_ICON);
					return `<img src="${_url}" width="36" height="36" onclick="fn_toggle_dialog(true, '${hero.name}', ${si})" referrerpolicy="no-referrer"> `;
				}).join('')
			} else {
				ctx = '';
			}
		}

		return (
			`<div data-${p}="${hero[p]}">
					<div class="label">${p}:</div>
					<div class="value" data-value="${hero[p]}">${ctx}</div>
				</div>`
		);
	}
}

function fn_gen_filterdom(argument) {
	let filter_html = ``;

	let filter_cates = heros.reduce((all, hero) => {
		filter_props.forEach(prop => {
			if (!all[prop]) {
				all[prop] = [];
			}
			all[prop].push(hero[prop]);
		});
		return all;
	}, {});

	for (let cate in filter_cates) {
		filter_cates[cate] = [...new Set(filter_cates[cate])].sort();
	}
	console.log(123, filter_cates);
	window.o_filters = filter_cates;

	function fn_gen_checkboxs(cate) {
		let dd = filter_cates[cate].map(i => `
			<dd>
				<label class="filter-label flex">
					<input type="checkbox" name="${cate}" value="${(i + '').sanitize()}" id="filter-${cate}_${i}">
					${i}
				</label>
			</dd>
		`).join('');

		return `<fieldset>
			<legend>${cate}</legend>
			<details data-cate="${cate}" ${filter_cates[cate].length < 33 ? 'open' : ''}>
				<summary></summary>
				<div>
					${dd}
				</div>
			</details>
		</fieldset>`;
	}

	for (let group of filter_rendering_grounp) {
		if (typeof group === 'string') {
			filter_html += fn_gen_checkboxs(group)
		} else if (group.items) {
			filter_html += `<fieldset>
				<legend>${group.title}</legend>
				<details ${group.open ? 'open' : ''}>
					<summary></summary>
					<div>
						${group.items.map(fn_gen_checkboxs).join('')}
					</div>
				</details>
			</fieldset>`
		}
	}

	// el_form.querySelector(':scope > details').open = !us_cate;

	return filter_html;
}

// binding:
// binding:
// binding:

window.el_form.addEventListener('input', fn_form_update);
window.el_form.addEventListener('reset', fn_update_style);
window.el_head?.addEventListener('click', fn_reorder_table);

function fn_form_update() {
	let formData = new FormData(el_form);

	if (![...formData.entries()].length) {
		fn_update_style();
		return;
	}

	let pairs = {};
	for (const [key, value] of formData.entries()) {
		if (pairs.hasOwnProperty(key)) {
	    pairs[key].push(value);
		} else {
		  pairs[key] = [value];
		}
	}

	let selectors = [];
	for (let prop in pairs) {
		selectors.push(
			`.item.item:not(`+ pairs[prop].map(v => `[data-${prop}_${v}]`).join(',') +`)`
		)
	}

	let _style = selectors.join(',') + `{ display: none; }`;

	fn_update_style(_style);
}

function fn_update_style(style = '') {
	el_filter_style.innerHTML = style || '';
}

function fn_reorder_table(e) {
	let dir = +(el_head.dataset.dir) || 1;
	let index = e.target.closest('div')?.dataset.index;
	if (!index) {
		el_head_style.innerHTML = '';
		return;
	}
	index = +index;
	el_head.dataset.dir = dir * -1;
	el_head.dataset.prop = props[index];
	el_head.dataset.index = index;

	el_head_style.innerHTML = `li.item { order: calc(var(--order-${props[index]}, 0) * ${dir * -1}); }
	li.head div:nth-of-type(${index + 1}) { text-shadow: 1px 2px #00f; }`;
}

function fn_toggle_dialog(is_open = true, heroname = '', skill_index = 0) {
	if (!is_open) {
		dialog.close();
		dialog_ctx.innerHTML = '';
		return;
	}

	let hero = heros.find(i => i.name === heroname);
	if (!hero) { return; }

	dialog_ctx.innerHTML = fn_gen_hero_detail(hero);
	dialog.showModal();
}

function fn_gen_hero_detail(hero) {

	const skills = fn_gen_hero_skills(hero.abilities);
	const avatar = `<a href="${WIKISITE}${hero.link}" target="_blank" rel="noopener noreferrer"><img src="${IMG_PATH}${hero.img}" width="90" height="90" referrerpolicy="no-referrer"></a>`;
	const card = fn_gen_cardview(hero);
	let props_html = Object.keys(hero)
		.filter(p => !baned_props.includes(p))
		.sort((a, b) => {
			return (a.indexOf(props) - b.indexOf(props)) || 9999;
		})
		.map(prop => {
			return `<tr><td>${prop}</td><td data-${prop}="${hero[prop]}"><div class="td-value">${hero[prop]}</div></td></tr>`;
		}).join('');

	return `<table>` +
		`<tr><td colspan="2" align="center">${avatar}${card}</td></tr>` +
		props_html +
		`</table>` + skills;
}

function fn_gen_cardview(hero) {
	// const front_img = `${IMG_PATH}${hero.file}/revision/latest/scale-to-width-down/170`;
	const front_img = IMG_PATH + hero.file + (is_dev ? '' : '/revision/latest/scale-to-width-down/170');

	let additional = '';
	let effect_type = '';
	if (hero.poison) { effect_type = 'poison' }
	else if (hero.electric) { effect_type = 'electric' }
	else if (hero.fire) { effect_type = 'fire' }
		console.log(111, {effect_type});
	if (effect_type) {
		let duration = '';
		if (hero.duration) {
			duration = `
				<div class="key-value" data-duration="${hero.duration}">
					${hero.duration}
				</div>`;
		}
		additional = `
			<div class="key-value" data-${effect_type}>
				${hero[effect_type]}
				${duration}
			</div>`
	}

	return `
		<div class="cardview" style="--bgi: url(${front_img});">
			<img class="img" src="${front_img}" width=150 referrerpolicy="no-referrer">
			<div class="key" data-cost="${hero.cost}"></div>
			<div class="values">
				<div class="hp key-value" data-health="">${hero.health}</div>
				<div class="movement key-value" data-movement-type="${hero['movement-type']}">${hero['movement-range']}</div>
				<div class="attack-type key-value" data-attack-type="${hero['attack-type']}">${hero['attack-range']}</div>
				<div class="attack key-value" data-damage-range="${hero['damage-range']}">${hero['attack']}</div>
				${additional}
			</div>
			<div class="race" data-race="${hero.race}"></div>
		</div>`;
}

function fn_sort_skill_prop(a, b) {
	if (a === 'description') { return -1; }
	if (b === 'description') { return 1; }
	return a.localeCompare(b);
}

function fn_gen_hero_skills(skills = []) {
	if (!skills.length) {
		return '';
	}
	return skills.map(skill => {
		let skill_props_html = Object.keys(skill).sort(fn_sort_skill_prop).map(_prop => {
			if (skill_baned_props.includes(_prop)) {
				return '';
			}
			return `<tr><td>${_prop}</td><td data-${_prop}="${skill[_prop]}"><div class="td-value">${skill[_prop]}</div></td></tr>`;
		}).join('');

		// let skill_props_html = '';
		// for (let _prop in skill) {
		// 	if (skill_baned_props.includes(_prop)) {
		// 		continue;
		// 	}

		// 	skill_props_html += `<tr><td>${_prop}</td><td data-${_prop}="${skill[_prop]}"><div class="td-value">${skill[_prop]}</div></td></tr>`;
		// }
		let _url = WIKI_PATH + (skill['icon-title'] || DEFAULT_ICON);
		return `
			<hr>
			<hr>
			<details open>
				<summary>
					<img src="${_url}" width=36 height=36 align=center referrerpolicy="no-referrer">
					${skill.template} Ability: ${skill.title}
				</summary>
				<div class="skill-box">
					<table>${skill_props_html}</table>
				</div>
			</details>
		`;
	}).join('');
}

dialog.addEventListener('click', (e) => {
	if (e.target === dialog) dialog.close();
});


elm_parsing_time.datatime = parsing_time;
elm_parsing_time.textContent = parsing_time;