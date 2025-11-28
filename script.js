// パスワードチェック機能は完全に削除されています。

// ★★★ 修正箇所: GitHub Pages対応のため、リポジトリ名「/SHOJI/」をパスに追加 ★★★
const CSV_FILE_PATH = '/SHOJI/商品マスタ.csv';

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
        .then(response => {
            if (!response.ok) {
                // HTTPエラーの場合
                throw new Error(`CSVファイルが見つかりません: ${response.status} ${response.statusText}. パス: ${CSV_FILE_PATH}`);
            }
            return response.text();
        })
        .then(csvText => {
            masterData = parseCSV(csvText);
            // 2. 分類1のボタンリストを初期化
            updateFilters(0);
        })
        .catch(error => {
            console.error('CSVファイルの読み込みエラー:', error);
            resultsDiv.innerHTML = `<p style="color:red;">データを読み込めませんでした。CSVファイルが正しい場所にあるか、エンコードがUTF-8か確認してください。 (エラー詳細: ${error.message})</p>`;
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
    
    // ヘッダーを抽出
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    // データ行を処理（引用符で囲まれた値に対応するための簡易パーサ）
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        const row = {};
        let parts = [];
        let inQuotes = false;
        let start = 0;

        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
                inQuotes = !inQuotes;
            } else if (line[j] === ',' && !inQuotes) {
                // カンマが見つかり、かつ引用符の中にいない場合
                parts.push(line.substring(start, j).trim().replace(/^"|"$/g, ''));
                start = j + 1;
            }
        }
        // 最後のフィールドを追加
        parts.push(line.substring(start).trim().replace(/^"|"$/g, ''));

        for (let j = 0; j < headers.length; j++) {
            // parts[j]がない場合 (末尾のカンマなど) は空文字列を設定
            row[headers[j]] = (parts[j] || '').trim();
        }
        data.push(row);
    }
    
    return data;
}

// --- 2. フィルタリングとUIの更新 ---

/**
 * ボタンクリック時の処理
 * @param {number} categoryIndex - クリックされた分類のインデックス (0-5)
 * @param {string} value - 選択された値
 */
function handleTileClick(categoryIndex, value) {
    // 選択状態を更新
    selectedFilters[categoryIndex] = value;

    // それ以降の分類の選択をリセット
    for (let i = categoryIndex + 1; i < NUM_CATEGORIES; i++) {
        selectedFilters[i] = null;
    }

    // 次の分類のボタンリストを更新
    updateFilters(categoryIndex + 1);
    
    // 結果を表示
    displayResults();
    
    // リセットボタンの表示/非表示を更新
    updateResetButtonVisibility();
}

/**
 * 指定したインデックス以降の分類のボタンリストを動的に生成・表示する
 * @param {number} nextIndex - 次に表示する分類のインデックス (0-5)
 */
function updateFilters(nextIndex) {
    // 現在のフィルタ条件を構築
    const currentFilters = {};
    for (let i = 0; i < nextIndex; i++) {
        if (selectedFilters[i]) {
            currentFilters[`分類${i + 1}`] = selectedFilters[i];
        }
    }
    
    // 全ての分類コンテナを更新（表示/非表示とボタンリスト）
    for (let i = 0; i < NUM_CATEGORIES; i++) {
        const categoryId = `category-${i}`;
        let container = document.getElementById(categoryId);

        // コンテナが存在しない場合は作成
        if (!container) {
            container = document.createElement('div');
            container.id = categoryId;
            container.classList.add('category-group');
            categoryContainer.appendChild(container);
        }

        // nextIndexより前の分類はすでに選択済みなので、ボタンは非表示にする
        if (i < nextIndex) {
            container.style.display = 'none';
            continue; // 次のループへ
        }
        
        // 次に表示すべき分類（i == nextIndex）の処理
        if (i === nextIndex) {
            // 条件に一致するユニークな値を抽出
            const categoryName = `分類${i + 1}`;
            const uniqueValues = new Set();
            
            masterData.forEach(row => {
                let matches = true;
                // 現在選択されているフィルタすべてに一致するか確認
                for (const key in currentFilters) {
                    if (row[key] !== currentFilters[key]) {
                        matches = false;
                        break;
                    }
                }
                
                // 現在のフィルタに一致し、かつ値が存在する場合のみ追加
                if (matches && row[categoryName] !== undefined && row[categoryName] !== '') {
                    uniqueValues.add(row[categoryName]);
                }
            });

            // ユニークな値がない、または最終分類まで選択済みの場合は終了
            if (uniqueValues.size === 0) {
                container.style.display = 'none';
                displayResults(); // 最終結果を表示 (該当なしの場合も処理)
                return; // 処理を終了し、それ以降の分類は表示しない
            }

            // ボタンHTMLを生成
            let html = `<h3>${categoryName}を選択:</h3><div class="tile-row">`;
            
            Array.from(uniqueValues).sort().forEach(value => {
                const isSelected = selectedFilters[i] === value;
                const selectedClass = isSelected ? ' selected' : '';
                
                // HTML属性値のXSS対策は省略
                html += `<button class="category-tile${selectedClass}" data-value="${value}" data-index="${i}">${value}</button>`;
            });
            
            html += `</div>`;
            
            // コンテナを表示し、ボタンを挿入
            container.innerHTML = html;
            container.style.display = 'block';

            // ボタンにイベントリスナーを設定
            container.querySelectorAll('.category-tile').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    const value = e.target.dataset.value;
                    handleTileClick(index, value);
                });
            });
        }
        
        // nextIndexより後の分類は、まだ選択できないので非表示にする
        if (i > nextIndex) {
            container.style.display = 'none';
        }
    }
    
    // フィルタリング結果を表示（ボタンの表示更新とは別に行う）
    displayResults();
    updateResetButtonVisibility();
}

/**
 * 最終結果を表示する
 */
function displayResults() {
    // フィルタリング条件を構築
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
    // ユーザーがアップロードしたCSVには「品番」と「色」の列が含まれていると仮定
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
        // 分類に該当データがない場合は空白を表示
        const col1 = row['分類１'] || '';
        const col2 = row['分類２'] || '';
        const col3 = row['分類３'] || '';
        const col4 = row['分類４'] || '';
        const col5 = row['分類５'] || '';
        const col6 = row['分類６'] || '';

        html += `
            <tr>
                <td>${col1}</td>
                <td>${col2}</td>
                <td>${col3}</td>
                <td>${col4}</td>
                <td>${col5}</td>
                <td>${col6}</td>
                <td><strong>${row['品番'] || ''}</strong></td>
                <td>${row['色'] || ''}</td>
            </tr>`;
    });
    
    html += `</tbody></table></div>`;
    resultsDiv.innerHTML = html;
}

/**
 * すべてのフィルタをリセットし、UIを初期状態に戻す
 */
function resetAll() {
    selectedFilters.fill(null);
    updateFilters(0);
    updateResetButtonVisibility();
    resultsDiv.innerHTML = '<p>分類１を選択してください。</p>';
    // 全ての分類コンテナを非表示に戻す
    for (let i = 1; i < NUM_CATEGORIES; i++) {
        const container = document.getElementById(`category-${i}`);
        if (container) {
            container.style.display = 'none';
        }
    }
}

/**
 * リセットボタンの表示/非表示を切り替える
 */
function updateResetButtonVisibility() {
    const isAnySelected = selectedFilters.some(filter => filter !== null);
    resetButton.style.display = isAnySelected ? 'block' : 'none';
}