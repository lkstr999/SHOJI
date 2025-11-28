// CSVファイル名
const CSV_FILE_NAME = '商品マスタ.csv';
// 階層の列名 (分類1, 分類2, 分類3, 分類4, 分類5, 分類6)
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
        // Shift-JISの可能性があるため、必要に応じて処理を加えますが、
        // GitHub PagesではUTF-8に変換されていることが多いため、ここでは簡易的なパースを行います。
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
 * 📊 CSVテキストを行と列にパースする (簡易版)
 * @param {string} csvText - CSVファイルの内容
 */
function parseCsv(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    // ヘッダーを抽出
    headers = lines[0].split(',').map(h => h.trim());

    // データ行をパース
    allData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, i) => {
            // 値はトリムして格納
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
    const currentCategory = CATEGORY_COLUMNS[currentLevel - 1];
    
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

    if (currentLevel < CATEGORY_COLUMNS.length) {
        // 分類レベルの表示 (タイル表示)
        renderCategoryTiles(filteredData, currentCategory);
    } else {
        // 最下層の商品詳細リスト表示
        renderProductList(filteredData);
    }
    
    updateBreadcrumb(); // パンくずリストを更新
}


/**
 * 🧩 タイル形式で次の分類の選択肢を表示する
 * @param {Array<Object>} data - フィルタリングされた商品データ
 * @param {string} categoryColumn - 現在の階層の列名
 */
function renderCategoryTiles(data, categoryColumn) {
    const categoryCounts = {};

    // 次の分類の選択肢とその件数を集計
    data.forEach(item => {
        const key = item[categoryColumn];
        if (key) {
            categoryCounts[key] = (categoryCounts[key] || 0) + 1;
        }
    });

    // 選択肢がない場合は、商品リストに移動（稀なケースのフォールバック）
    if (Object.keys(categoryCounts).length === 0) {
        // 次の階層へ進む (強制的に商品リスト表示へ)
        currentLevel++;
        renderContent();
        return;
    }
    
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
        
        let html = `<p class="product-code">品番: <strong>${item['品番']}</strong></p>`;
        
        // 分類情報 (見出し) を表示
        CATEGORY_COLUMNS.forEach((col, index) => {
            if (item[col]) {
                html += `<p><strong>${col}:</strong> ${item[col]}</p>`;
            }
        });

        // その他の詳細情報を表示
        PRODUCT_COLUMNS.forEach(col => {
            // 品番はすでに表示されているためスキップ
            if (col.key !== '品番' && item[col.key]) {
                html += `<p><strong>${col.label}:</strong> ${item[col.key]}</p>`;
            }
        });
        
        productItem.innerHTML = html;
        contentArea.appendChild(productItem);
    });
}


/**
 * 👆 タイルがクリックされたときの処理
 * @param {string} column - クリックされた分類の列名
 * @param {string} value - クリックされた分類の値
 */
function handleTileClick(column, value) {
    currentLevel++; // 階層を深くする
    currentFilters[column] = value; // 絞り込み条件を追加
    renderContent();
}

/**
 * 🗺️ パンくずリストを更新する
 */
function updateBreadcrumb() {
    breadcrumbContainer.innerHTML = '';
    
    // 0: 全て
    createCrumb('全て', 0);
    
    // 1以上: 各分類
    let currentPath = {};
    for (let i = 0; i < currentLevel; i++) {
        const column = CATEGORY_COLUMNS[i];
        if (currentFilters[column]) {
            currentPath[column] = currentFilters[column];
            createCrumb(currentFilters[column], i + 1, { ...currentPath });
        } else {
            // フィルタが設定されていない階層以降は表示しない
            break;
        }
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
    for (let i = 0; i < targetLevel; i++) {
        const column = CATEGORY_COLUMNS[i];
        if (targetFilters[column]) {
            currentFilters[column] = targetFilters[column];
        }
    }
    
    renderContent();
}