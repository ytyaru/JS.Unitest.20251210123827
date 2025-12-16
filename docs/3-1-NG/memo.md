# 外部参照した`<script>`のテキストデータは取得できない

## js script要素をDOMで動的生成したとき読み込んだソースコードファイルの中身をtextContentで取得する方法

## AI による概要

外部ソースファイルを読み込んだ
script要素のコード内容を、DOM操作で直接textContentやinnerHTMLを使って取得することはできません。src属性を使って外部ファイルを読み込んだ場合、ブラウザはそのファイルの内容をダウンロードして実行しますが、セキュリティとパフォーマンスの理由から、そのソースコード自体はDOM要素のプロパティとして公開されません。 
ただし、いくつかの代替手段があります。

代替手段
1. fetch() API または XMLHttpRequest を使用する 
スクリプトファイルの内容を取得する最も一般的な方法は、別の非同期リクエスト（fetch APIなど）でファイル自体を再度取得することです。これにより、ファイルのテキストコンテンツを文字列として取得できます。 
javascript

async function getScriptContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const scriptText = await response.text();
        console.log(scriptText); // ここにソースコードの内容が表示されます
        return scriptText;
    } catch (error) {
        console.error("スクリプトの取得中にエラーが発生しました:", error);
    }
}

// 使用例
const scriptUrl = 'path/to/your/script.js';
getScriptContent(scriptUrl);

この方法では、同一オリジンポリシー（CORS）に注意が必要です。異なるドメインのファイルを取得する場合、サーバー側で適切なCORSヘッダーが設定されている必要があります。
2. スクリプトタグ内に直接コードを記述する
外部ファイルとしてではなく、スクリプトの内容を文字列として保持しておき、それをscript要素のtextContentに設定して実行する方法です。この場合、実行後にtextContentから内容を読み取ることができます。
javascript

const scriptCode = 'console.log("Hello, world!");';

const script = document.createElement('script');
script.textContent = scriptCode; // contentにコードを直接設定
document.head.appendChild(script);

// 実行後、textContentから内容を取得できる
console.log(script.textContent);

3. 開発者ツールを使用する（手動での確認） 
ブラウザの開発者ツール（F12キーで開く）を使えば、読み込まれたスクリプトのソースコードを確認できます。「Elements」タブで該当の<script>要素を調べたり、「Sources」タブでファイルの内容を閲覧したりできます。これはデバッグ目的の場合に有効です。 
結論
src属性で外部ファイルを読み込んだ場合、JavaScriptからその<script>要素のtextContentプロパティ経由でソースコードを取得することはできません。ソースコードをプログラム的に取得したい場合は、fetch() APIなどを使ってファイル自体をHTTPリクエストで取得する必要があります。 

# 今回の要件には合わない

　HTTPSローカルサーバが必要になってしまうのは困る。気軽に`file://`でテストしたいから。

# どうするか

　スタックトレースでファイル名と行列数だけを表示する。その箇所に相当するコードは表示不能として諦める。またはコールバック関数として渡したなら、それを文字列化することも可能。但しその場合、該当箇所の文字列を取得する処理が非常に複雑になる。

