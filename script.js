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
            // 2. すべてのカテゴリコンテナをHTMLに生成
            for (let i = 0; i < NUM_CATEGORIES; i++) {
                categoryContainer.appendChild(createCategoryContainer(i));
            }
            // 3. 分類1のボタンリストを初期化
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
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    // ヘッダー行を処理
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // CSVのパース処理を強化: カンマ区切りとクォート処理に対応
        const values = [];
        let inQuotes = false;
        let currentValue = '';

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue); // 最後の値を追加
        
        const row = {};
        for (let j = 0; j < headers.length && j < values.length; j++) {
            // 値のトリムとクォート除去
            row[headers[j]] = (values[j] || '').trim().replace(/^"|"$/g, '');
        }
        data.push(row);
    }
    
    return data;
}

// --- 2. HTML要素生成とイベント処理 ---

/**
 * 各分類のコンテナ要素 (タイトルとボタンリスト) を生成する
 */
function createCategoryContainer(index) {
    const container = document.createElement('div');
    container.id = `category-container-${index}`;
    container.classList.add('category-container');
    container.classList.add('hidden'); // 初期状態では隠す

    const title = document.createElement('h3');
    title.textContent = `分類${index + 1}`;
    container.appendChild(title);

    const buttonList = document.createElement('div');
    buttonList.id = `button-list-${index}`;
    buttonList.classList.add('button-list');
    container.appendChild(buttonList);

    return container;
}


/**
 * フィルタボタンがクリックされたときの処理
 * @param {number} changedIndex - 変更があった分類のインデックス (0-5)
 * @param {string} value - 選択された値
 */
function handleButtonClick(changedIndex, value) {
    const currentValue = selectedFilters[changedIndex];

    if (currentValue === value) {
        // 同じボタンがクリックされた場合は、選択を解除
        selectedFilters[changedIndex] = null;
    } else {
        // 別のボタンがクリックされた場合は、選択状態を更新
        selectedFilters[changedIndex] = value;
    }

    // 変更された分類以降のフィルタをリセット（ボタンの選択状態もリセットするためnullに）
    for (let i = changedIndex + 1; i < NUM_CATEGORIES; i++) {
        selectedFilters[i] = null;
    }

    // 次の分類のフィルタを更新（ボタンを再描画）
    updateFilters(changedIndex + 1);

    // 選択された分類のボタンの見た目を更新
    updateButtonVisuals(changedIndex);

    // 結果の表示を更新
    displayResults();
}

/**
 * 特定の分類のボタンの選択状態を更新する
 * @param {number} index - 更新する分類のインデックス (0-5)
 */
function updateButtonVisuals(index) {
    const buttonList = document.getElementById(`button-list-${index}`);
    if (!buttonList) return;

    // 現在の選択値
    const selectedValue = selectedFilters[index];
    
    // すべてのボタンの選択状態を更新
    buttonList.querySelectorAll('.filter-button').forEach(button => {
        if (button.textContent === selectedValue) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
}

/**
 * フィルタと結果をすべてリセットする
 */
function resetAll() {
    selectedFilters.fill(null); // フィルタをリセット

    // すべてのカテゴリコンテナを非表示に戻す
    for (let i = 1; i < NUM_CATEGORIES; i++) {
        document.getElementById(`category-container-${i}`).classList.add('hidden');
        document.getElementById(`button-list-${i}`).innerHTML = ''; // ボタンもクリア
    }
    
    // 分類1を再描画して選択を解除した状態にする
    updateFilters(0);

    // リセットボタンを非表示にする
    resetButton.style.display = 'none'; 
    
    // 結果エリアを初期表示に戻す
    resultsDiv.innerHTML = '<p>分類１を選択してください。</p>';
}

// --- 3. フィルタ更新ロジック ---

/**
 * 次の分類のボタンリストを更新する
 * @param {number} nextIndex - 次にフィルタを更新する分類のインデックス (0-5)
 */
function updateFilters(nextIndex) {
    if (nextIndex > NUM_CATEGORIES) return;

    // 現在の選択状態を取得 (nextIndexまでのフィルタを適用)
    const currentFilters = {};
    for (let i = 0; i < nextIndex; i++) {
        if (selectedFilters[i] !== null) {
            currentFilters[`分類${i + 1}`] = selectedFilters[i];
        }
    }

    // 次の分類以降のコンテナとボタンリストをクリア
    for (let i = nextIndex; i < NUM_CATEGORIES; i++) {
        const container = document.getElementById(`category-container-${i}`);
        const buttonList = document.getElementById(`button-list-${i}`);
        
        if (container) container.classList.add('hidden');
        if (buttonList) buttonList.innerHTML = '';
        
        // nextIndex以降のselectedFiltersをリセット
        if(i > nextIndex - 1) {
            selectedFilters[i] = null;
        }
    }

    // nextIndexが有効な範囲で、ボタンを生成
    if (nextIndex < NUM_CATEGORIES) {
        // 現在のフィルタ条件でデータを絞り込む
        const filteredData = masterData.filter(row => {
            return Object.keys(currentFilters).every(key => row[key] === currentFilters[key]);
        });

        // 次の分類 (分類N) のユニークな値を取得
        const nextCategoryKey = `分類${nextIndex + 1}`;
        // 空欄を除去
        const uniqueValues = [...new Set(filteredData.map(row => row[nextCategoryKey]))].filter(v => v !== ''); 
        uniqueValues.sort(); // ソート

        const nextContainer = document.getElementById(`category-container-${nextIndex}`);
        const nextButtonList = document.getElementById(`button-list-${nextIndex}`);

        if (uniqueValues.length > 0) {
            // ボタンを生成
            uniqueValues.forEach(value => {
                const button = document.createElement('button');
                button.classList.add('filter-button');
                
                // 選択状態の復元
                if (selectedFilters[nextIndex] === value) {
                    button.classList.add('selected'); 
                }
                
                button.textContent = value;
                button.addEventListener('click', () => handleButtonClick(nextIndex, value));
                nextButtonList.appendChild(button);
            });

            nextContainer.classList.remove('hidden'); // コンテナを表示
        } else {
            nextContainer.classList.add('hidden'); // ボタンがない場合はコンテナを非表示
        }
    }

    // リセットボタンの表示/非表示を更新
    updateResetButtonVisibility();
}


// --- 4. 結果表示ロジック ---

function displayResults() {
    const finalFilters = {};
    let isFiltered = false;
    for (let i = 0; i < NUM_CATEGORIES; i++) {
        if (selectedFilters[i] !== null) {
            finalFilters[`分類${i + 1}`] = selectedFilters[i];
            isFiltered = true;
        }
    }
    
    // 条件未選択時
    if (!isFiltered) {
        resultsDiv.innerHTML = '<p>分類１を選択してください。</p>';
        updateResetButtonVisibility();
        return;
    }

    // 最終フィルタリング
    const finalFilteredData = masterData.filter(row => {
        return Object.keys(finalFilters).every(key => row[key] === finalFilters[key]);
    });

    if (finalFilteredData.length === 0) {
        resultsDiv.innerHTML = '<p>該当する商品が見つかりません。</p>';
        updateResetButtonVisibility();
        return;
    }
    
    // 結果をテーブルで表示
    // CSVヘッダー（品番、色、備考1、備考2）に合わせて<th>タグを調整してください。
    let html = `<p><strong>${finalFilteredData.length}件</strong> の商品が見つかりました。</p>
        <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>分類１</th><th>分類２</th><th>分類３</th><th>分類４</th><th>分類５</th><th>分類６</th><th>品番</th><th>色</th><th>備考１</th><th>備考２</th>
                </tr>
            </thead>
            <tbody>`;

    finalFilteredData.forEach(row => {
        // row['色']、row['備考１']、row['備考２']がCSVに存在しない場合は空文字を表示
        html += `
            <tr>
                <td>${row['分類１'] || ''}</td>
                <td>${row['分類２'] || ''}</td>
                <td>${row['分類３'] || ''}</td>
                <td>${row['分類４'] || ''}</td>
                <td>${row['分類５'] || ''}</td>
                <td>${row['分類６'] || ''}</td>
                <td><strong>${row['品番'] || ''}</strong></td>
                <td>${row['色'] || ''}</td>
                <td>${row['備考１'] || ''}</td>
                <td>${row['備考２'] || ''}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        </div>
    `;

    resultsDiv.innerHTML = html;
    updateResetButtonVisibility();
}

/**
 * 選択中のフィルタがある場合にリセットボタンを表示する
 */
function updateResetButtonVisibility() {
    // 選択中のフィルタが一つでもあればtrue
    const isAnyFilterSelected = selectedFilters.some(filter => filter !== null); 
    resetButton.style.display = isAnyFilterSelected ? 'block' : 'none';
}