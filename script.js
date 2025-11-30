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
 * (変更なし)
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
 * (変更なし)
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
 * (変更なし)
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
        renderCategoryTiles(filteredData, CATEGORY_COLUMNS[0], handleTileClick);
    } else {
        // 1レベル以降（分類１選択後）は商品リストと全分類フィルタを表示
        contentArea.classList.remove('category-tiles');
        contentArea.classList.add('product-grid-container');
        
        // 1. 全ての分類フィルタを表示するコンテナを作成
        const filterContainer = document.createElement('div');
        filterContainer.id = 'filter-tiles-container';
        contentArea.appendChild(filterContainer);
        
        // 2. 分類２から分類６までのフィルタタイルを作成・表示
        for (let i = 1; i < CATEGORY_COLUMNS.length; i++) {
            const currentCategoryColumn = CATEGORY_COLUMNS[i];
            
            if (!currentFilters[currentCategoryColumn]) {
                
                // タイトルを表示 (例: 分類２で絞り込む)
                const filterTitle = document.createElement('h3');
                filterTitle.textContent = `${currentCategoryColumn}で絞り込む:`;
                filterTitle.style.margin = '10px 10px 5px';
                filterTitle.style.fontSize = '1em';
                filterContainer.appendChild(filterTitle);
                
                // タイルボタンを表示する内部コンテナ
                const tilesWrapper = document.createElement('div');
                tilesWrapper.className = 'category-tiles'; // CSSクラスを流用
                filterContainer.appendChild(tilesWrapper);
                
                // タイル生成ロジック
                renderCategoryTiles(filteredData, currentCategoryColumn, handleFilterTileClick, tilesWrapper);
            }
        }
        
        // 3. 商品リストを表示
        renderProductGrid(filteredData);
    }
    
    updateBreadcrumb();
}


/**
 * 🧩 タイル形式で選択肢を表示する 
 * (変更なし)
 */
function renderCategoryTiles(data, categoryColumn, clickHandler, targetContainer = contentArea) {
    const categoryCounts = {};

    data.forEach(item => {
        const key = item[categoryColumn];
        if (key) {
            categoryCounts[key] = (categoryCounts[key] || 0) + 1;
        }
    });
    
    // タイルが1つもない場合はレンダリングしない
    if (Object.keys(categoryCounts).length === 0) {
        // nullチェックを追加 (要素が存在しない場合にエラーにならないように)
        if (targetContainer.previousElementSibling) {
            targetContainer.previousElementSibling.remove(); // タイトル(h3)を削除
        }
        targetContainer.remove(); // タイルwrapperを削除
        return;
    }

    // タイルのレンダリング
    Object.keys(categoryCounts).sort().forEach(categoryValue => {
        const tile = document.createElement('div');
        tile.className = 'category-tile';
        tile.innerHTML = `
            <div class="tile-title">${categoryValue}</div>
            <div class="tile-count">(${categoryCounts[categoryValue]}件)</div>
        `;
        tile.dataset.value = categoryValue;
        
        // クリックハンドラを外部から渡されたものに設定
        tile.addEventListener('click', () => clickHandler(categoryColumn, categoryValue));
        targetContainer.appendChild(tile);
    });
}

/**
 * 📋 商品の詳細をExcelグリッド形式で表示する
 * (変更なし)
 */
function renderProductGrid(data) {
    
    // 商品リストを包含するコンテナを作成し、contentAreaに追加
    const gridContainer = document.createElement('div');
    gridContainer.className = 'product-grid-container';
    contentArea.appendChild(gridContainer); 

    if (data.length === 0) {
        // タイルコンテナの直後にメッセージを表示
        gridContainer.innerHTML = '<p style="padding: 20px; background: white; border-radius: 4px; margin-top: 15px;">該当する商品が見つかりませんでした。</p>';
        return;
    }
    
    // 1. ヘッダー行の作成
    const headerRow = document.createElement('div');
    headerRow.className = 'product-header';
    
    ALL_DISPLAY_COLUMNS.forEach(colKey => {
        const label = colKey; 
        const headerCell = document.createElement('div');
        headerCell.className = `col-${colKey.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace('１', '1').replace('２', '2')}`;
        headerCell.textContent = label;
        headerRow.appendChild(headerCell);
    });
    
    gridContainer.appendChild(headerRow);
    
    // 2. データ行の作成
    data.forEach(item => {
        const productRow = document.createElement('div');
        productRow.className = 'product-row';
        
        ALL_DISPLAY_COLUMNS.forEach(colKey => {
            const cell = document.createElement('div');
            cell.className = `col-${colKey.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace('１', '1').replace('２', '2')}`;
            cell.textContent = item[colKey] || '';
            productRow.appendChild(cell);
        });
        
        gridContainer.appendChild(productRow);
    });
}


/**
 * 👆 分類１のタイルがクリックされたときの処理 (リスト表示に切り替え)
 * (変更なし)
 */
function handleTileClick(column, value) {
    currentFilters = {}; // 全てリセット
    currentFilters[column] = value; // 分類１の条件を設定
    currentLevel = 1; // 階層を1に設定 (分類１選択)
    renderContent();
}

/**
 * 👆 分類２以降のフィルタタイルがクリックされたときの処理 (フィルタ条件の追加)
 * (変更なし)
 */
function handleFilterTileClick(column, value) {
    // 既存のフィルタを維持しつつ、新しいフィルタ条件を追加
    currentFilters[column] = value;
    
    // フィルタが追加されたため、現在の階層(currentLevel)を再計算する
    let maxLevel = 0;
    CATEGORY_COLUMNS.forEach((col, index) => {
        if (currentFilters[col]) {
            // フィルタが存在する中で最も深い階層を currentLevel とする
            maxLevel = Math.max(maxLevel, index + 1);
        }
    });
    currentLevel = maxLevel;
    
    renderContent();
}


/**
 * 🗺️ パンくずリストを更新する - 旧ロジックに戻す
 */
function updateBreadcrumb() {
    breadcrumbContainer.innerHTML = '';
    
    // ★★★ 修正箇所: TOP画面の非表示/TOPへボタンのロジックを削除し、旧仕様に戻す ★★★
    
    // 1. 常に「🔍 全ての商品」という最初のクラムを作成
    createCrumb('🔍 全ての商品', 0);
    
    // 2. レベル1以降: 分類１～Nまでのフィルタ条件をパンくずリストに追加
    let filterSnapshot = {};
    for (let i = 0; i < CATEGORY_COLUMNS.length; i++) {
        const col = CATEGORY_COLUMNS[i];
        if (currentFilters[col]) {
            const value = currentFilters[col];
            filterSnapshot[col] = value;
            
            // 新しい参照を作成してフィルタを渡す
            const crumbFilters = Object.assign({}, filterSnapshot);
            
            createCrumb(value, i + 1, crumbFilters);
        }
    }
}

/**
 * 🥖 パンくずリストの要素を作成する
 * (変更なし)
 */
function createCrumb(text, level, filters = {}) {
    const crumb = document.createElement('span');
    crumb.className = 'crumb';
    crumb.textContent = text;
    crumb.dataset.level = level;
    
    // 現在の階層以下のパンくずはクリック可能
    if (level <= currentLevel) {
        crumb.addEventListener('click', () => handleCrumbClick(level, filters));
    }
    
    breadcrumbContainer.appendChild(crumb);
}

/**
 * ↩️ パンくずリストの要素がクリックされたときの処理
 * (変更なし)
 */
function handleCrumbClick(targetLevel, targetFilters) {
    currentLevel = targetLevel;
    currentFilters = {};
    
    // クリックされた階層までのフィルタ条件を復元
    const newFilters = {};
    let maxLevel = 0;
    
    for(let i=0; i<CATEGORY_COLUMNS.length; i++){
        const col = CATEGORY_COLUMNS[i];
        if(targetFilters[col]){
             newFilters[col] = targetFilters[col];
             maxLevel = Math.max(maxLevel, i + 1);
        }
    }

    currentFilters = newFilters;
    currentLevel = maxLevel;
    
    renderContent();
}