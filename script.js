// パスワードチェック機能は完全に削除されています。

const CSV_FILE_PATH = '商品マスタ.csv';
const NUM_CATEGORIES = 6;
let masterData = [];

// 現在の選択状態を保持する配列 (index 0=分類1, index 5=分類6)
// null: 未選択, '値': 選択済み
let selectedFilters = new Array(NUM_CATEGORIES).fill(null); 

const categoryContainer = document.getElementById('category-containers');
const resultsDiv = document.getElementById('results');
const resetButton = document.getElementById('reset-all');

// --- 1. 初期化処理 ---
initialize();

function initialize() {
    // 1. CSVファイルを読み込み
    fetch(CSV_FILE_PATH)
        .then(response => response.text())
        .then(csvText => {
            masterData = parseCSV(csvText);
            // 2. 分類1のボタンリストを初期化
            updateFilters(0);
        })
        .catch(error => {
            console.error('CSVファイルの読み込みエラー:', error);
            resultsDiv.innerHTML = '<p style="color:red;">データを読み込めませんでした。CSVファイルが正しい場所にあるか、エンコードがUTF-8か確認してください。</p>';
        });

    // リセットボタンにイベントリスナーを設定
    resetButton.addEventListener('click', resetAll);
}

/**
 * 簡易CSVパーサ (修正済み: 空欄があっても正しく読み込む)
 */
function parseCSV(csv) {
    // 改行コード（\r\nと\n）の両方に対応して行分割
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    // 1行目をヘッダーとして抽出
    const rawHeaders = lines[0].split(',');
    const headers = rawHeaders.map(h => 
        h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, '') 
    );
    
    const data = [];
    
    // データ格納ループ
    for (let i = 1; i < lines.length; i++) {
        // 単純なsplit(',')に戻すことで、空欄(,,)も正しく空文字として取得します
        const values = lines[i].split(',');
        
        // 列数が足りない行があっても、可能な限り読み込むように柔軟に対応
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = (values[j] || '').trim().replace(/^"|"$/g, '');
        }
        data.push(row);
    }
    
    return data;
}


// --- 2. 絞り込み処理 ---

/**
 * ボタンをクリックしたときの処理
 */
function handleTileClick(changedIndex, value) {
    
    // 既に選択されていた値と同じ場合は、リセットとして扱う
    if (selectedFilters[changedIndex] === value) {
        selectedFilters[changedIndex] = null;
    } else {
        // 新しい値を選択
        selectedFilters[changedIndex] = value;
    }

    // 選択されたインデックスより後の分類の選択状態をすべてリセットする
    for (let i = changedIndex + 1; i < NUM_CATEGORIES; i++) {
        selectedFilters[i] = null;
    }

    // 次のフィルタを更新・表示する
    updateFilters(changedIndex + 1);
    
    // 結果を表示する
    displayResults();
}

/**
 * すべての分類の選択をリセット
 */
function resetAll() {
    selectedFilters.fill(null);
    updateFilters(0);
    resetButton.style.display = 'none';
    resultsDiv.innerHTML = '<p>分類１を選択してください。</p>';
}

/**
 * 分類のボタンリストを生成して表示する
 */
function updateFilters(nextIndex) {
    
    // 現在の選択状態に基づいてフィルタリング
    const currentFilters = {};
    for (let i = 0; i < nextIndex; i++) {
        if (selectedFilters[i]) {
            currentFilters[`分類${i + 1}`] = selectedFilters[i];
        }
    }
    
    // フィルタリング対象のデータ
    const filteredData = masterData.filter(row => {
        return Object.keys(currentFilters).every(key => row[key] === currentFilters[key]);
    });

    // HTMLを生成
    let html = '';
    
    // 1. 既に選択済みの分類を表示（クリックで変更可能）
    for (let i = 0; i < nextIndex; i++) {
        if (selectedFilters[i]) {
            const categoryName = `分類${i + 1}`;
            const selectedValue = selectedFilters[i];

            html += `
                <div id="category-${i}" class="filter-category-container">
                    <p class="category-title">${categoryName}</p>
                    <div class="tile-list" data-index="${i}">
                        <button class="category-tile selected" data-value="${selectedValue}">${selectedValue}</button>
                    </div>
                </div>
            `;
        }
    }

    // 2. 次に選択すべき分類を表示
    if (nextIndex < NUM_CATEGORIES) {
        const nextCategoryName = `分類${nextIndex + 1}`;
        // ユニークな値を取得（空欄を除く）
        const uniqueValues = new Set(filteredData.map(row => row[nextCategoryName]).filter(v => v && v.trim() !== ''));

        if (uniqueValues.size > 0) {
            html += `
                <div id="category-${nextIndex}" class="filter-category-container">
                    <p class="category-title">${nextCategoryName}を選択</p>
                    <div class="tile-list" data-index="${nextIndex}">
            `;
            
            // 値のリストをソートしてボタンを生成
            [...uniqueValues].sort().forEach(value => {
                html += `<button class="category-tile" data-index="${nextIndex}" data-value="${value}">${value}</button>`;
            });

            html += `
                    </div>
                </div>
            `;
        }
    }
    
    // DOMの更新
    categoryContainer.innerHTML = html;
    
    // 新しく生成されたボタンにクリックイベントを設定
    document.querySelectorAll('.tile-list button').forEach(button => {
        const index = parseInt(button.dataset.index);
        const value = button.dataset.value;
        button.addEventListener('click', () => handleTileClick(index, value));
    });

    // リセットボタンの表示制御
    if (selectedFilters.some(val => val !== null)) {
        resetButton.style.display = 'block';
    } else {
        resetButton.style.display = 'none';
    }
}

/**
 * 最終的な結果を表示する
 */
function displayResults() {
    
    const finalFilters = {};
    for (let i = 0; i < NUM_CATEGORIES; i++) {
        if (selectedFilters[i]) {
            finalFilters[`分類${i + 1}`] = selectedFilters[i];
        }
    }
    
    // 条件未選択時
    if (Object.keys(finalFilters).length === 0) {
        resultsDiv.innerHTML = '<p>分類１を選択してください。</p>';
        return;
    }

    // 最終フィルタリング
    const finalFilteredData = masterData.filter(row => {
        return Object.keys(finalFilters).every(key => row[key] === finalFilters[key]);
    });

    if (finalFilteredData.length === 0) {
        resultsDiv.innerHTML = '<p>該当する商品が見つかりません。</p>';
        return;
    }
    
    // 結果をテーブルで表示
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

    html += `
            </tbody>
        </table>
        </div>
    `;

    resultsDiv.innerHTML = html;
}