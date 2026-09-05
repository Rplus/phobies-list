import path from "node:path";

const DATA_DIR = Bun.env.DATA_DIR;

const phobies = await Bun.file(`${DATA_DIR}/data_with_icon.json`).json();


// 實用的休眠工具函式
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 隨機產生一組瀏覽器的 Headers 偽裝身分
 */
function getRandomHeaders(url) {
	const userAgents = [
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15'
	];

	const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
	const urlObj = new URL(url);
	const referer = `${urlObj.protocol}//${urlObj.host}/`;

	return {
		'User-Agent': randomUserAgent,
		'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
		'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
		'Referer': 'https://phobies.fandom.com/',
		'Connection': 'keep-alive'
	};
}

/**
 * 下載單張圖片（含：存在檢查、Timeout、隨機 Headers、自動重試）
 */
async function downloadImageWithTimeout(url, outputPath, timeout = 5000, retries = 3) {
	// 【核心改進】使用 Bun 原生的高效方法檢查檔案是否存在
	const fileExists = await Bun.file(outputPath).exists();
	if (fileExists) {
		// console.log(`[略過] 檔案已存在，不重複下載: ${path.basename(outputPath)}`);
		return;
	}

	for (let i = 0; i < retries; i++) {
		try {
			// 使用現代 Web 標準的 AbortSignal.timeout
			const response = await fetch(url, {
				signal: AbortSignal.timeout(timeout),
				headers: getRandomHeaders(url) // 注入隨機標頭
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			await Bun.write(outputPath, response);
			console.log(`[成功] 已儲存: ${path.basename(outputPath)}`);
			return;
		} catch (error) {
			const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
			console.warn(`[重試] ${path.basename(outputPath)} (第 ${i + 1} 次) - 原因: ${isTimeout ? '超時' : error.message}`);

			if (i === retries - 1) {
				console.error(`[失敗] ${path.basename(outputPath)} 已達最大重試次數，放棄。`, url);
			} else {
				await sleep(1000); // 重試前固定等 1 秒
			}
		}
	}
}
/**
 * 批次下載圖片主程式（維持原路徑結構 - 純 Bun 原生版）
 */
async function batchDownload(urls, limit = 1) {
	const activePromises = [];
	const targetFolder = './images'; // 基礎下載資料夾

	for (const item of urls) {
		// 1. 判斷 item 是物件還是純字串並取出網址
		let urlStr = item && typeof item === 'object' ? item.url : item;

		if (!urlStr || typeof urlStr !== 'string') {
			console.warn(`[警告] 發現無效的網址格式，已略過:`, item);
			continue;
		}

		// 2. 維持原本的 PATH 結構
		const fullUrl = urlStr.startsWith('http') ? urlStr : `https://nocookie.net{urlStr}`;

		// 移除網址前綴，只留下純路徑（例如：'c/cc/Razor_Mouth_Avatar.png'）
		const cleanPath = urlStr.startsWith('http')
			? urlStr.replace(/^https?:\/\/static\.wikia\.nocookie\.net\/phobies\/images\//, '')
			: urlStr;

		// outputPath: 完美的本地完整路徑 (例如: './images/c/cc/Razor_Mouth_Avatar.png')
		const outputPath = path.join(targetFolder, cleanPath);

		// 3. 在排入隊列前，先檢查檔案是否已存在
		const fileExists = await Bun.file(outputPath).exists();
		if (fileExists) {
			console.log(`[略過] 檔案已存在: ${cleanPath}`);
			continue;
		}

		// 4. 啟動真正的下載任務
		// 💡 註：這裡直接交給 downloadImageWithTimeout 內部的 Bun.write(outputPath, response)
		// Bun 會自動幫你建立對應的 c/cc 資料夾，完全不需要手動 fs.mkdirSync！
		const promise = downloadImageWithTimeout(fullUrl, outputPath, 8000, 3)
			.then(async () => {
				// 【防 BAN 延遲最佳化】隨機休息時間為 3 ~ 7 秒
				const delay = Math.floor(Math.random() * 4000) + 3000;
				await sleep(delay);

				// 釋放並行配額
				activePromises.splice(activePromises.indexOf(promise), 1);
			});

		activePromises.push(promise);

		if (activePromises.length >= limit) {
			await Promise.race(activePromises);
		}
	}

	await Promise.all(activePromises);
	console.log('✨ 所有圖片任務安全處理完畢！');
}





const imageUrls = phobies.flatMap(p => [p.img, p.file]).map(i => 'https://static.wikia.nocookie.net/phobies/images/' + i);

// 開始批次下載（設定同時最多抓 3 張，超時為 8 秒）
batchDownload(imageUrls, 3);
