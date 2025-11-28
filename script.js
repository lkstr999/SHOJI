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
 * @param {string} csvText - CSVファイルの内容
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
        contentArea.classList.add('category-tiles');
        contentArea.classList.remove('product-grid-container');
        renderCategoryTiles(filteredData, CATEGORY_COLUMNS[0]);
    } else {
        // 1レベル (分類１選択後) 以降は、常に商品詳細リストを表示
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
        // ヘッダーテキストを決定（品番は「品番」のまま、備考は「備考１/備考２」）
        const label = colKey; 
        const headerCell = document.createElement('div');
        headerCell.className = `col-${colKey.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace('１', '1').replace('２', '2')}`; // CSSクラス名用に全角数字を半角に変換
        headerCell.textContent = label;
        headerRow.appendChild(headerCell);
    });
    
    contentArea.appendChild(headerRow);
    
    // 2. データ行の作成
    data.forEach(item => {
        const productRow = document.createElement('div');
        productRow.className = 'product-row';
        
        ALL_DISPLAY_COLUMNS.forEach(colKey => {
            const cell = document.createElement('div');
            cell.className = `col-${colKey.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace('１', '1').replace('２', '2')}`;
            cell.textContent = item[colKey] || ''; // データがない場合は空文字
            productRow.appendChild(cell);
        });
        
        contentArea.appendChild(productRow);
    });
}


/**
 * 👆 タイルがクリックされたときの処理 (分類１の選択)
 * @param {string} column - クリックされた分類の列名 ('分類１')
 * @param {string} value - クリックされた分類の値
 */
function handleTileClick(column, value) {
    currentLevel = 1;
    currentFilters = {};
    currentFilters[column] = value;
    renderContent();
}

/**
 * 🗺️ パンくずリストを更新する
 */
function updateBreadcrumb() {
    breadcrumbContainer.innerHTML = '';
    
    createCrumb('🔍 全ての商品', 0);
    
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
// <-- 構文エラーを解消する閉じ括弧は、この下に続く行の終端に存在し、
//     このファイル全体としては正しく閉じられています。