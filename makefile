# 定義目標資料夾與檔案名稱
DATA_DIR = data
COMBINED_JSON = $(DATA_DIR)/data_with_icon.json
INDEX_HTML = index.html

# 關鍵設定：將 all、下載規則都宣告為 .PHONY，確保每次執行 make 都一定會跑 curl 覆蓋舊檔
.PHONY: all clean fetch-phobies parse-phobies inline

all: fetch-wiki parse-phobies inline
	@echo "所有 JSON 檔案已嘗試更新並覆蓋！"

# 建立資料夾（這個保留非 .PHONY，有資料夾就不重複建立）
$(DATA_DIR):
	mkdir -p $(DATA_DIR)

parsing-date:

fetch-wiki: fetch_img_index
	mkdir -p $(DATA_DIR)
	DATA_DIR='$(DATA_DIR)' bun ./fetch_list.mjs
	DATA_DIR='$(DATA_DIR)' bun ./fetch_details.mjs
	DATA_DIR='$(DATA_DIR)' bun ./match_icon.mjs

fetch_img_index:
	DATA_DIR='$(DATA_DIR)' bun ./fetch_images.mjs

parse-phobies:
	DATA_DIR='$(DATA_DIR)' bun ./parse-phobies.mjs

download-phobies-images:
	DATA_DIR='$(DATA_DIR)' bun ./download-imgs.mjs

# inline:
# 	@echo "正在更新內嵌 JS..."
# 	@awk -v js_file="$(COMBINED_JSON)" ' \
# 		/<!-- JS_INLINE_START -->/ { \
# 			print $$0; \
# 			print "<script>"; \
# 			print "const heros ="; \
# 			while ((getline line < js_file) > 0) { print line } \
# 			close(js_file); \
# 			print ";</script>"; \
# 			skip = 1; \
# 			next \
# 		} \
# 		/<!-- JS_INLINE_END -->/ { \
# 			skip = 0; \
# 			print $$0; \
# 			next \
# 		} \
# 		skip == 1 { next } \
# 		{ print } \
# 	' "$(INDEX_HTML)" > "$(INDEX_HTML).tmp" && \
# 	mv "$(INDEX_HTML).tmp" "$(INDEX_HTML)"

# 如果真的有需要手動完整清空時才使用的指令
# clean:
# 	rm -rf $(DATA_DIR)
# 	@echo "已清理下載的資料。"