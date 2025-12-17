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
const isSafeInt = (v)=>Number.isSafeInteger(v),
      isStr = (v)=>'string'===typeof v,
      isNestAry = (v)=>Array.isArray(v) && 0<v.length && Array.isArray(v[0]);
const AsyncFunction = (async()=>{}).constructor,
      GeneratorFunction = (function*(){yield undefined;}).constructor,
      AsyncGeneratorFunction = (async function*(){yield undefined;}).constructor,
      isFn = (v)=>'function'===typeof v, // 関数全般(無印, Async, Generator, AsyncGenerator)
      isSFn = (v)=>isFn(v) && !isGFn(v) && !isAFn(v) && !isAGFn(v), // 無印関数, SyncFn, SimpleFn
//      isAFn = (v)=>isFn(v) && v.constructor.name === 'AsyncFunction',
      isAFn = (v)=>v instanceof AsyncFunction,
      isGFn = (v)=>v instanceof GeneratorFunction,
      isAGFn = (v)=>v instanceof AsyncGeneratorFunction;
class Unitest {
    constructor() {
        this._ = {st:new StackTracer(), fn:null, rl:null, a:null, scripts:[]};
    }
    assert(fn) {
        try {
            const a = new Assertion();
            this._.result = new Result(a);
            this._.a = a;
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
            this.unloadScripts();
        } catch(e) {this._.result.throw(e);} // unitest.test()呼び出しで例外発生
        Promise.all(paths.map(path=>this.#loadScript(path)))
        .then(scripts=>{
            console.log(scripts);
            try {
                const a = new Assertion();
                this._.result = new Result(a);
                this._.a = a;
                // ToDo:対象ファイル表示
                this._.result.target(scripts);
                // テスト実行
                this.#define(a, fn); // テストケースの定義
                this.#test(a);       // テストケースの実行
                this.#show(a);       // テストケースの表示
            } catch(e) {this._.result.throw(e);} // テストケースの定義で例外発生／この実装内で例外発生
        }).catch(e=>this._.result.throw(e)); // 指定ファイルが存在しない
    }
    async #loadScripts(...paths) {
        for await (let path of paths) {this.#loadScript(path)}
    }
    #loadScript(path) { return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = path;
        script.onload = () => {
            console.log(`スクリプト ${path} が正常に読み込まれました。`);
            this._.scripts.push(script);
            resolve(script);
        };
        script.onerror = () => {
            const error = new Error(`スクリプト ${path} の読み込みに失敗しました。`);
            console.error(error.message);
            reject(error);
        };
        document.head.appendChild(script);
    });}
    unloadScripts() {for (let script of this._.scripts) {script.remove()} this._.scripts.length = 0;}
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
            Console.fail(c);
        }
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #posCatch(c, e) {
        c.statusCode=2; // Exception
        c = {...c, ...this.#makeStacks(AssertError, `テスト例外。真偽値が期待される所で例外発生しました。`, e)};
        Console.exception(c);
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #negTry(c) {
        c.statusCode=1; // Failed
        c = {...c, ...this.#makeStacks(AssertError, `テスト失敗。例外発生が期待される所で発生しなかった。`)};
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
const isB = (v)=>'boolean'===typeof v,
    isS = (v)=>'string'===typeof v,
    isReg = (v)=>v instanceof RegExp,
//    isFn = (v)=>'function'===typeof v,
//    isAFn = (v)=>isFn(v) && v.constructor.name === 'AsyncFunction',
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
            traces: (new Error('スタックトレースを取得')).stack.split('\n'),
         });}
        // tc(),fc(),ec()のような複数の引数パターンを持つ方法も追加したい
        // cls(),ins(),m(),fn(),test()のようなクラス、インスタンス、メソッド、関数のテストコードを短縮表現できるメソッドも追加したい。
        else {throw new TypeError(`入力値不正。#makeTestFn(): ${args}`)}
    }
}
class GeneralAssertion {// t,f,e

}
class FunctionAssertion {
    // 指定した関数が指定した戻り値であることを確認する
    // 引数パターン
    //   単数形
    //     (関数ポインタ, 戻り値)                                                    // 引数なしで呼び出し戻り値が指定した値と一致するかを確認する
    //     (関数ポインタ, [第一引数, 第二引数, ...], 戻り値)                         // 引数ありで呼び出し戻り値が指定した値と一致するかを確認する
    //     (関数ポインタ, [[第一引数が配列の場合], 第二引数, ...], 戻り値)           // 引数ありで呼び出し戻り値が指定した値と一致するかを確認する
    //     (関数ポインタ, [[全引数が配列の場合], [全引数が配列の場合], ...], 戻り値) // 引数ありで呼び出し戻り値が指定した値と一致するかを確認する
    //   複数形はfns()で実行すること
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], [第一引数, 第二引数, ...], ...], (...args)=>戻り値)  // 全引数が配列の関数をテストする時混同してしまう
    // 関数ポインタ・期待値計算式
    //   Function, AsyncFunction, GeneratorFunction, AsyncGeneratorFunction, の4種類ある
    // 疑問
    //   引数に配列を受け取る関数をテストしたい時は複数形と区別できなくなってしまうのでは？→fns()で別関数化することで区別する。
    fn(...args) {
        if (args.length < 2) {throw new TestError(`fn()の引数は二つ以上必要です。`)}
        if (!isFn(args[0])) {throw new TestError(`fn()の第一引数は関数オブジェクトであるべきです。`)}
        if (2===args.length) {// 単数形 引数あり (関数ポインタ, 戻り値)
            this.#addCase(args[0], args[1], []);
        } else if (3===args.length) {
            this.#addCase(args[0], args[2], args[1]);
        }
        throw new TestError(`fn()の引数が不正です。次のいずれかのみ有効です。
(関数ポインタ, 戻り値)
(関数ポインタ, [第一引数, 第二引数, ...], 戻り値)`);
//(関数ポインタ, [[], [第一引数, 第二引数, ...], [第一引数, 第二引数, ...], ...], (...args)=>戻り値)`);
    }
    // 指定した関数が指定した戻り値であることを確認する
    // 引数パターン
    //   複数形
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], [第一引数, 第二引数, ...], ...], (...args)=>戻り値)
    //     (関数ポインタ, [[], [[第一引数が配列], 第二引数, ...], [[全引数が配列], [全引数が配列], ...], ...], (...args)=>戻り値)
    // 関数ポインタ・期待値計算式
    //   Function, AsyncFunction, GeneratorFunction, AsyncGeneratorFunction, の4種類ある
    // 疑問
    //   引数に配列を受け取る関数をテストしたい時は複数形と区別できなくなってしまうのでは？
    fns(...args) {
        if (3!==args.length) {throw new TestError(`fns()の引数は三つだけ必要です。次のパターンのみ有効です。
(関数ポインタ, [[], [第一引数, 第二引数, ...], [第一引数, 第二引数, ...], ...], (i, args)=>\`${i}番目の引数パターンの戻り値\`)`)}
        if (!isFn(args[0])) {throw new TestError(`fn()の第一引数は関数オブジェクトであるべきです。`)}
        if (!isNestAry(args[1])) {throw new TestError(`fn()の第二引数は引数パターン配列であるべきです。例:[[], [[第一引数が配列], 第二引数, ...], [[全引数が配列], [全引数が配列], ...], ...]`)}
        //if (!isFn(args[2]) && !isGFn(args[2]) && !isAFn(args[2]) && !isAGFn(args[2])) {throw new TestError(`fns()の第三引数は期待値を返す関数であるべきです。AsyncやGenerator関数は使えません。例: (i,args)=>\`${i}番目の引数パターンの戻り値\``)}
        if (!isSFn(args[2])) {throw new TestError(`fns()の第三引数は期待値を返す関数であるべきです。AsyncやGenerator関数は使えません。例: (i,args)=>\`${i}番目の引数パターンの戻り値\``)}
        // テストケース作成
        for (let i=0; i<args[1].length; i++) {
            this.#addCase(args[0], args[2](i, args[1][i]), args[1][i], i); // 期待値の計算は式を実行して取得する（例外発生しうる。非同期でありうる）
        }
    }
    // 指定した関数が例外発生することを確認する
    // 引数パターン
    //   単数形 12
    //     (関数ポインタ, Error)                                                    // 引数なしで呼び出し指定したError型か確認する
    //     (関数ポインタ, 'エラーメッセージ')                                       // 引数なしで呼び出し指定したErrorメッセージか確認する
    //     (関数ポインタ, /^エラーメッ/)                                            // 引数なしで呼び出し指定したErrorメッセージとマッチするか確認する
    //     (関数ポインタ, new Error('エラーメッセージ'))                            // 引数なしで呼び出し指定したErrorメッセージか確認する
    //     (関数ポインタ, Error, 'エラーメッセージ')                                // 引数なしで呼び出し指定したError型とメッセージか確認する
    //     (関数ポインタ, Error, /^エラーメッ/)                                     // 引数なしで呼び出し指定したError型とメッセージか確認する
    //     (関数ポインタ, [第一引数, 第二引数, ...], Error)                         // 引数あり呼び出し指定したError型とメッセージの型か確認する
    //     (関数ポインタ, [第一引数, 第二引数, ...], 'エラーメッセージ')            // 引数あり呼び出し指定したError型とメッセージの型か確認する
    //     (関数ポインタ, [第一引数, 第二引数, ...], /^エラーメッ/)                 // 引数あり呼び出し指定したError型とメッセージの型か確認する
    //     (関数ポインタ, [第一引数, 第二引数, ...], new Error('エラーメッセージ')) // 引数あり呼び出し指定したError型とメッセージの型か確認する
    //     (関数ポインタ, [第一引数, 第二引数, ...], Error, 'エラーメッセージ')     // 引数あり呼び出し指定したError型とメッセージの型か確認する
    //     (関数ポインタ, [第一引数, 第二引数, ...], Error, /^エラーメッ/)          // 引数あり呼び出し指定したError型とメッセージの型か確認する
    fe(...args) {
        if (args.length < 2) {throw new TestError(`fn()の引数は二つ以上必要です。`)}
        if (!isFn(args[0])) {throw new TestError(`fn()の第一引数は関数オブジェクトであるべきです。`)}
        if (2===args.length) {this.#addCase(args[0], this.#mkErrExpected(args[1]), []);}
        else if (3===args.length) {
            if (Array.isArray(args[1])) {// 引数あり
                this.#addCase(args[0], this.#mkErrExpected(args[2]), args[1]);
            } else {// 引数なし
                this.#addCase(args[0], this.#mkErrExpected(args[1], args[2]), []);
            }
        }
        else if (4===args.length) {
            this.#addCase(args[0], this.#mkErrExpected(args[2], args[3]), args[1]);
        }
    }
    // 指定した関数が例外発生することを確認する
    // 引数パターン
    //   複数形 12
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], Error)              // 複数の引数パターンでテストする
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], 'メッセージ')     
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], /^メッセ/)        
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], new Error('メッセージ'))
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], Error, 'メッセージ')
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], Error, /^メッセ/)
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], (i, args)=>Error])
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], (i, args)=>`メッセージ:${i}${args}`])
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], (i, args)=>new RegExp(`${i}${args}`)])
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], (i, args)=>new Error('メッセージ')])
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], (i, args)=>[Error, `メッセージ:${i}${args}`])
    //     (関数ポインタ, [[], [第一引数, 第二引数, ...], ...], (i, args)=>[Error, new RegExp(`${i}${args}`)])
    fes(...args) {
        if (args.length < 3 || 4 < args.length) {throw new TestError(`fn()の引数は三〜四つ必要です。`)}
        if (!isFn(args[0])) {throw new TestError(`fn()の第一引数は関数オブジェクトであるべきです。`)}
        if (!isNestAry(args[1])) {throw new TestError(`fn()の第二引数は引数パターンの配列であるべきです。例:[[], [第一引数, 第二引数, ...], [[第一引数が配列], 第二引数, ...], [[全引数が配列], [全引数が配列], ...], ...]`)}
        // テストケースを作成する
        for (let i=0; i<args[1].length; i++) {
            const A = args[1][i];
            if (isFn(args[2])) {// 期待値を式で算出する記法
                const expected = args[2](i, A); // 実行時エラーが起きうる！
                const E = Array.isArray(expected) ? this.#mkErrExpected(...expected) : this.#mkErrExpected(expected);
                this.#addCase(args[0], E, A, i);
            } else {
                     if (3===args.length) {this.#addCase(args[0], this.#mkErrExpected(args[2]), A);}
                else if (4===args.length) {this.#addCase(args[0], this.#mkErrExpected(args[2], args[3]), A);}
            }
        }
    }
    #addCase(fn, ret, args, argsPtnIdx) {
        const isAsync = isAFn(args[0]) || isAGFn(args[0]),
              isGenerator = isGFn(args[0]) || isAGFn(args[0]);
        const o = {
            id: this._.id++,
            expected: ret,
            test() {this.fn.ret = args[0]();},
            //test: ()=>args[0](), // 戻り値が確認できない！
            /*
            test: ()=>{
                try {
                    const expected = args[1];
                    const actual = args[0]();
                    if (expected===actual) {this._.posTry(c)}; // success;
                    else {this._.posCatch(c)} // fail 関数の戻り値が期待値と違います。
                } catch (e) {
                    // fail 例外発生
                }
            },
            */
            fn: {// このパラメータから上記テストコードを生成してテスト実施すべき
                fn: fn,
                args: args,
                ret: undefined,
            },
            isAsync: isAsync,
            isGenerator: isGenerator,
            notFn: false,
            traces: (new Error('スタックトレースを取得')).stack.split('\n'),
        };
        if (isSafeInt(argsPtnIdx)) {o.fn.argsPtnIdx=argsPtnIdx}
        this._.cases.push(o);
    }
    #mkErrExpected(...args) {
        if (2===args.length) {
            if (!(isErrCls(args[0]) && (isS(args[0]) || isReg(args[0])))) {throw new TestError(`fe()の期待値を引数2個で指定した時、Errorクラス、メッセージ文字列か正規表現を示すStringかRegExpであるべきです。`)}
            return {type:args[0], msg:args[1]}
        }
        else if (1===args.length) {
            const expected = {type:null, msg:null};
            if (isErrCls(args[0])) {expected.type = args[0]}
            else if (isErrIns(args[0])) {expected.type = args[0].constructor; expected.msg = args[0].message; }
            else if (isS(args[0]) || isReg(args[0])) {expected.msg = args[0]}
            else {throw new TestError(`fe()で引数が2個の時、第二引数はErrorクラスオブジェクトかエラーメッセージを示すStringかRegExpであるべきです。`)}
        } else {throw new TestError(`fe()の期待値を指定してください。Errorクラスオブジェクトやエラーメッセージを示すStringかRegExpが必要です。`)}
    }
}
class ClassAssertion extends Assertion {
    constructor() {
        super();
        this._.cls = {cls:null};
    }
    // クラスオブジェクトを確認する
    //cls(...args) {
    cls(cls, fn) {// cls:テスト対象クラス, fn:(a,cls)=>{テストコード定義}
        if (!(isCls(cls) && isFn(fn))) {throw new TestError(`cls()の引数はテスト対象クラスとテストコード定義メソッドの二つのみ有効です。`)}
        this._.cls.cls = cls;
        // クラス関係テストコード定義
        const a = new ClassObjectAssertion(this.#addCase(this._.cls));
        isAFn(a) ? fn(a).then(()=>{/*完了処理*/}).catch(e=>{throw e}) : fn(a);
        // クラス関係テストコード定義
        // fn(); asyncの場合も実行したい。
        // Sync,Async各テスト実行はしない？
        // Promise.allSettled(acs.map(a=>a.test())).then((results)=>{
    }
    #addCase(cls) {
        const isAsync = isAFn(args[0]) || isAGFn(args[0]),
              isGenerator = isGFn(args[0]) || isAGFn(args[0]);
        const o = {
            id: this._.id++,
            expected: ret,
            cls: {
                cls: cls,
            },
//            test() {this.fn.ret = args[0]();},
            /*
            fn: {// このパラメータから上記テストコードを生成してテスト実施すべき
                fn: fn,
                args: args
                ret: undefined,
            },
            isAsync: isAsync,
            isGenerator: isGenerator,
            */
            notFn: false,
            traces: (new Error('スタックトレースを取得')).stack.split('\n'),
        };
        if (isSafeInt(argsPtnIdx)) {o.fn.argsPtnIdx=argsPtnIdx}
        this._.cases.push(o);
        return o;
    }
}
class ClassObjectAssertion {// クラスが持つものをテストする
    constructor(c) {
        this._ = {c:c, cases:[]};
    }
    has(name) {// 指定名プロパティを持っているか（変数、ディスクリプタ（ゲッター、セッター）、クラスメソッド）
        if (isS(name)) {
            //const c = this.#addCase(cls);
//            const c = this._.c;
            const c = this.#addCase();
            //c.test = ()=>Reflect(this._.c.cls.cls, name);
            c.test = ()=>{
                const has = Reflect.has(this._.c.cls.cls, name);
                if (!has) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} が存在しません。`)}
            };
        }
        else if (Array.isArray(name) && name.every(n=>isS(n))) {
            for (let i=0; i<name.length; i++) {
                const c = this.#addCase();
                c.cls.argsPtnIdx = i;
                c.test = ()=>{
                    const has = Reflect.has(this._.c.cls.cls, name);
                    if (!has) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} が存在しません。引数パターンidx:${i}`)}
                };
//                c.test = ()=>Reflect.has(c.cls.cls, name[i]);
//                c.problem = {
//                    fail: `クラスが所有することを期待したプロパティ ${name[i]} が存在しません。: `,
//                };
            }
        }
        else {throw new TestError(`has()は引数が文字列かその配列であるべきです。`)}
    }
    #addCase() {
        this._.c.id++
        const o = {...this._.c};
        this._.cases.push(o);
        return o;
    }
    // クラス変数の値を確認する
    // 引数パターン
    // (name, value)                                        // 戻り値がプリミティブ型に限る
    // (name, (actual)=>actual.var===1 && actual.some===2)  // 戻り値がオブジェクト型でも対応可
    // 
    // (name, (a)=>{a.v('someVar', 1); a.g('someGetter', 22)})  // Class.nameの取得結果がオブジェクト（クラス、インスタンス、{}、関数）により各種Assertが渡される
    //                                                          // でも↑はまず何の型が返るか明示的に確認したい。
    //                                                          // でも無数にある: 'class'/'instance'/'function'/'array'/'Map'/'Set'/.../'object'
    // (name, '戻り値の型', (a)=>{テスト定義})
    // (name, (actual, a)=>{a.t(actual instance SomeClass); a.v('someVar', 1); a.g('someGetter', 22)}) // 式の場合はこれが全てを包含する方法か
    v(name, expected) {// クラス変数
        this._.c.test = ()=>{
            if (!Reflect.has(this._.c.cls.cls, name)) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} が存在しません。`)}
            //const V = Reflect.get(this._.cls, name);
            const actual = Reflect.get(this._.cls, name);
            this.#callExpected(expected, actual); // 期待値がプリミティブorオブジェクト（複数要素を確認する必要がある）
        };
        return this; // メソッドチェーン可能にする
    }
    // クラスのゲッターが返す値を確認する
    // 引数パターン
    // (name, expected)                                        // 戻り値がプリミティブ型に限る
    // (name, (actual, a)=>{a.t(actual instance SomeClass); a.v('someVar', 1); a.g('someGetter', 22)}) // 式の場合はこれが全てを包含する方法か
    g(name, expected) {// クラスゲッター
        this._.c.test = ()=>{
            if (!Reflect.has(this._.c.cls.cls, name)) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} が存在しません。`)}
            if (!this._hasGetter(this._.c.cls.cls[name])){throw new AssertError(`クラスが所有する ${name} はゲッターであることを期待していますが非ゲッターです。`)};
            const actual = Reflect.get(this._.cls, name);
            if (actual!==expected) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} の値が期待値と違います。
期待値: ${expected}
実際値: ${actual}`)}
            this.#callExpected(expected, actual); // 期待値がプリミティブorオブジェクト（複数要素を確認する必要がある）
        };
    }
    // クラスのセッターを実行確認する
    // 引数パターン
    // (name, arg, expected)                                        // 戻り値がプリミティブ型に限る
    // (name, arg, (actual, a)=>{a.t(actual instance SomeClass); a.v('someVar', 1); a.g('someGetter', 22)}) // 式の場合はこれが全てを包含する方法か
    s(name, arg, expected) {// クラスセッター
        this._.c.test = ()=>{
            if (!Reflect.has(this._.c.cls.cls, name)) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} が存在しません。`)}
            if (!this._hasSetter(this._.c.cls.cls[name])){throw new AssertError(`クラスが所有する ${name} はセッターであることを期待していますが非セッターです。`)};
            const actual = Reflect.set(this._.cls, name, arg);
            if (actual!==expected) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} の値が期待値と違います。
期待値: ${expected}
実際値: ${actual}`)}
            this.#callExpected(expected, actual); // 期待値がプリミティブorオブジェクト（複数要素を確認する必要がある）
        };
    }
    // クラスのメソッドを実行確認する
    // 引数パターン
    // (name, args, expected)                                        // 戻り値がプリミティブ型に限る
    // (name, args, (actual, a)=>{a.r('acualの値'); a.t(actual instance SomeClass); a.v('someVar', 1); a.g('someGetter', 22)}) // 式の場合はこれが全てを包含する方法か
    m(name, arg, expected) {// クラスメソッド
        this._.c.test = ()=>{
            if (!Reflect.has(this._.c.cls.cls, name)) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} が存在しません。`)}
            if (!this._hasSetter(this._.c.cls.cls[name])){throw new AssertError(`クラスが所有する ${name} はセッターであることを期待していますが非セッターです。`)};
            const actual = Reflect.set(this._.cls, name, arg);
            if (actual!==expected) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} の値が期待値と違います。
期待値: ${expected}
実際値: ${actual}`)}
            this.#callExpected(expected, actual); // 期待値がプリミティブorオブジェクト（複数要素を確認する必要がある）
        };
    }
    // 例外発生を期待するテストケース
    ge(name, ...expecteds) {}
    se(name, ...expecteds) {}
    me(name, ...expecteds) {}
    // ゲッター・セッター用
    _isPropertyDescriptor(obj) {return this.#isPropertyDescriptor(obj)}
    _hasGetter(obj) {return this.#isPropertyDescriptor(obj, 1)}
    _hasSetter(obj) {return this.#isPropertyDescriptor(obj, 2)}
    #isPropertyDescriptor(obj, gs=0) {// gs:0:get+set, gs:1:get, gs:2:set
        if (typeof obj !== 'object' || obj === null) {return false;}
        // データディスクリプタまたはアクセサディスクリプタの必須キーをチェック
        const hasValueOrWritable = 'value' in obj || 'writable' in obj;
        const hasGetterOrSetter = 0===gs
            ? ('get' in obj || 'set' in obj)
            : (1===gs
                ? 'get' in obj
                : (2===gs
                    ? 'set' in obj
                    : (()=>{throw Error(`プログラムエラー。gsは0,1,2のいずれかのみ有効です。`)})()));
        return hasValueOrWritable || hasGetterOrSetter;
    }
    #callExpected(expected, actual) {
        // もし期待値がオブジェクトならどう判定する？　任意式で判定させる。
        if (isSFn(expected)) {// 判定を式で行う場合（戻り値がオブジェクトであり複数の値を確認する必要があり単純な===判定不能な場合）
            // もしインスタンスが変えるなら(a)=>{a.var('期待値')}のような専用式で定義したい
            // 但しクラス、インスタンス、オブジェクト、関数のようにオブジェクトの種類毎に異なるAssertionインスタンスを渡す必要がある
            const a = isCls(actual)
                ? new ClassObjectAssertion(this._.c)
                : (isIns(actual)
                    ? new InstanceAssertion(this._.c)
                    : (isObj(actual)
                        ? new ObjectAssertion(this._.c)
                        : (isFn(actual)
                            ? new ObjectAssertion(this._.c)
                            : new GeneralAssertion(this._.c)))); // a.t(),a.f(),a.e()
            const R = expected(actual, a); // (actual, assertion)
//                const R = expected(actual);
            this._.c.resultType = R ? 'success' : 'fail'; 
            if (!R) {throw new AssertError(`クラスが所有することを期待したプロパティ ${name} の値を判定する式がfalseを返しました。:戻り値:${actual}`)}
        } else {
            if (actual!==expected) {this._.c.resultType='fail'; throw new AssertError(`クラスが所有することを期待したプロパティ ${name} の値が期待値と違います。
期待値: ${expected}
実際値: ${actual}`)}
            this._.c.resultType = expected===actualR ? 'success' : 'fail'; 
        }

    }
}
class InstanceAssertion {
    // コンストラクタを確認する
    ins(...args) {}
}
class VariableAssertion {// インスタンス変数を確認する
    v(...args) {}
}
class MethodAssertion {// メソッドを確認する
    m(...args) {}
}
class MethodArgumentAssertion {// メソッド引数を確認する
    a(...args) {}
}
class MethodReturnAssertion {// メソッド実行結果を確認する
    r(...args) {}
    times(times=1) {} // 所定のコールバック関数の引数（モック／スパイ）は何回呼ばれたか
    a(...args) {} // 所定のコールバック関数の引数（モック／スパイ）は何の引数を渡されたか
}
class GetterAssertion {// 
    g(...args) {}
}
class SetterAssertion {
    s(...args) {}
}
class HtmlAssertion {
    html(...args) {}
}
class NodeAssertion {
    set type(v) {}
    set tagName(v) {}
    set textContent(v) {}
}
class CssAssertion {
    css(...args) {}
    get rules() {}
}
class CssRuleAssertion {
    get selector() {}
}
class CssPairAssertion {
    get key() {}
    get value() {}
}


class AssertStatus {
    static get #data() {return ({
        pending:   {code:3, label:'保留', color:{f:'#666666',b:'#CCCCCC'}},
        exception: {code:2, label:'例外', color:{f:'#0000AA',b:'#99CCFF'}},
        fail:      {code:1, label:'失敗', color:{f:'#AA0000',b:'#FFABCE'}},
        success:   {code:0, label:'成功', color:{f:'#008800',b:'#AEFFBD'}},
    })}
    static get codes() {return this.#data.map(d=>d.code)}
    static get names() {return Object.keys(this.#data)}
    static getNameOfCode(code) {console.log(code, Object.entries(this.#data), Object.entries(this.#data).filter(v=>v[1].code===code));return Object.entries(this.#data).filter(v=>v[1].code===code)[0][0]}
    static getLabel(nc) {return this.#get('Label', nc)}
    static getColor(nc) {return this.#get('Color', nc)}
    static #get(target, nc) {
        console.log(target, nc);
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
    static #log(status, c) {console.log(`%c${c.msg}\n${this.#testCode(c)}\n${c.stacks.join('\n')}`, `background-color:${AssertStatus.getColor(status).b};color:${AssertStatus.getColor(status).f};`)}
//    static #log(status, c) {console.log(`%c${c.msg}\n${this.#testCode(c)}\n${c.stacks.join('\n')}`, `background-color:${Status[status].color.b};color:${Status[status].color.f};`)}
    //static #testCode(c) {const hasCode = 'codeStr' in c; return `対象id:${c.id}` + ` ${hasCode ? '予想' : ''}コード:` + (hasCode ? c.codeStr : `${c.test}`);}
    static #testCode(c) {return `対象id:${c.id}` + ` ${c.notFn ? '' : 'コード:' + c.test.toString()}`;}
}
class ResultLog {
    constructor(a) {
        this._ = {a:a, syncs:{P:0, S:0, F:0, E:0}, asyncs:{S:0, F:0, E:0}, all:{S:0, F:0, E:0}};
    }
    target(scripts) {console.log(scripts);if (Array.isArray(scripts) && 0<scripts.length) {console.log(`テスト対象:`, scripts.at(-1).src); scripts.slice(0, -1).map(script=>console.log(`依存コード:`, script.src))}}
    throw(e) {console.error(e)}
    syncs(status) {if (0 < this._.a._asyncs.length){this.#log(this.#getPs('syncs', status))}}
    asyncs(status) {if (0 < this._.a._asyncs.length){this.#log(this.#getPs('asyncs', status))}}
    all(status) {this.#log(this.#getPs('all', status))}
    #getPs(name, status) {
        const R = '100%'===status.percent ? 'success' : 'pending';
        console.log(name, status instanceof AssertStatus, status, status[name]);
        //return [[`${status[name].name} ${status[name].percent} ${status[name].all}`, R], ...'pending exception fail success'.split(' ').map(n=>[`${Status[n].label}:${status[name][n]}`, n])].map(ln=>this.#getP(...ln))
        return [[`${status[name].name} ${status[name].percent} ${status[name].all}`, R], ...'pending exception fail success'.split(' ').map(n=>[`${AssertStatus.getLabel(n)}:${status[name][n]}`, n])].map(ln=>this.#getP(...ln))
    }
    //#getP(label, n){return ({label:label, format:`background-color:${Status[n].color.b};color:${Status[n].color.f};`});}
    #getP(label, n){return ({label:label, format:`background-color:${AssertStatus.getColor(n).b};color:${AssertStatus.getColor(n).f};`});}
    #log(P) {console.log(P.reduce((s,p)=>s+`%c${p.label} `, '').trim(), ...P.map(p=>p.format))}
}
// テスト結果を表示する。
// * テスト中例外発生（テストコード問題箇所と、修正内容の提示）
// * テスト正常終了（合否。比率。内訳（保留、例外、失敗、成功の件数）。問題箇所の表示一覧）
class ResultHtml {
    constructor(a){this._={id:'unitest-result', a:a, el:{root:null, throw:null, success:null, count:null, problem:null}}; this.#makeRootEl();}
    throw(e) {// テスト実行中に例外発生した時の表示
        this._.el.throw.display = 'block';
        this._.el.throw.style.backgroundColor = AssertStatus.getColor('exception').b;
        this._.el.throw.style.color = AssertStatus.getColor('exception').f;
//        this._.el.throw.style.backgroundColor = Status.exception.color.b;
//        this._.el.throw.style.color = Status.exception.color.f;
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
        //StatusCodeOfNames.toReversed().map(n=>{
        AssertStatus.names.map(n=>{
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
    #makeStyleCss() {return `<style id="${this._.id}-style">table{border-collapse:collapse; border-spacing:0;}td,th{padding:0.25em;}${AssertStatus.names.toReversed().map(n=>`.${n} {background-color:${AssertStatus.getColor(n).b}; color:${AssertStatus.getColor(n).f}; }`).join('\n')}</style>`;}
    //#makeStyleCss() {return `<style id="${this._.id}-style">table{border-collapse:collapse; border-spacing:0;}td,th{padding:0.25em;}${StatusCodeOfNames.map(n=>`.${n} {background-color:${Status[n].color.b}; color:${Status[n].color.f}; }`).join('\n')}</style>`;}
    #makeCountTableHtml(name,status) {return `<table id="${this._.id}-count">${this.#makeCountTrsHtml(name,status)}<table>`;}
    #makeCountTrsHtml(name,status) {return AssertStatus.names.map(n=>this.#makeCountTrHtml(n, status[name][n])).join('')}
    //#makeCountTrsHtml(name,status) {return StatusCodeOfNames.toReversed().map(n=>this.#makeCountTrHtml(n, status[name][n])).join('')}
    #makeCountTrHtml(statusName, num) {const N=statusName;return `<tr class="${N}"><th>${AssertStatus.getLabel(N)}</th><td id="${N}-count">${num}</td></tr>`}
    //#makeCountTrHtml(statusName, num) {const N=statusName;return `<tr class="${N}"><th>${Status[N].label}</th><td id="${N}-count">${num}</td></tr>`}
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
        //tr.className = StatusCodeOfNames[c.statusCode];
        tr.className = AssertStatus.getNameOfCode(c.statusCode);
        tr.dataset.id = c.id;
        const td0 = document.createElement('td');
        const td1 = document.createElement('td');
        const td2 = document.createElement('td');
        td0.className = ``;
        td0.innerHTML = c.msg.split('\n').join('<br>');
        const code = c.notFn ? '' : c.test.toString(); 
        td1.innerHTML = `対象id:${c.id}${code ? '<br>コード:'+code : ''}`;
        //td1.innerHTML = `対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}`;
//        td2.innerHTML = c.stacks.join('<br>');
        td2.innerHTML = this.#stackTrace(c);
        tr.append(td0, td1, td2);
        return tr;
    }
    #makeProblemTrsHtml(name,status) {
        const records = this._.a._.cases.filter(c=>[1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id);
        return 0===records.length ? '' : records.map(c=>this.#makeProblemTrHtml(c)).join('\n');
    }
    #makeProblemTrHtml(c) {console.log(c);return `<tr class="${AssertStatus.getNameOfCode(c.statusCode)}" data-id="${c.id}"><td>${c.msg.split('\n').join('<br>')}</td><td>対象id:${c.id}${c.notFn ? '' : '<br>コード:'+c.test.toString()}</td><td>${this.#stackTrace(c)}</td></tr>`}
    //#makeProblemTrHtml(c) {console.log(c);return `<tr class="${StatusCodeOfNames[c.statusCode]}" data-id="${c.id}"><td>${c.msg.split('\n').join('<br>')}</td><td>対象id:${c.id}${c.notFn ? '' : '<br>コード:'+c.test.toString()}</td><td>${this.#stackTrace(c)}</td></tr>`}
    //#makeProblemTrHtml(c) {console.log(c);return `<tr class="${StatusCodeOfNames[c.statusCode]}" data-id="${c.id}"><td>${c.msg.split('\n').join('<br>')}</td><td>対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}</td><td>${this.#stackTrace(c)}</td></tr>`}
    //#makeProblemTrHtml(c) {console.log(c);return `<tr class="${StatusCodeOfNames[c.statusCode]}" data-id="${c.id}"><td>${c.msg.split('\n').join('<br>')}</td><td>対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}</td><td>${c.stacks ? c.stacks.join('<br>') : ''}</td></tr>`}
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

        if (!stacks.some(v=>-1<v.indexOf(traces[0]))) {stacks.unshift(traces[0])} // テストコード定義箇所を追記する
        //return stacks.filter(v=>-1===v.indexOf(THIS_FILE_NAME)).join('<br>');
        return stacks.filter(v=>-1===v.indexOf(THIS_FILE_NAME)).map(v=>v.replaceAll(ROOT_DIR_PATH,'(略)')).join('<br>');
    }
}
class Result {
    constructor(a) {this._={a:a, log:new ResultLog(a), html:new ResultHtml(a), status:new AssertStatus(a)}}
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
