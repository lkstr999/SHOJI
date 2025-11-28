// パスワードチェック機能は完全に削除されています。

const CSV_FILE_PATH = '商品マスタ.csv';
const NUM_CATEGORIES = 6;
let masterData = [];

// ★★★ 変更: 現在の選択状態を保持する配列 (index 0=分類1, index 5=分類6) ★★★
// null: 未選択, '値': 選択済み
let selectedFilters = new Array(NUM_CATEGORIES).fill(null); 

const categoryContainer = document.getElementById('category-containers');
const resultsDiv = document.getElementById('results');
const resetButton = document.getElementById('reset-all');

// --- 1. 初期化処理（認証なしで即時実行） ---
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

    // ★★★ 変更: リセットボタンにイベントリスナーを設定 ★★★
    resetButton.addEventListener('click', resetAll);
}

/**
 * 簡易CSVパーサ（変更なし）
 */
function parseCSV(csv) {
    // ... (関数の中身は変更なし) ...
    const lines = csv.split(/\r\n|\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    // ヘッダーが8つあることを確認 (分類1～6, 品番, 色)
    if (headers.length < 8) {
        console.error('CSVファイルのヘッダー数が不足しています。');
        return [];
    }

    // ★★★ ループ開始 ★★★
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // 正規表現を使ってカンマと二重引用符に対応した分割
        const values = line.match(/(".*?"|[^",\r\n]+)(?=\s*,|\s*$)/g);
        if (!values || values.length !== headers.length) continue; 

        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = (values[j] || '').trim().replace(/^"|"$/g, '');
        }
        data.push(row);
    }
    // ★★★ ループここまで ★★★

    return data;
}


// --- 2. 絞り込み処理 ---

/**
 * ★★★ 変更: ボタンをクリックしたときの処理 ★★★
 * * @param {number} changedIndex - 選択された分類のインデックス (0～5)
 * @param {string} value - 選択された値
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
 * 次の分類（nextIndex）のボタンリストを生成して表示する
 * * @param {number} nextIndex - 次に表示する分類のインデックス (0～5)
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

    // 表示する分類のボタンリストを生成
    let html = '';
    
    // 現在選択されているフィルタまでを再表示
    for (let i = 0; i < nextIndex; i++) {
        if (selectedFilters[i]) {
            const categoryName = `分類${i + 1}`;
            const selectedValue = selectedFilters[i];

            html += `
                <div id="category-${i}" class="filter-category-container">
                    <p class="category-title">${categoryName}: <span>選択済み</span></p>
                    <div class="tile-list" data-index="${i}">
                        <button class="category-tile selected" data-value="${selectedValue}">${selectedValue}</button>
                    </div>
                </div>
            `;
        }
    }

    // 次の分類（nextIndex）のボタンリストを生成
    if (nextIndex < NUM_CATEGORIES) {
        const nextCategoryName = `分類${nextIndex + 1}`;
        const uniqueValues = new Set(filteredData.map(row => row[nextCategoryName]).filter(v => v && v.trim() !== ''));

        if (uniqueValues.size > 0) {
            html += `
                <div id="category-${nextIndex}" class="filter-category-container">
                    <p class="category-title">${nextCategoryName}を選択してください</p>
                    <div class="tile-list" data-index="${nextIndex}">
            `;
            
            // ユニークな値ごとにボタンを生成
            uniqueValues.forEach(value => {
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
    
    // ★★★ 変更: 新しく生成されたボタンにクリックイベントを設定 ★★★
    document.querySelectorAll('.tile-list button').forEach(button => {
        // 既に選択済みのボタン（selectedクラスを持つボタン）にはイベントを再設定しない
        if (!button.classList.contains('selected')) {
            const index = parseInt(button.dataset.index);
            const value = button.dataset.value;
            button.addEventListener('click', () => handleTileClick(index, value));
        }
    });

    // リセットボタンの表示/非表示を制御
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
    
    // ★★★ 変更: selectedFilters配列からフィルタリング条件を取得 ★★★
    const finalFilters = {};
    for (let i = 0; i < NUM_CATEGORIES; i++) {
        if (selectedFilters[i]) {
            finalFilters[`分類${i + 1}`] = selectedFilters[i];
        }
    }
    
    // フィルタ条件が一つも選択されていない場合は、初期メッセージを表示
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