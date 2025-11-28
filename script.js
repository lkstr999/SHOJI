// CSVファイル名
const CSV_FILE_NAME = '商品マスタ.csv';
// 階層の列名 (分類1のみタイル表示に使用。分類2以降は商品リストの表示に使用)
const CATEGORY_COLUMNS = ['分類１', '分類２', '分類３', '分類４', '分類５', '分類６'];
// 商品詳細として表示する列名 (任意で調整してください)
const PRODUCT_COLUMNS = [
    { key: '品番', label: '品番' },
    { key: '備考１', label: '備考１' },
    { key: '備考２', label: '備考２' },
];

let allData = []; // 全商品データ
let currentLevel = 0; // 現在表示している分類の階層 (0: 全て, 1: 分類1, ...)
let currentFilters = {}; // 現在の絞り込み条件
let headers = []; // CSVのヘッダー情報

const contentArea = document.getElementById('content-area');
const breadcrumbContainer = document.getElementById('breadcrumb');
const loadingMessage = document.getElementById('loading-message');


/**
 * 💻 初期化処理
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchCsvData(CSV_FILE_NAME);
});

/**
 * 💾 CSVファイルを読み込み、パースする
 * @param {string} url - CSVファイルのパス
 */
async function fetchCsvData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`CSVファイルの読み込みに失敗しました: ${response.statusText}`);
        }
        const text = await response.text();
        parseCsv(text);
        loadingMessage.style.display = 'none'; // ロード中メッセージを非表示に
        renderContent(); // 最初の表示をキック
    } catch (error) {
        console.error(error);
        loadingMessage.textContent = 'データの読み込みエラー: ' + error.message;
        loadingMessage.style.color = 'red';
    }
}

/**
 * 📊 CSVテキストを行と列にパースする
 * @param {string} csvText - CSVファイルの内容
 */
function parseCsv(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    // ヘッダーを抽出
    // CSVはダブルクォーテーションやカンマのエスケープ処理が必要な場合がありますが、
    // ここでは単純なカンマ区切りとして処理します。
    headers = lines[0].split(',').map(h => h.trim());

    // データ行をパース
    allData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, i) => {
            row[header] = values[i] ? values[i].trim() : '';
        });
        return row;
    }).filter(row => row[headers[0]] !== ''); // 最初の列が空の行は除外
}


/**
 * 🧱 現在の階層に基づいてコンテンツをレンダリングする
 */
function renderContent() {
    contentArea.innerHTML = ''; // コンテンツエリアをクリア
    
    // フィルタリング処理
    const filteredData = allData.filter(item => {
        for (const key in currentFilters) {
            // currentFiltersに設定されている分類が、アイテムと一致するかチェック
            if (item[key] !== currentFilters[key]) {
                return false;
            }
        }
        return true;
    });

    // 0レベル (全て) の場合、分類１のタイルを表示
    if (currentLevel === 0) {
        renderCategoryTiles(filteredData, CATEGORY_COLUMNS[0]);
    } else {
        // 1レベル (分類１選択後) 以降は、常に商品詳細リストを表示
        renderProductList(filteredData);
    }
    
    updateBreadcrumb(); // パンくずリストを更新
}


/**
 * 🧩 タイル形式で次の分類の選択肢を表示する (分類１のみ使用)
 * @param {Array<Object>} data - フィルタリングされた商品データ
 * @param {string} categoryColumn - 現在の階層の列名
 */
function renderCategoryTiles(data, categoryColumn) {
    const categoryCounts = {};

    data.forEach(item => {
        const key = item[categoryColumn];
        if (key) {
            categoryCounts[key] = (categoryCounts[key] || 0) + 1;
        }
    });

    // タイルのレンダリング
    contentArea.classList.remove('product-list');
    
    Object.keys(categoryCounts).sort().forEach(categoryValue => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.innerHTML = `
            <div class="tile-title">${categoryValue}</div>
            <div class="tile-count">(${categoryCounts[categoryValue]}件)</div>
        `;
        tile.dataset.value = categoryValue;
        
        // タイルクリックで分類１をフィルターに追加し、商品リスト表示へ
        tile.addEventListener('click', () => handleTileClick(categoryColumn, categoryValue));
        contentArea.appendChild(tile);
    });
}

/**
 * 📋 商品の詳細リストを表示する
 * @param {Array<Object>} data - フィルタリングされた商品データ
 */
function renderProductList(data) {
    contentArea.classList.add('product-list');

    if (data.length === 0) {
        contentArea.innerHTML = '<p>該当する商品が見つかりませんでした。</p>';
        return;
    }

    data.forEach(item => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        
        // 品番を強調表示
        let itemHtml = `<div class="product-code">品番: ${item['品番']}</div>`;
        
        // 全ての分類情報 (分類１～６) を表示
        CATEGORY_COLUMNS.forEach(col => {
            if (item[col]) {
                itemHtml += `
                    <div class="product-info-group">
                        <strong>${col}</strong>
                        <span>${item[col]}</span>
                    </div>
                `;
            }
        });

        // その他の詳細情報を表示
        PRODUCT_COLUMNS.forEach(col => {
            // 品番はすでに表示されているためスキップ
            if (col.key !== '品番' && item[col.key]) {
                itemHtml += `
                    <div class="product-info-group">
                        <strong>${col.label}</strong>
                        <span>${item[col.key]}</span>
                    </div>
                `;
            }
        });
        
        productItem.innerHTML = itemHtml;
        contentArea.appendChild(productItem);
    });
}


/**
 * 👆 タイルがクリックされたときの処理 (分類１の選択)
 * @param {string} column - クリックされた分類の列名 ('分類１')
 * @param {string} value - クリックされた分類の値
 */
function handleTileClick(column, value) {
    currentLevel = 1; // 階層を1に設定 (分類１選択)
    currentFilters = {}; // フィルターをリセットしてから
    currentFilters[column] = value; // 絞り込み条件を追加
    
    // 分類１を選んだら、すぐに商品リストを表示するためにrenderContentを呼び出す
    renderContent();
}

/**
 * 🗺️ パンくずリストを更新する
 */
function updateBreadcrumb() {
    breadcrumbContainer.innerHTML = '';
    
    // 0: 全て
    createCrumb('🔍 全ての商品', 0);
    
    // 1: 分類１が選択されている場合
    if (currentLevel >= 1 && currentFilters[CATEGORY_COLUMNS[0]]) {
        const categoryValue = currentFilters[CATEGORY_COLUMNS[0]];
        createCrumb(categoryValue, 1, { [CATEGORY_COLUMNS[0]]: categoryValue });
    }
}

/**
 * 🥖 パンくずリストの要素を作成する
 * @param {string} text - 表示テキスト
 * @param {number} level - 階層レベル
 * @param {Object} [filters={}] - その階層に戻るためのフィルター条件
 */
function createCrumb(text, level, filters = {}) {
    const crumb = document.createElement('span');
    crumb.className = 'crumb';
    crumb.textContent = text;
    crumb.dataset.level = level;
    
    if (level <= currentLevel) {
        crumb.addEventListener('click', () => handleCrumbClick(level, filters));
    }
    
    breadcrumbContainer.appendChild(crumb);
}

/**
 * ↩️ パンくずリストの要素がクリックされたときの処理
 * @param {number} targetLevel - 戻りたい階層レベル
 * @param {Object} targetFilters - 戻る階層の絞り込み条件
 */
function handleCrumbClick(targetLevel, targetFilters) {
    currentLevel = targetLevel;
    currentFilters = {};
    
    // 戻る階層までのフィルタ条件を再設定
    for (const key in targetFilters) {
        currentFilters[key] = targetFilters[key];
    }
    
    renderContent();
}