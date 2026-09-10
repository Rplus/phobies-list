import { resolve, dirname } from "node:path";

const srcPath = "./index.src.html";
const outputPath = "./index.html";

let html = await Bun.file(srcPath).text();
const currentDir = dirname(resolve(srcPath));

// 精準匹配 <inject src="路徑" />，允許斜線前後有空格
const injectRegex = /<inject\s+src="([^"]+)"\s*\/>/g;

let match;
while ((match = injectRegex.exec(html)) !== null) {
	const [fullTag, relativePath] = match;
	const targetPath = resolve(currentDir, relativePath);

	try {
		const injectedContent = await Bun.file(targetPath).text();
		html = html.replace(fullTag, injectedContent);
	} catch (err) {
		console.error(`❌ 注入失敗，找不到檔案: ${targetPath}`);
	}
}

await Bun.write(outputPath, html);
console.log(`✅ 成功生成新的 HTML：${outputPath}`);
