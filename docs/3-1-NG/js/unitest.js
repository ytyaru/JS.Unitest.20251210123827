(function(){
/*
<script src="unitest.js"></script>
<script defer>
Unitest.darked; // ダークモード
Unitest.lighted; // ライトモード
Unitest.automated; // 実行した時刻で自動的にダーク／ライトを設定する（デフォルト）
Unitest.assert((a)=>{
    a.t(true);
    a.t(async()=>true);
    a.f(false);
    a.f(async()=>false);
    a.e(Error, 'message', ()=>{throw new Error(`message`)});
    a.e(Error, 'message', async()=>{throw new Error(`message`)});
    // 複数テストケースがある場合
    a.t([0,1], (...args)=>'number'===typeof args[0]);
    a.t([['A',0],['B',1]], (...args)=>1===(new Map([args])).size);
    a.t(()=>[['A',0],['B',1]], (...args)=>1===(new Map([args])).size);
    a.t(async()=>[['A',0],['B',1]], async(...args)=>1===(new Map([args])).size);
    a.e(TypeError, 'message', [0,1], (...args)=>{throw new TypeError('message')});
    a.e(TypeError, 'message', ()=>[0,1], (...args)=>{throw new TypeError('message')});
    a.e(TypeError, 'message', async()=>[0,1], async(...args)=>{throw new TypeError('message')});
});
</script>
*/
//const ROOT_FILE_PATH = location.pathname; // 呼出元HTMLファイルのフルパス。/tmp/work/JS.Unitest.20251210123827/docs/3/index.html
const ROOT_FILE_PATH = location.href; // 呼出元HTMLファイルのフルパス。file:///tmp/work/JS.Unitest.20251210123827/docs/3/index.html
const ROOT_DIR_PATH = ROOT_FILE_PATH.substring(0, ROOT_FILE_PATH.lastIndexOf('/')); // 呼出元HTMLファイルが存在するディレクトリ絶対パス
const THIS_FILE_PATH = document.currentScript.src; // index.html <scrpt src="THIS">
const THIS_FILE_NAME = THIS_FILE_PATH.substring(THIS_FILE_PATH.lastIndexOf('/') + 1) ?? 'unitest.js:';
class TestError extends Error {
    constructor(msg, cause) {
        undefined===cause ? super(msg) : super(msg, {cause,cause});
        this.name = 'TestError';
    }
}
class AssertError extends Error {
    constructor(msg, cause) {
        undefined===cause ? super(msg) : super(msg, {cause,cause});
        this.name = 'AssertError';
    }
}
const Status = {
    pending:   {label:'保留', color:{f:'#666666',b:'#CCCCCC'}},
    exception: {label:'例外', color:{f:'#0000AA',b:'#99CCFF'}},
    fail:      {label:'失敗', color:{f:'#AA0000',b:'#FFABCE'}},
    success:   {label:'成功', color:{f:'#008800',b:'#AEFFBD'}},
};
const isSafeInt = (v)=>Number.isSafeInteger(v),
      isStr = (v)=>'string'===typeof v;
const StatusCodeOfNames = ['success', 'fail', 'exception', 'pending'];
class Unitest {
    constructor() {
        this._ = {st:new StackTracer(), fn:null, tcs:null, rl:null, a:null, scriptEls:new ScriptLoader()};
    }

    assert(fn) {
        try {
            const a = new Assertion();
            this._.result = new Result(a);
            this._.a = a;
            this._.tcs = new TestCodeStr(fn);
            this.#define(a, fn); // テストケースの定義
            this.#test(a);       // テストケースの実行
            this.#show(a);       // テストケースの表示
        } catch(e) {this._.result.throw(e);}
    }
    test(...args) {// (a)=>{} / 'target.js', (a)=>{} / 'tar1.js','tar2.js',(a)=>{}
        let [paths, fn] = [null, null];
        try {
            if (0===args.length) {throw new TestError(`unitest.test()の引数はテストコードを定義する式を渡す必要があります。その前に任意でテスト対象のJSファイルパスを渡せます。\n((a)=>{a.t(true)})\n('target.js', (a)=>{a.t(true)})\n('tar1.js', 'tar2.js', 'tar3.js', (a)=>{a.t(true)})`)}
            fn = args.at(-1);
            if (!isFn(fn)) {throw new TestError(`unitest.test()の最後の引数はテストコードを定義する式であるべきです。例: (a)={a.t(true); a.f(false); a.e(Error, 'msg', ()=>new Error('msg'));}`)}
            paths = args.slice(0, -1);
            //this.unloadScripts();
            this._.scriptEls.unload();
//            if (0<paths.length) {this.#loadScript(paths)}
            this._.scriptEls.updateStatics();
        } catch(e) {console.error(e);this._.result.throw(e);} // unitest.test()呼び出しで例外発生
        //Promise.all(paths.map(path=>this._.scriptEls.load(path)))
        Promise.all(paths.map(path=>this._.scriptEls.getLoadPromise(path)))
        .then(scripts=>{
            console.log(scripts);
            try {
                const a = new Assertion();
                this._.result = new Result(a, this._.scriptEls);
                this._.a = a;
                // ToDo:対象ファイル表示
                this._.result.target(scripts);
                // テスト実行
                this._.tcs = new TestCodeStr(fn);
                this.#define(a, fn); // テストケースの定義
                this.#test(a);       // テストケースの実行
                this.#show(a);       // テストケースの表示
            } catch(e) {this._.result.throw(e);} // テストケースの定義で例外発生／この実装内で例外発生
        }).catch(e=>this._.result.throw(e)); // 指定ファイルが存在しない
    }
    #define(a, fn) {
        this._.fn = fn; // テストコード定義関数(エラー箇所表示用)
        const example = `(a)={a.t(true); a.f(false); a.e(Error, 'msg', ()=>new Error('msg'));}`;
        if (!isFn(fn)) {throw new TestError(`unitest.assert()の引数は関数であるべきです。例: ${example}`)}
        try {fn(a);} catch (e) {throw new TestError('テストケース定義中に例外発生しました。', e)} // コード箇所の表示＆ログの色を青にしたい
        if (0===a._.cases.length) {throw new TestError(`テストケースが一つもありません。次のように実装してください。例: ${example}`)}
        console.log(a._.cases);
    }
    #test(a) {// 全テストを実行する
        console.log(`全テスト数:${a._.cases.length}`);
        this._.result = new Result(a);
        // 同期系のテストだけを実行する
        this._.a._.cases.filter(c=>!c.isAsync).map(c=>this.#case(c)); // 同期テストは即時実行する
        const acs = this._.a._.cases.filter(c=>c.isAsync); // 非同期系テストケース一覧
        acs.map(c=>c.statusCode=3); // 非同期テストは保留状態にする
        this._.result.syncs(); // 同期系テストのみ結果表示(HTML+LOG)
        // 非同期テストケースを一括処理（結果を個別にセットする）
        Promise.allSettled(acs.map(a=>a.test())).then((results)=>{
            for (let i=0; i<results.length; i++) {
                let c = acs[i]; // testCaseObject
                c.actual = results[i].value;
                console.log('c.actual:',c.actual);
                if (isB(c.expected)) {// 正常系テスト（指定した真偽値を返すか確認する）
                    if ('fulfilled'===results[i].status) {this.#posTry(c)}
                    else {this.#posCatch(c, results[i].reason)}
                } else {
                    if ('fulfilled'===results[i].status) {this.#negTry(c)}
                    else {this.#negCatch(c, results[i].reason)}
                }
            }
            // 結果をHTMLとログに出力する
            this._.result.asyncs(); // 非同期テストのみ結果表示
            this._.result.all();    // 全テスト結果ログ表示
        });
    }
    #makeStacks(type, msg, cause) {
        const e = this._.st.make(new type(msg, cause));
        return {error:e, msg:e.message, stacks:e.stack.split('\n')}
    }
    #show() {}
    #case(c) {// c:testCaseObject。cにstacksを追加したりコンソール表示したりする。
        try {c.actual = c.test(); isB(c.expected) ? this.#posTry(c) : this.#negTry(c);}
        catch (e) {isB(c.expected) ? this.#posCatch(c,e) : this.#negCatch(c,e);}
    }
    #posTry(c) {
        if (c.expected===c.actual) {c.statusCode=0} // succeed
        else {
            c.statusCode=1; // Failed
            c = {...c, ...this.#makeStacks(AssertError, `テスト失敗。${c.expected ? '真' : '偽'}が期待される所で${c.actual}になりました。`)};
            //if (c.notFn) {c.codeStr = this._.tcs.get(c);}
            if (c.notFn) {c.codeStr = this._.scriptEls.get(c).code;}
            Console.fail(c);
        }
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #posCatch(c, e) {
        c.statusCode=2; // Exception
        c = {...c, ...this.#makeStacks(AssertError, `テスト例外。真偽値が期待される所で例外発生しました。`, e)};
        //if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        console.log('this._.scriptEls:', this._.scriptEls);
        if (c.notFn) {c.codeStr = this._.scriptEls.get(c).code;}
        Console.exception(c);
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #negTry(c) {
        c.statusCode=1; // Failed
        c = {...c, ...this.#makeStacks(AssertError, `テスト失敗。例外発生が期待される所で発生しなかった。`)};
        //if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        if (c.notFn) {c.codeStr = this._.scriptEls.get(c).code;}
        Console.fail(c);
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #negCatch(c, e) {
        const isFailedType = e.constructor.name !== c.expected.type.name;
        const isFailedMsg = undefined===c.expected.msg
            ? false
            : (isS(c.expected.msg)
                ? e.message!==c.expected.msg
                : !e.message.match(c.expected.msg));
        const msg = this.#getNegCatchMsg(c, e, isFailedType, isFailedMsg)
        c.statusCode = msg ? 1 : 0; // Failed/Succeed
        //if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        if (c.notFn) {c.codeStr = this._.scriptEls.get(c).code;}
        if (msg) {
            c = {...c, ...this.#makeStacks(AssertError, msg, e)};
            Console.fail(c);
        }
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #getNegCatchMsg(c, e, isFailedType, isFailedMsg) {
        const i = (isFailedMsg << 1) | isFailedType
        const msg = ['','型が','メッセージが','型もメッセージも'][i];
        const E = [c.expected.type.name, c.expected.msg];
        const A = [e.constructor.name, e.message];
        console.log('i:',i, 'c.expected.msg:',c.expected.msg, c);
        return msg ? `テスト失敗。例外の${msg}違います。\n期待値:${3===i ? E.join(', ') : E[i-1]}\n実際値:${3===i ? A.join(', ') : A[i-1]}` : msg;
    }
}
class ScriptLoader {
    constructor() {
        this._ = {statics:[...document.querySelectorAll('script')], dynamics:[]}; // このファイルが読み込まれnewされた時点での<script>要素が対象なのでタイミングに注意
    }
    updateStatics() {this._.statics = [...document.querySelectorAll('script')]}
    get(c) {// c:テストケースデータ
        console.log('ScriptLoader.get(c):', c);
        const scripts = [...this._.dynamics, ...this._.statics];
        console.log('scripts:', scripts);
        for (let script of scripts) {
            console.log(script);
            console.log('script.src:', script.src, script.getAttribute('src'));
            const path = this.#getSubPath(script.src);
            console.log(c.traces[0]);
            console.log(path);
            console.log('c.traces[0].indexOf(path):', c.traces[0].indexOf(path));
            if (-1 < c.traces[0].indexOf(path)) {// <script src="">のパスを含んだトレース文字列なら
                const m = c.traces[0].match(/\.js:(?<row>\d+):(?<col>\d+)/);
                const row = parseInt(m.row);
                const col = parseInt(m.col);
                console.log(script.textContent.split('\n'));
                return {
                    path: script.src,
                    row: row,
                    col: col,
                    code: script.textContent.split('\n')[row].slice(col).trim(), // 開始行のみなら簡単に取得できる。開始行さえあれば良いはず。a.t(true)など非関数の場合は簡単なコードになるはずだから
                }
            }
        }
        throw new ReferenceError(`存在しないファイルを参照しようとしました。:${c.traces[0]}`);
    }
    /*
    get(path) {// 指定パスの<script>要素を返す（パスやソースコード文字列を取得する）
        const scripts = [...this._.dynamics, ...this._.statics];
        [(s)=>s.src===path, (s)=>s.src.endsWith(path)].map(fn=>{// 完全一致したものがあれば優先して返す。なければ後方一致したものを返す
            const i = scripts.findIndex(s=>fn(s));
            if (-1<i) {return scripts[i]}
        });
        throw new ReferenceError(`指定したpathの<script>は存在しません。:path:${path}`);
    }
    getMethodCode(path, row, col) {// 指定ファイルパスの指定行列位置を開始位置とした時、(に対応する)が発見されるまでの間にあるすべての文字列を返す。コメントは無視する。

    }
//    getMethodCode(path, methodStart, row) {}// メソッド文字列を返す（最初に発見したmethodStart文字列の末尾である(に対応する)が発見されるまでの間にあるすべての文字列を返す）
    */
    //async load(...paths) {for await (let path of paths) {this.#loadScript(path)}; return this._.dynamics;}
    //async getLoadPromise(...paths) {return paths.map(p=>this.#loadScript(p));}
    getLoadPromise(path) {return this.#loadScript(path);}
    unload() {for (let script of this._.dynamics) {script.remove()} this._.dynamics.length = 0;}
    #loadScript(path) { return new Promise((resolve, reject) => {
        // 1. 新しい script タグを作成する
        const script = document.createElement('script');
        script.src = path;
        script.dataset.loader = 'async-loader';
        // 2. 読み込み成功時のイベントリスナー
        script.onload = () => {
            console.log(`スクリプト ${path} が正常に読み込まれました。`);
            this._.dynamics.push(script);
            resolve(script); // Promiseを解決する
        };
        // 3. 読み込み失敗時のイベントリスナー
        script.onerror = () => {
            const error = new Error(`スクリプト ${path} の読み込みに失敗しました。`);
            console.error(error.message);
            reject(error); // Promiseを拒否する
        };
        // 4. スクリプトをドキュメントの head または body に追加して読み込みを開始する
        document.head.appendChild(script);
    });}
    #countRelativePathParents(path) {// ../../some/file.js のような文字列から ../ の数を返す。例なら2
        const match = path.match(/^(\.\.\/)+/);
        return match ? match[0].length / 3 : 0;
    }
    #getSubPath(path) {// /,./,../../などの相対パス用プレフィクスを削除した文字列を返す
        console.log(path);
        let subPath = path;
        while (['/', './', '../'].some(v=>subPath.startsWith(v))) {
            subPath = subPath.replace(/^(\/|\.\/|\.\.\/)/, '');
        }
        return subPath;
    }
    #getAbsPath(path) {// 絶対パスを取得する
        if (!('string'===typeof path && 0<path.length)) {throw new TypeError(`pathは1字以上の文字列であるべきです。`)}
        // '': HTMLファイルと同じ階層
        // '/': HTTPドメイン
        // './': HTMLファイルと同じ階層
        // '../': HTMLファイルがある階層の一つ前のディレクトリ
        // 'https://': HTTPS絶対パス
        // 以下は有効でないsrc値である。
        // 'file://': FILE絶対パス
        // 'C:\': Windowsにおけるファイルシステム上の絶対パス
        // '/': Linuxにおけるファイルシステム上の絶対パス
        const parentNum = this.#countRelativePathParents(path);
        /*
        '/'
            ? `${window.location.protocol}://${window.location.hostname}`
            : ('./'
                ? './'を削除したパス
                : ('../'
                    ? いくつか前に戻った時のパス
                    : そのままの文字列
                ));
        */
        // 相対パスプレフィクス('/', './', '../../')を削除したパス文字列
        let flatPath = path;
        while (['/', './', '../'].some(v=>flatPath.startsWith(v))) {
            flatPath = flatPath.replace(/^(\/|\.\/|\.\.\/)/, '');
        }

        /*
        const domain = `${window.location.protocol}://${window.location.hostname}`;
        const absDirPath = '/'===path[0]
            ? `${domain}${path}`
            : path.startsWith('./')
                ? path.slice(2);
                : path.startsWith('../')
                    ? path.split('/').slice(0, parentNum*-1)
                    : path;
        const absDirPath = THIS_DIR_PATH.split('/').slice(0, parentNum*-1);
        if (0 < parentNum) {
        }
        if (path.startsWith('../')) {}
        */
    }

}
class TestCodeStr {
    constructor(testDefineFn) {this._={fn:testDefineFn, str:`${testDefineFn}`}}
    get(c) {// id(id番目のテストコード)からテストコード文字列を取得する（もしテストコード中でfor文内でa.t()を呼び出す等していたら位置が狂ってしまう！。他にもa.t(a.t())などネストしていても狂う！）
        const testCode = this._.str;
        const [paramName, assertCodes] = this.#getAssertCodes(c);
        console.log(`testCode:${testCode}, paramName:${paramName}, assertCodes:${assertCodes}`);
        const start = this.#nthAssertCodeIndexOf(testCode, assertCodes, c.id+1);
        const startStr = testCode.slice(start);
        const end = this.#findMatchingCloseParen(startStr, startStr.indexOf('('), '(', ')') + start + 1;
        const code = testCode.slice(start, end);
        console.log(`id:${c.id} start:${start} end:${end} 開始(:${start + testCode.slice(start).indexOf('(')} 予想元コード:${code}`);
        return code;
    }
    // アサーションコード文字列を生成する
    #getAssertCodes(c) {
        // テストコードの定義 (a)=>{...}, async(a)=>{}, function(a){}, async function(a){} このうち引数名がAssertionのインスタンス名であり取得したい値。どうする？
        const paramName = this._.str.match(/\((?<paramName>.+)\)/).groups?.paramName;
        // アサーションコード文字列
        const tfe = 't f e'.split(' ');
        const cs = tfe.map(v=>v+'c');
        const assertCodes = [...tfe, ...cs].map(n=>`${paramName}.${n}(`);
        return [paramName, assertCodes];
    }
    /**
    * 文字列s内でN番目のアサーションコード開始位置を取得する
    * @param {string}  s  テストコード文字列
    * @param {array}   as 全アサーションコード開始文字列を含む配列
    * @param {number}  n  何番目の出現位置か（1から始まる）
    */
    #nthAssertCodeIndexOf(s, as, n) {
        if (n<1) {throw new TypeError(`nは1以上の整数値であるべきです。`)}
        let index = -1;
        let cands = null;
        for (let i=0; i<n; i++) {
            const idxs = as.map(a=>s.indexOf(a, index+1)).filter(v=>-1<v);
            if (0===idxs.length) {return -1}
            index = Math.min(...idxs);
        }
        return index;
    }
    /**
     * 指定された開始括弧に対応する閉じ括弧のインデックスを取得します。
     * @param {string} str - 対象の文字列
     * @param {number} openPos - 開始括弧のインデックス
     * @param {string} openChar - 開始括弧の文字 (例: '(')
     * @param {string} closeChar - 閉じ括弧の文字 (例: ')')
     * @returns {number} 対応する閉じ括弧のインデックス。見つからない場合は -1
     */
    #findMatchingCloseParen(str, openPos, openChar, closeChar) {
        console.log(`#findMatchingCloseParen(str, openPos, openChar, closeChar)`, str, openPos, openChar, closeChar);
        let counter = 1;
        for (let i = openPos+1; i<str.length; i++) {
            if (str[i] === openChar) {counter++}
            else if (str[i] === closeChar) {counter--}
            if (counter === 0) {return i}
        }
        return -1; // 対応する閉じ括弧が見つからなかった場合
    }
}
const isB = (v)=>'boolean'===typeof v,
    isS = (v)=>'string'===typeof v,
    isReg = (v)=>v instanceof RegExp,
    isFn = (v)=>'function'===typeof v,
    isAFn = (v)=>isFn(v) && v.constructor.name === 'AsyncFunction',
    isCls = (v)=>(isFn(v) && Boolean(v.toString?.().match(/^class /))),
    getTag = (v)=>Object.prototype.toString.call(v),
    isIns = (v)=>null!==v && 'object'===typeof v && 'Object Array'.every(t=>`[object ${t}]`!==getTag(v)),
    isErrCls = (v) =>Error===v||Error.isPrototypeOf(v);
    isErrIns = (v) =>v instanceof Error;
class Assertion {// Unitest.assert((a)=>{})のように利用者は外部からAssertインスタンスとして利用する
    constructor() { // 内部で全テストケースを関数として保持する
        this._ = {id:0, cases:[]};
    }
    t(...args) {this.#makeTestFn(true, ...args)}
    f(...args) {this.#makeTestFn(false, ...args)}
    e(...args) {this.#makeTestFn(args[0], ...args.slice(1))}
    tc(...args) {}
    fc(...args) {}
    ec(...args) {}
    get _syncs() {return this._.cases.filter(c=>!c.isAsync)} // 同期系テストケース一覧
    get _asyncs() {return this._.cases.filter(c=>c.isAsync)} // 非同期系テストケース一覧
    get _syncStatuses() {return this._getStatuses('sync', this._syncs)}
    get _asyncStatuses() {return this._getStatuses('async', this._asyncs)}
    get _allStatuses() {return this._getStatuses('all', this._.cases)}
    _getStatuses(name, cases) {
        const P = cases.filter(c=>3===c.statusCode).length, // 保留 Pending
              E = cases.filter(c=>2===c.statusCode).length, // 例外 Exception
              F = cases.filter(c=>1===c.statusCode).length, // 失敗 Failed
              S = cases.filter(c=>0===c.statusCode).length, // 成功 Succeed
              A = E+F+S+('syncs'===name ? 0 : P),           // 全件 All（syncsの時だけPを除外する）
              R = (S/A);                                    // 比率 Rate (0〜1)
        return ({pending:P, exception:E, fail:F, success:S, all:A, rate:R, percent:`${(R*100).toFixed(0)}%`, name:('sync'===name ? '同期テストのみ' : ('async'===name) ? '非同期テストのみ' : '全テスト完了')});
    }
    #getExpected(v, w) {
        if ('boolean'===typeof v || isErrIns(v)) {return v}
        else if (isErrCls(v) && (isS(w) || isReg(w))) {return {errCls:v, msg:w}}
        else {throw new TypeError(`入力値不正。#getExpected()`)}
    }
    #makeTestFn(expected, ...args) {// expected: true/false/new Error('message')/Error + (msg)=>msg.match(/^some$/)/RegExp
        const L = args[args.length-1];
        if ((isB(expected) && 1===args.length && (isB(L) || isFn(L)))
         || (isErrIns(expected) && 1===args.length && isFn(L))
         || (isErrCls(expected) && 1===args.length && isFn(L))
         || (isErrCls(expected) && 2===args.length && (isS(args[0]) || isReg(args[0])) && isFn(L))) {this._.cases.push({
            id: this._.id++,
            expected: isB(expected)
                ? expected
                : ({type: (isErrCls(expected) ? expected : expected.constructor),
                    msg: (isErrCls(expected) && 1===args.length ? undefined : (isErrIns(expected) ? expected.message : args[0]))}),
            test: isFn(L) ? L : ()=>args[0],
            isAsync:0===args.length ? false : isAFn(L),
            notFn: (isB(expected) && 1===args.length && isB(L)),
            //traces: (new Error('スタックトレースを取得')).stack.split('\n'),
            traces: (new Error('スタックトレースを取得')).stack.split('\n').filter(v=>-1===v.indexOf(THIS_FILE_NAME)),
         });}
        // tc(),fc(),ec()のような複数の引数パターンを持つ方法も追加したい
        // cls(),ins(),m(),fn(),test()のようなクラス、インスタンス、メソッド、関数のテストコードを短縮表現できるメソッドも追加したい。
        else {throw new TypeError(`入力値不正。#makeTestFn(): ${args}`)}
    }
}
class AssertStatus {
    static get #data() {return ({
        pending:   {code:3, label:'保留', color:{f:'#666666',b:'#CCCCCC'}},
        exception: {code:2, label:'例外', color:{f:'#0000AA',b:'#99CCFF'}},
        fail:      {code:1, label:'失敗', color:{f:'#AA0000',b:'#FFABCE'}},
        success:   {code:0, label:'成功', color:{f:'#008800',b:'#AEFFBD'}},
    })}
    static getLabel(nc) {return this.#get('Label', nc)}
    static getColor(nc) {return this.#get('Color', nc)}
    static #get(target, nc) {
        const F = isSafeInt(nc) ? 'Code' : (isStr(nc) ? 'Name' : (()=>{throw new TypeError(`ncは状態名Stringか状態コードNumberであるべきです。`)})());
        return this[`_get${target}From${F}`](nc);
    }
    static _getLabelFromName(name) {return this.#getFromName(name, 'label')}
    static _getLabelFromCode(code) {return this.#getFromCode(code, 'label')}
    static _getColorFromName(name) {return this.#getFromName(name, 'color')}
    static _getColorFromCode(code) {return this.#getFromCode(code, 'color')}
    static #getFromName(name, target) {console.log(name,target,this.#data);return this.#data[name][target]}
    static #getFromCode(code, target) {console.log(code,target,this.#data);return this.#data.filter(d=>d.code===code)[0][target]}
    constructor(a) {this._={a:a, status:{syncs:null, asyncs:null, all:null}}}
    get #syncCases() {return this._.a._.cases.filter(c=>!c.isAsync)} // 同期系テストケース一覧
    get #asyncCases() {return this._.a._.cases.filter(c=>c.isAsync)} // 非同期系テストケース一覧
    get #allCases() {return this._.a._.cases} // 全テストケース一覧
    get syncs() {return this.#gets('syncs', this.#syncCases)}
    get asyncs() {return this.#gets('asyncs', this.#asyncCases)}
    get all() {return this.#gets('all', this.#allCases)}
    #gets(name, cases) {
        if (null!==this._.status[name]) {return this._.status[name]} // 一度だけ算出する。以降の参照は使いまわし。
        const P = cases.filter(c=>3===c.statusCode).length, // 保留 Pending
              E = cases.filter(c=>2===c.statusCode).length, // 例外 Exception
              F = cases.filter(c=>1===c.statusCode).length, // 失敗 Failed
              S = cases.filter(c=>0===c.statusCode).length, // 成功 Succeed
              A = E+F+S+('syncs'===name ? 0 : P),           // 全件 All（syncsの時だけPを除外する）
              R = (S/A);                                    // 比率 Rate (0〜1)
        this._.status[name] = ({pending:P, exception:E, fail:F, success:S, all:A, rate:R, percent:`${(R*100).toFixed(0)}%`, name:('syncs'===name ? '同期テストのみ' : ('asyncs'===name) ? '非同期テストのみ' : '全テスト完了')});
        return this._.status[name];
    }
}
class StackTracer {
    capture(caller) {
        caller = caller ?? this.__getCaller(removeTxt);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, caller ?? this.capture);
            const s = this.stack.split('\n')
            s.shift() // 先頭にある Error 削除
            return this.__delStacks(s)
        } else { return [] } 
    }
    make(err) {
        if (!isErrIns(err)) {throw new TypeError(`errはErrorかそれを継承した型のインスタンスであるべきです。`)}
        try {throw err;} catch(e) {return e}
    }
    /*
    make(err) {
        if (!isErrIns(err)) {throw new TypeError(`errはErrorかそれを継承した型のインスタンスであるべきです。`)}
        try {throw error;} catch(e) {return e.stack.split('\n')}
    }
    */
    /*
    getErrorStacks(err) {
        const errs = this.#recursionCause([err])
        console.log(errs.map(e=>e.stack));
        return errs.map(e=>this.#delStacks(e.stack)).flat()
    }
    */
    #recursionCause(errs) {
        const last = errs[errs.length-1]
        if (last.hasOwnProperty('cause') && last.cause) {
            errs.push(last.cause)
            return this.#recursionCause(errs)
        } else { return errs }
    }
    #delStacks(stacks) {
        const s = Array.isArray(stacks) ? stacks : (isS(stacks) ? stacks.split('\n') : null)
        if (null===s) { throw new AssertError(`内部エラー。#delStacksの引数は文字列かその配列であるべきです。`, 'exception') }
        return s.filter(line=>-1===line.indexOf(THIS_FILE_NAME))
    }
    __isGenealogy(a, e) { // aがeの系譜（同一または子孫クラス）であれば真を返す
        if (a instanceof e || a.constructor.name === e.constructor.name) { return true }
        if (a.prototype) { return this.__isGenealogy(a.prototype, e) }
        return false
    }
    __getCaller(removeTxt) {
        const error = new Error();
        const stack = error.stack || '';
        const stacks = stack.split('\n');
        const callerIndex = stacks.findIndex(line => line.includes('__getCaller'));
        if (!removeTxt) {removeTxt=THIS_FILE_NAME} // このファイル名が含まれるスタックトレースは削除する
        return (stacks[callerIndex]) ? this.#delStacks(stacks.slice(callerIndex)).join('\n') : 'Unknown'
    }
}
class Console {
    static fail(c) {this.#log('fail', c)}
    static exception(c) {this.#log('exception', c)}
    static #log(status, c) {console.log(`%c${c.msg}\n${this.#testCode(c)}\n${c.stacks.join('\n')}`, `background-color:${Status[status].color.b};color:${Status[status].color.f};`)}
    static #testCode(c) {const hasCode = 'codeStr' in c; return `対象id:${c.id}` + ` ${hasCode ? '予想' : ''}コード:` + (hasCode ? c.codeStr : `${c.test}`);}
}
class ResultLog {
    constructor(a, scriptEls) {
        this._ = {a:a, syncs:{P:0, S:0, F:0, E:0}, asyncs:{S:0, F:0, E:0}, all:{S:0, F:0, E:0}, scriptEls:scriptEls};
    }
    target(scripts) {console.log(scripts);if (Array.isArray(scripts) && 0<scripts.length) {console.log(`テスト対象:`, scripts.at(-1).src); scripts.slice(0, -1).map(script=>console.log(`依存コード:`, script.src))}}
    throw(e) {console.error(e)}
    syncs(status) {if (0 < this._.a._asyncs.length){this.#log(this.#getPs('syncs', status))}}
    asyncs(status) {if (0 < this._.a._asyncs.length){this.#log(this.#getPs('asyncs', status))}}
    all(status) {this.#log(this.#getPs('all', status))}
    #getPs(name, status) {
        const R = '100%'===status.percent ? 'success' : 'pending';
        console.log(name, status instanceof AssertStatus, status, status[name]);
        return [[`${status[name].name} ${status[name].percent} ${status[name].all}`, R], ...'pending exception fail success'.split(' ').map(n=>[`${Status[n].label}:${status[name][n]}`, n])].map(ln=>this.#getP(...ln))
    }
    #getP(label, n){return ({label:label, format:`background-color:${Status[n].color.b};color:${Status[n].color.f};`});}
    #log(P) {console.log(P.reduce((s,p)=>s+`%c${p.label} `, '').trim(), ...P.map(p=>p.format))}
}
// テスト結果を表示する。
// * テスト中例外発生（テストコード問題箇所と、修正内容の提示）
// * テスト正常終了（合否。比率。内訳（保留、例外、失敗、成功の件数）。問題箇所の表示一覧）
class ResultHtml {
    constructor(a, scriptEls){this._={id:'unitest-result', a:a, el:{root:null, throw:null, success:null, count:null, problem:null}, scriptEls:scriptEls}; this.#makeRootEl();}
    throw(e) {// テスト実行中に例外発生した時の表示
        this._.el.throw.display = 'block';
        this._.el.throw.style.backgroundColor = Status.exception.color.b;
        this._.el.throw.style.color = Status.exception.color.f;
        if (this._.el.success) {this._.el.success.display = 'none'}
        this._.el.throw.innerHTML = `<p>${e.message}</p><br><p>${e.stack.split('\n').join('<br>')}</p>`;
    }
    target(scripts) {
        if (1 < scripts.length) {// <ul><li>依存ファイル名1<li><li>依存ファイル名2<li></ul>
            if (this._.el.root.querySelector('#dependence-files')) {
                this._.el.root.querySelector('#dependence-files').remove();
            }
            const dependences = scripts.slice(0, -1).map(script=>{
                const a = document.createElement('a');
                a.id = `target-file`
                //a.setAttribute('target', '_blank');
                a.setAttribute('target', script.src);
                a.setAttribute('rel', 'noopener noreferrer');
                a.setAttribute('href', script.src);
                a.textContent = script.src.substring(script.src.lastIndexOf('/') + 1);
                return a;
            });
            const ul = document.createElement('ul');
            ul.id = `dependence-files`;
            dependences.map(a=>{
                const li = document.createElement('li');
                li.appendChild(a);
                ul.appendChild(li);
            });
            this._.el.root.prepend(ul);
        }
        if (0 < scripts.length) {// <h1>テスト対象ファイル名 単体試験</h1>
            if (this._.el.root.querySelector('#target-file')) {
                const a = document.querySelector('#target-file');
                a.setAttribute('target', script.src);
                a.setAttribute('href', script.src);
                a.textContent = script.src.substring(script.src.lastIndexOf('/') + 1);
            } else {
                const script = scripts.at(-1);
                console.log(script);
                const a = document.createElement('a');
                a.id = `target-file`
                //a.setAttribute('target', '_blank');
                a.setAttribute('target', script.src);
                a.setAttribute('rel', 'noopener noreferrer');
                a.setAttribute('href', script.src);
                a.textContent = script.src.substring(script.src.lastIndexOf('/') + 1);
                const h1 = document.createElement('h1');
//                h1.appendChild(a);
//                h1.appendChild(` 単体試験`);
                const percent = document.createElement('span');
                percent.id = `unitest-percent`;
                const allCount = document.createElement('span');
                allCount.id = `unitest-all-count`;
                h1.append(`単体試験 `, a, ' ', percent, ' ', allCount);
                this._.el.root.prepend(h1);
            }
        }
    }
    syncs(status) {this.#makeSuccessEl(status);}
    asyncs(status) {/*this.#update('asyncs', status)*/}
    all(status) {this.#update('all', status)}
    #makeRootEl() {
        'root throw success'.split(' ').map(n=>{
            this._.el[n] = document.createElement('div')
            this._.el[n].id = `${this._.id}${'root'===n ? '' : '-'+n}`;
        });
        'count problem'.split(' ').map(n=>{
            this._.el[n] = document.createElement('table')
            this._.el[n].id = `${this._.id}-${n}`;
        });
        this._.el.success.append(...('count problem'.split(' ').map(n=>this._.el[n])));
        this._.el.root.append(this.#makeStyleEl(), ...('throw success'.split(' ').map(n=>this._.el[n])));
        document.body.appendChild(this._.el.root);
    }
    #update(name, status) {// name:工程名, status:保留,例外,失敗,成功の数
        console.log('ResultHtml.#update():', name, status);
        this.#updateCountTable(name, status);
        this.#updateProblemTable(name, status);
        this.#updateSummary(name, status);
    }
    #updateSummary(name, status) {// 最終合否率＆件数
        const percent = document.querySelector(`#unitest-percent`);
        const allCount = document.querySelector(`#unitest-all-count`);
        const S = '100%'===status.all.percent ? 'success' : 'pending';
        const C = AssertStatus.getColor(S);
        if (percent) {percent.style.backgroundColor = C.b; percent.style.color = C.f; percent.textContent = `${status.all.percent}`}
        if (allCount) {allCount.style.backgroundColor = C.b; allCount.style.color = C.f; allCount.textContent = `${status.all.all}件`}
    }
    #updateCountTable(name, status) {// name:工程名, status:保留,例外,失敗,成功の数
        // 結果の要約は<p>に出力したい。tbodyだと長くなりテーブルが見づらくなるから。
//        this._.el.count.querySelector(`thead`).textContent = `${status.name} ${status.percent} ${status.all}`;
//        this._.el.count.querySelector(`thead`).className = `${'100%'===status.percent ? 'success' : 'pending'}`;
        console.log(name, status);
        StatusCodeOfNames.toReversed().map(n=>{
            this._.el.count.querySelector(`#${n}-count`).textContent=`${status[name][n]}`; // テスト結果件数を更新する
            this._.el.count.querySelector(`tr.${n}`).style.display = (0===status[name][n] ? 'none' : 'table-row'); // 件数が0の行を非表示にする
        });
    }
    #updateProblemTable(name, status) {// name:工程名, status:保留,例外,失敗,成功の数
        // 非同期テスト結果を追加挿入する
        this._.el.contentVisiblity = 'hidden';
        const tbody = document.querySelector(`#${this._.id}-problem tbody`);
        const trs = [...tbody.querySelectorAll(`tr`)];
        for (let c of this._.a._.cases.filter(c=>c.isAsync && [1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id)) {
            const conds = trs.filter(tr=>c.id < parseInt(tr.dataset.id)).sort(); // 挿入先候補
            const tr = this.#makeProblemTdTrEl(c); // 追加するtr
            if (0===conds.length) {tbody.appendChild(tr)} else {conds[0].before(tr)}
        }
        this._.el.contentVisiblity = 'auto';
    }
    #makeSuccessEl(status) {
        this._.el.count.innerHTML = `${this.#makeCountTableHtml('syncs', status)}`;
        this._.el.problem.innerHTML = `${this.#makeProblemAreaTableHtml('syncs', status)}`;
        // ToDo: countは保留など0件のtrを非表示にする。件数を更新する。
        // ToDo: problemは作り直す（同期のみ、非同期のみ、全件では、同期のみ→全件の二段階更新であり、二回目は追加だけが行われうるのであり削除や変更は起きないはず）
    }
    #makeStyleEl() {
        const style = document.createElement('style')
        style.id = `unitest-result-style`;
        style.textContent = this.#makeStyleCss();
        return style;
    }
    #makeStyleCss() {return `<style id="${this._.id}-style">table{border-collapse:collapse; border-spacing:0;}td,th{padding:0.25em;}${StatusCodeOfNames.map(n=>`.${n} {background-color:${Status[n].color.b}; color:${Status[n].color.f}; }`).join('\n')}</style>`;}
    #makeCountTableHtml(name,status) {return `<table id="${this._.id}-count">${this.#makeCountTrsHtml(name,status)}<table>`;}
    #makeCountTrsHtml(name,status) {return StatusCodeOfNames.toReversed().map(n=>this.#makeCountTrHtml(n, status[name][n])).join('')}
    #makeCountTrHtml(statusName, num) {const N=statusName;return `<tr class="${N}"><th>${Status[N].label}</th><td id="${N}-count">${num}</td></tr>`}
    #makeProblemAreaTableHtml(name,status) {return `<table id="${this._.id}-problem">${this.#makeProblemThHtml()}${this.#makeProblemTrsHtml(name,status)}<table>`;}
    #makeProblemAreaTable(name,status) {
        const cases = this._.a._.cases.filter(c=>[1,2].some(v=>v===c.statusCode)); // 失敗か例外のテストケースのみ取得する
        return `<table id="${this._.id}-problem">${this.#makeProblemThHtml()}${this.#makeProblemTrsHtml()}<table>`;
    }
    #makeProblemThTrEl() {
        const tr = document.createElement('tr');
        tr.append(...('要約 箇所'.split(' ').map(t=>{
            const th = document.createElement('th');
            th.textContent = t;
            return th;
        })));
        return tr;
    }
    #makeProblemThHtml() {return `<tr><th>要約</th><th>箇所</th><th>追跡</th></tr>`}
    #makeProblemTdTrEl(c) {
        const tr = document.createElement('tr');
        tr.className = StatusCodeOfNames[c.statusCode];
        tr.dataset.id = c.id;
        const td0 = document.createElement('td');
        const td1 = document.createElement('td');
        const td2 = document.createElement('td');
        td0.className = ``;
        td0.innerHTML = c.msg.split('\n').join('<br>');
        td1.innerHTML = `対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}`;
//        td2.innerHTML = c.stacks.join('<br>');
        td2.innerHTML = this.#stackTrace(c);
        tr.append(td0, td1, td2);
        return tr;
    }
    #makeProblemTrsHtml(name,status) {
        const records = this._.a._.cases.filter(c=>[1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id);
        return 0===records.length ? '' : records.map(c=>this.#makeProblemTrHtml(c)).join('\n');
    }

    #makeProblemTrHtml(c) {console.log(c);return `<tr class="${StatusCodeOfNames[c.statusCode]}" data-id="${c.id}"><td>${c.msg.split('\n').join('<br>')}</td><td>対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}</td><td>${this.#stackTrace(c)}</td></tr>`}
    //#makeProblemTrHtml(c) {console.log(c);return `<tr class="${StatusCodeOfNames[c.statusCode]}" data-id="${c.id}"><td>${c.msg.split('\n').join('<br>')}</td><td>対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}</td><td>${this.#stackTrace(c)}</td></tr>`}
    //#makeProblemTrHtml(c) {console.log(c);return `<tr class="${StatusCodeOfNames[c.statusCode]}" data-id="${c.id}"><td>${c.msg.split('\n').join('<br>')}</td><td>対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}</td><td>${c.stacks ? c.stacks.join('<br>') : ''}</td></tr>`}
    #getTestCodeStr(c) {
        /*
        // 相対パスプレフィクス('/', './', '../../')を削除したパス文字列
        let flatPath = path;
        while (['/', './', '../'].some(v=>flatPath.startsWith(v))) {
            flatPath = flatPath.replace(/^(\/|\.\/|\.\.\/)/, '');
        }




        const relativePath = c.stacks[0].substring(c.stacks[0].lastIndexOf(THIS_DIR_NAME) + 1); // index.htmlがあるディレクトリパスからの相対パス
        const fileNameRC = c.stacks[0].substring(THIS_FILE_PATH.lastIndexOf('/') + 1); // [ファイル名]:[行]:[列] この書式は他のブラウザだと異なる場合がある
        const fileName = fileNameRC.substring(0, fileNameRC.lastIndexOf('.js')); // ファイル名だけを取得する
        THIS_DIR_NAME 
THIS_FILE_NAME 
const THIS_FILE_NAME = THIS_FILE_PATH.substring(THIS_FILE_PATH.lastIndexOf('/') + 1) ?? 'unitest.js:';
        this._.scripts.filter(script=>script.src.indexOf());
        */
    }
    #stackTrace(c) {
        const stacks = [];
        const traces = c.traces.filter(v=>-1===v.indexOf(THIS_FILE_NAME));
        if (c.notFn && c.traces) {stacks.push(traces[0])}   // テストコード定義箇所
        if (c.stacks) {stacks.push(...c.stacks.filter(v=>v))} // 例外発生箇所
//        const stacks = c.stacks ? [...c.stacks].filter(v=>v) : [];
        if (c.error) {// 例外発生の歴史を辿る
            const A = [];
            let cause = c.error.cause;
            console.log(`#stackTrace(c):`, c.error, cause);
            while (cause) {
                console.log(`caused by:`, cause.constructor.name, cause.message, [cause.stack.split('\n')]);
                //stacks.push(cause.constructor.name, cause.message, ...[cause.stack.split('\n')]);
                //stacks.push(`caused by: ${cause.constructor.name}, ${cause.message}`, ...[cause.stack.split('\n')]);
                //stacks.push(`caused by: ${cause.constructor.name}, ${cause.message}`, ...cause.stack.split('\n'));
                A.push(`caused by: ${cause.constructor.name}, ${cause.message}`, ...cause.stack.split('\n'));
                cause = cause.cause;
            }
            if (0<A.length) {
                stacks.length = 0;
                stacks.push(...A);
            }
        }
        console.log(`location.pathname:`, location.pathname); // /tmp/work/JS.Unitest.20251210123827/docs/3/index.html
        console.log(`c.id:`, c.id, `c.notFn:`, c.notFn, `c.traces:`, c.traces.filter(v=>-1===v.indexOf(THIS_FILE_NAME)), `stacks:`, stacks.filter(v=>-1===v.indexOf(THIS_FILE_NAME)), `c:`, c);
//        console.log(`c.traces:`);
        if (!stacks.some(v=>-1<v.indexOf(traces[0]))) {stacks.unshift(traces[0])} // テストコード定義箇所を追記する
        //return stacks.filter(v=>-1===v.indexOf(THIS_FILE_NAME)).join('<br>');
        //return stacks.filter(v=>-1===v.indexOf(THIS_FILE_NAME)).map(v=>v.replaceAll(ROOT_DIR_PATH,'(略)')).join('<br>');
        const STACKS = stacks.filter(v=>-1===v.indexOf(THIS_FILE_NAME));
        const stackHTML = STACKS.map(v=>v.replaceAll(ROOT_DIR_PATH,'(略)')).join('<br>')
        return stackHTML;
    }
}
class Result {
    constructor(a, scriptEls) {this._={a:a, log:new ResultLog(a, scriptEls), html:new ResultHtml(a, scriptEls), status:new AssertStatus(a), scriptEls:scriptEls}}
    throw(e) {this._.log.throw(e); this._.html.throw(e);}
    target(scripts) {this._.log.target(scripts); this._.html.target(scripts);}
    syncs() {this.#run('syncs')}
    asyncs() {this.#run('asyncs')}
    all() {this.#run('all')}
    #run(name) {
        if (!'syncs asyncs all'.split(' ').some(n=>n===name)) {throw new Error(`nameはsyncs,asyncs,allのいずれかであるべきです。`)}
        this._.status[name]; // ステータス算出
        this._.log[name](this._.status);
        this._.html[name](this._.status);
    }
}
class Show {// テスト結果をHTMLに画面表示する（結果一覧。問題箇所一覧。）

}
window.unitest = new Unitest();
})();
