const CSV_FILE_PATH = '商品マスタ.csv';
const NUM_CATEGORIES = 6; // 分類１～分類６まで
let masterData = []; // 全CSVデータを保持する配列

// --- 1. 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    fetch(CSV_FILE_PATH)
        .then(response => response.text())
        .then(csvText => {
            masterData = parseCSV(csvText);
            // 初期状態では、分類1のプルダウンだけを有効にする
            updateFilters(0);
        })
        .catch(error => {
            console.error('CSVファイルの読み込みエラー:', error);
            document.getElementById('results').innerHTML = '<p style="color:red;">データを読み込めませんでした。</p>';
        });

    // すべてのプルダウンにイベントリスナーを設定
    for (let i = 0; i < NUM_CATEGORIES; i++) {
        const select = document.getElementById(`select-${i}`);
        select.addEventListener('change', () => handleFilterChange(i));
    }
});

/**
 * 簡易CSVパーサ（標準機能のみ）
 * @param {string} csv - CSVテキスト全体
 * @returns {Array<Object>} ヘッダーをキーとしたオブジェクトの配列
 */
function parseCSV(csv) {
    const lines = csv.split('\r\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    // ヘッダーを抽出（分類１,分類２,...品番,色）
    const headers = lines[0].split(',');
    
    // データ行をオブジェクトに変換
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = (values[j] || '').trim().replace(/^"|"$/g, ''); // 空値と引用符の処理
        }
        data.push(row);
    }
    return data;
}


// --- 2. 絞り込み処理 ---

/**
 * フィルターが変更されたときの処理
 * @param {number} changedIndex - 変更されたプルダウンのインデックス (0 for 分類1, 1 for 分類2, ...)
 */
function handleFilterChange(changedIndex) {
    // 変更された以降のプルダウンをリセット・無効化
    for (let i = changedIndex + 1; i < NUM_CATEGORIES; i++) {
        const nextSelect = document.getElementById(`select-${i}`);
        nextSelect.innerHTML = '<option value="">---</option>';
        nextSelect.disabled = true;
    }
    
    // 次の分類のプルダウンを更新
    updateFilters(changedIndex + 1);

    // 最終結果を表示
    displayResults();
}

/**
 * 次の分類のプルダウンオプションを生成し、有効化する
 * @param {number} nextIndex - 更新するプルダウンのインデックス
 */
function updateFilters(nextIndex) {
    // 現在までに選択されている条件を取得
    const currentFilters = {};
    for (let i = 0; i < nextIndex; i++) {
        const selectElement = document.getElementById(`select-${i}`);
        const selectedValue = selectElement.value;
        if (selectedValue) {
            currentFilters[`分類${i + 1}`] = selectedValue;
        }
    }
    
    // 現在の条件に一致するデータのみをフィルタリング
    const filteredData = masterData.filter(row => {
        return Object.keys(currentFilters).every(key => row[key] === currentFilters[key]);
    });

    // プルダウンを更新する対象の列名
    const nextCategoryKey = `分類${nextIndex + 1}`;
    
    // 次のプルダウンに表示すべき選択肢（重複なし）を抽出
    const uniqueOptions = [...new Set(filteredData.map(row => row[nextCategoryKey]))].sort();

    // 次のプルダウン要素を取得
    const nextSelect = document.getElementById(`select-${nextIndex}`);
    
    // プルダウンを初期化
    nextSelect.innerHTML = '';
    
    // オプションを追加
    if (nextIndex < NUM_CATEGORIES) {
        nextSelect.disabled = false;
        nextSelect.innerHTML += `<option value="">--- 分類${nextIndex + 1}を選択 ---</option>`;
        uniqueOptions.forEach(option => {
            if (option) {
                 nextSelect.innerHTML += `<option value="${option}">${option}</option>`;
            }
        });
    } else {
        // 分類６まで選択したら、次の分類はないので無効化
        nextSelect.disabled = true;
    }

    // 分類1の初期ロード時、または最終分類まで選択した後に結果を表示
    if (nextIndex === 0 || nextIndex > NUM_CATEGORIES) {
        displayResults();
    }
}


// --- 3. 結果表示処理 ---

/**
 * 現在の条件でフィルタリングされた最終結果をHTMLに表示する
 */
function displayResults() {
    const resultsDiv = document.getElementById('results');
    
    // 全てのプルダウンで選択されている条件を取得
    const finalFilters = {};
    for (let i = 0; i < NUM_CATEGORIES; i++) {
        const selectElement = document.getElementById(`select-${i}`);
        const selectedValue = selectElement.value;
        if (selectedValue) {
            finalFilters[`分類${i + 1}`] = selectedValue;
        }
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
    let html = `
        <p><strong>${finalFilteredData.length}件</strong> の商品が見つかりました。</p>
        <table>
            <thead>
                <tr>
                    <th>分類１</th><th>分類２</th><th>分類３</th><th>分類４</th><th>分類５</th><th>分類６</th><th>品番</th><th>色</th>
                </tr>
            </thead>
            <tbody>
    `;

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
    `;
    
    resultsDiv.innerHTML = html;
}