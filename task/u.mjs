const ERROR_LOG_PATH = './data/_fetch_errors.log';

export const DATA_DIR = Bun.env.DATA_DIR || './data';
export const API_URL = 'https://phobies.fandom.com/api.php';

const USER_AGENTS = [
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
];
const ACCEPT_LANGS = [
	'zh-TW,zh;q=0.9,en;q=0.8',
	'zh-CN,zh;q=0.9,en;q=0.8',
	'en-US,en;q=0.9,zh;q=0.8',
];
const REFERERS = [
	'https://phobies.fandom.com/',
	'https://fandom.com/',
];

/**
 * 爬蟲專用隨機網路請求器（Bun 原生版）
 *
 * 整合了隨機冷卻時間、防封鎖標頭（Header）偽裝以及自動錯誤日誌記錄。
 * 當請求失敗時不會中斷程式，而是會寫入錯誤日誌並回傳 `null`。
 *
 * @param {Object} options - 請求設定選項
 * @param {string} options.url - 欲請求的目標網址（必填）
 * @param {boolean} [options.is_json=true] - 是否自動將回應解析為 JSON 格式。若為 false 則回傳純文字
 * @param {boolean} [options.skip_sleep=false] - 是否跳過發送請求前的隨機冷卻時間
 * @param {number|null} [options.sleep_time=null] - 指定冷卻時間（毫秒）。若為 null 則自動隨機產生 1000~3000ms
 * @returns {Promise<any|null>} 解析後的資料（物件或字串），若請求或解析失敗則回傳 `null`
 * @throws {Error} 當未提供 `url` 參數時拋出錯誤
 *
 * @example
 * // 1. 抓取 JSON 資料（預設）
 * const data = await random_fetch({ url: 'https://example.com' });
 * if (data) console.log(data.name);
 *
 * // 2. 抓取純文字或 HTML
 * const html = await random_fetch({ url: 'https://example.com', is_json: false });
 */
export async function custom_fetch({
	url = '',
	is_json = true,
	skip_sleep = false,
	sleep_time = null,
}) {
	if (!url) throw new Error('URL is required');

	try {
		// 1. 隨機冷卻時間（防封鎖）
		if (!skip_sleep) {
			sleep_time = sleep_time ?? random_time(1000, 3000);
			await Bun.sleep(sleep_time);
		}

		// 2. 發送帶有隨機標頭的網路請求
		const res = await fetch(url, {
			headers: random_header(),
		});

		// 3. 檢查回應狀態
		if (!res.ok) {
			console.error(`❌ Fetch ${url} failed: ${res.status} ${res.statusText}`);
			await write_error_log(url, `HTTP ${res.status} ${res.statusText}`);
			return null;
		}

		// 4. 解析並回傳資料
		return is_json ? await res.json() : await res.text();

	} catch (err) {
		// 5. 錯誤連線與解析異常處理
		console.error(`💥 Fetch ${url} encountered an error: ${err.message}`);
		await write_error_log(url, err.message);
		return null;
	}
}

// --------------------------------------------------
// 輔助函式
// --------------------------------------------------

export function random_header() {
	const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
	return {
		'User-Agent': pick(USER_AGENTS),
		'Accept-Language': pick(ACCEPT_LANGS),
		'Referer': pick(REFERERS),
		'Connection': 'keep-alive',
	};
}

function random_time(min = 0, max = 1000) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function write_error_log(url, message) {
	const log_msg = `[${new Date().toISOString()}] URL: ${url}, Error: ${message}\n`;
	const file = Bun.file(ERROR_LOG_PATH);

	const existing_text = await file.exists() ? await file.text() : '';
	await Bun.write(file, existing_text + log_msg);
}
