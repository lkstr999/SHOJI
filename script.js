// パスワードチェック機能は完全に削除されています。

const CSV_FILE_PATH = '商品マスタ.csv';
const NUM_CATEGORIES = 6;
let masterData = [];
// 分類１の選択値を保持するためのグローバル変数
let selectedCategory1 = '';

// --- 1. 初期化処理（認証なしで即時実行） ---
initialize();

function initialize() {
    // 1. CSVファイルを読み込み
    fetch(CSV_FILE_PATH)
        .then(response => response.text())
        .then(csvText => {
            masterData = parseCSV(csvText);
            // 2. 分類1をタイルで表示
            renderCategoryTiles(); 
            
            // 3. 分類２以降のプルダウンとリセットボタンにイベントリスナーを設定 (select-1から開始)
            for (let i = 1; i < NUM_CATEGORIES; i++) {
                const select = document.getElementById(`select-${i}`);
                if (select) { 
                    select.addEventListener('change', () => handleFilterChange(i));
                }
            }
            
            // 4. 新しいボタンのイベントリスナーを設定
            setupButtonListeners();
        })
        .catch(error => {
            console.error('CSVファイルの読み込みエラー:', error);
            document.getElementById('results').innerHTML = '<p style="color:red;">データを読み込めませんでした。CSVファイルが正しい場所にあるか、エンコードがUTF-8か確認してください。</p>';
        });
}

// ボタンのイベントリスナー設定
function setupButtonListeners() {
    // 分類１に戻るボタン
    const backButton = document.getElementById('back-to-tiles');
    if (backButton) {
        backButton.addEventListener('click', backToCategoryTiles);
    }

    // 各プルダウンのリセットボタン
    document.querySelectorAll('.reset-filter').forEach(button => {
        button.addEventListener('click', (e) => {
            // data-index="1"などの値を取得
            const index = parseInt(e.target.dataset.index); 
            resetFilter(index);
        });
    });
}

// 分類１のタイル画面に戻り、選択をリセットする
function backToCategoryTiles() {
    selectedCategory1 = ''; // 分類１の選択をリセット

    // UIの切り替え
    document.getElementById('select-filters').style.display = 'none'; // プルダウンを隠す
    document.getElementById('category-tiles').style.display = 'flex'; // タイルを表示
    
    // 分類２以降のプルダウンを空にする
    for (let i = 1; i < NUM_CATEGORIES; i++) {
        const select = document.getElementById(`select-${i}`);
        select.innerHTML = '';
        select.disabled = true;
    }

    // 結果エリアを初期メッセージに戻す
    document.getElementById('results').innerHTML = '<p>分類１を選択してください。</p>';
}

// 指定したインデックスのプルダウンをリセットする
function resetFilter(indexToReset) {
    const selectToReset = document.getElementById(`select-${indexToReset}`);
    if (selectToReset) {
        selectToReset.value = ''; // 値をリセット（---）
    }

    // 自身以降のすべてのプルダウンをリセット
    for (let i = indexToReset + 1; i < NUM_CATEGORIES; i++) {
        const nextSelect = document.getElementById(`select-${i}`);
        nextSelect.innerHTML = '<option value="">---</option>';
        nextSelect.disabled = true;
    }
    
    // フィルタリングを再実行
    updateFilters(indexToReset);
    displayResults();
}

// 分類１のタイルを生成・表示する
function renderCategoryTiles() {
    const tileContainer = document.getElementById('category-tiles');
    tileContainer.innerHTML = '<h2>分類１を選択してください</h2>';
    tileContainer.style.flexDirection = 'column'; 
    
    const categoryKey = '分類１';
    const uniqueOptions = [...new Set(masterData.map(row => row[categoryKey]))].sort();

    // タイルを格納する内部コンテナ
    const tilesWrapper = document.createElement('div');
    tilesWrapper.style.display = 'flex';
    tilesWrapper.style.flexWrap = 'wrap';
    tilesWrapper.style.gap = '15px';
    tilesWrapper.style.width = '100%';

    uniqueOptions.forEach(option => {
        if (!option) return; 

        const tile = document.createElement('div');
        tile.className = 'category-tile';
        tile.textContent = option;
        
        tile.addEventListener('click', () => handleCategoryTileClick(option));
        
        tilesWrapper.appendChild(tile);
    });

    tileContainer.appendChild(tilesWrapper);
    tileContainer.style.display = 'flex'; 
    tileContainer.style.flexDirection = 'column'; 
}

// 分類１のタイルがクリックされたときの処理
function handleCategoryTileClick(categoryName) {
    selectedCategory1 = categoryName;

    // 1. UIの切り替え
    document.getElementById('category-tiles').style.display = 'none';
    document.getElementById('select-filters').style.display = 'block'; 
    
    // 2. 分類２ (select-1) のプルダウンを更新
    updateFilters(1); 
    
    // 3. 結果を表示
    displayResults();
}

/**
 * 簡易CSVパーサ
 */
function parseCSV(csv) {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const rawHeaders = lines[0].split(',');
    const headers = rawHeaders.map(h => 
        h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, '') 
    );
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = (values[j] || '').trim().replace(/^"|"$/g, '');
        }
        data.push(row);
    }
    return data;
}


// --- 2. 絞り込み処理 ---

// 分類２以降のプルダウンが変更されたときの処理
function handleFilterChange(changedIndex) {
    // 変更されたプルダウンより後ろのものをリセット
    for (let i = changedIndex + 1; i < NUM_CATEGORIES; i++) {
        const nextSelect = document.getElementById(`select-${i}`);
        nextSelect.innerHTML = '<option value="">---</option>';
        nextSelect.disabled = true;
    }
    
    updateFilters(changedIndex + 1);
    displayResults();
}

function updateFilters(nextIndex) {
    const currentFilters = {};
    
    // 分類１の選択をフィルタに追加
    if (selectedCategory1) {
        currentFilters['分類１'] = selectedCategory1;
    }

    // 分類２以降のプルダウンの選択をフィルタに追加
    // select-1 は分類２、i=1 から i < nextIndex までループ
    for (let i = 1; i < nextIndex; i++) {
        const selectElement = document.getElementById(`select-${i}`);
        const selectedValue = selectElement.value;
        if (selectedValue) {
            currentFilters[`分類${i + 1}`] = selectedValue;
        }
    }
    
    const filteredData = masterData.filter(row => {
        return Object.keys(currentFilters).every(key => row[key] === currentFilters[key]);
    });

    const nextCategoryKey = `分類${nextIndex + 1}`; 
    const uniqueOptions = [...new Set(filteredData.map(row => row[nextCategoryKey]))].sort();

    const nextSelect = document.getElementById(`select-${nextIndex}`);
    
    // nextSelect は select-1 (分類２) から select-5 (分類６) まで
    if (nextSelect) {
        nextSelect.innerHTML = '';
        
        if (nextIndex < NUM_CATEGORIES) {
            nextSelect.disabled = false;
            nextSelect.innerHTML += `<option value="">--- 分類${nextIndex + 1}を選択 ---</option>`;
            
            uniqueOptions.forEach(option => {
                nextSelect.innerHTML += `<option value="${option}">${option || '（空欄）'}</option>`;
            });

        } else {
            nextSelect.disabled = true;
        }
    }

    if (nextIndex > NUM_CATEGORIES) {
        displayResults();
    }
}


// --- 3. 結果表示処理 ---

function displayResults() {
    const resultsDiv = document.getElementById('results');
    
    const finalFilters = {};

    // 分類１の選択をフィルタに追加
    if (selectedCategory1) {
        finalFilters['分類１'] = selectedCategory1;
    }
    
    // 分類２以降のプルダウンの選択をフィルタに追加 (select-1からselect-5まで)
    for (let i = 1; i < NUM_CATEGORIES; i++) {
        const selectElement = document.getElementById(`select-${i}`);
        const selectedValue = selectElement.value;
        if (selectedValue) {
            finalFilters[`分類${i + 1}`] = selectedValue;
        }
    }
    
    const finalFilteredData = masterData.filter(row => {
        // 分類１が選択されていない場合は、データを返さない
        if (!selectedCategory1) {
             return false; 
        }
        return Object.keys(finalFilters).every(key => row[key] === finalFilters[key]);
    });

    if (finalFilteredData.length === 0) {
        // 分類１が選択されている場合のみ、「該当なし」を表示
        if (selectedCategory1) {
             resultsDiv.innerHTML = '<p>該当する商品が見つかりません。</p>';
        } else {
             resultsDiv.innerHTML = '<p>分類１を選択してください。</p>';
        }
        return;
    }
    
    let html = `<p><strong>${finalFilteredData.length}件</strong> の商品が見つかりました。</p>
        <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>分類１</th><th>分類２</th><th>分類３</th><th>分類４</th><th>分類５</th><th>分類６</th><th>品番</th><th>色</th>
                </tr>
            </thead>
            <tbody>`;

    finalFilteredData.forEach(row => {
        html += `
            <tr>
                <td>${row['分類１']}</td>
                <td>${row['分類２']}</td>
                <td>${row['分類３']}</td>
                <td>${row['分類４']}</td>
                <td>${row['分類５']}</td>
                <td>${row['分類６']}</td>
                <td><strong>${row['品番']}</strong></td>
                <td>${row['色']}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    
    resultsDiv.innerHTML = html;
}