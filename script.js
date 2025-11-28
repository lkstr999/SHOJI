// CSVファイル名
const CSV_FILE_NAME = '商品マスタ.csv';
// 階層の列名
const CATEGORY_COLUMNS = ['分類１', '分類２', '分類３', '分類４', '分類５', '分類６'];
// 商品詳細として表示する列名 (品番を除く)
const OTHER_COLUMNS = [
    { key: '品番', label: '品番' },
    { key: '備考１', label: '備考１' },
    { key: '備考２', label: '備考２' },
];

// すべての表示対象列 (ヘッダー作成に使用)
const ALL_DISPLAY_COLUMNS = [...CATEGORY_COLUMNS, ...OTHER_COLUMNS.map(c => c.key)];


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
 * (前回のロジックと変更なし)
 */
async function fetchCsvData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`CSVファイルの読み込みに失敗しました: ${response.statusText}`);
        }
        const text = await response.text();
        parseCsv(text);
        loadingMessage.style.display = 'none';
        renderContent();
    } catch (error) {
        console.error(error);
        loadingMessage.textContent = 'データの読み込みエラー: ' + error.message;
        loadingMessage.style.color = 'red';
    }
}

/**
 * 📊 CSVテキストを行と列にパースする
 * (前回のロジックと変更なし)
 */
function parseCsv(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    headers = lines[0].split(',').map(h => h.trim());

    allData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, i) => {
            row[header] = values[i] ? values[i].trim() : '';
        });
        return row;
    }).filter(row => row[headers[0]] !== '');
}


/**
 * 🧱 現在の階層に基づいてコンテンツをレンダリングする
 */
function renderContent() {
    contentArea.innerHTML = '';
    
    // フィルタリング処理
    const filteredData = allData.filter(item => {
        for (const key in currentFilters) {
            if (item[key] !== currentFilters[key]) {
                return false;
            }
        }
        return true;
    });

    // 0レベル (全て) の場合、分類１のタイルを表示
    if (currentLevel === 0) {
        // コンテンツエリアにタイル表示用のクラスを適用
        contentArea.classList.add('category-tiles');
        contentArea.classList.remove('product-grid-container');
        renderCategoryTiles(filteredData, CATEGORY_COLUMNS[0]);
    } else {
        // 1レベル (分類１選択後) 以降は、常に商品詳細リストを表示
        // コンテンツエリアにグリッド表示用のクラスを適用
        contentArea.classList.remove('category-tiles');
        contentArea.classList.add('product-grid-container');
        renderProductGrid(filteredData);
    }
    
    updateBreadcrumb();
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
    Object.keys(categoryCounts).sort().forEach(categoryValue => {
        const tile = document.createElement('div');
        tile.className = 'category-tile';
        tile.innerHTML = `
            <div class="tile-title">${categoryValue}</div>
            <div class="tile-count">(${categoryCounts[categoryValue]}件)</div>
        `;
        tile.dataset.value = categoryValue;
        
        tile.addEventListener('click', () => handleTileClick(categoryColumn, categoryValue));
        contentArea.appendChild(tile);
    });
}

/**
 * 📋 商品の詳細をExcelグリッド形式で表示する
 * @param {Array<Object>} data - フィルタリングされた商品データ
 */
function renderProductGrid(data) {
    if (data.length === 0) {
        contentArea.innerHTML = '<p style="padding: 20px; background: white; border-radius: 4px;">該当する商品が見つかりませんでした。</p>';
        return;
    }
    
    // 1. ヘッダー行の作成
    const headerRow = document.createElement('div');
    headerRow.className = 'product-header';
    
    ALL_DISPLAY_COLUMNS.forEach(colKey => {
        // ヘッダーテキストを決定（品番は「品番」の