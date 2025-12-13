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
const THIS_FILE = 'unitest.js:';
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
//    pending:   {name:'保留', color:{f:'#666666',b:'#CCCCCC'}},
//    exception: {name:'例外', color:{f:'#0000AA',b:'#99CCFF'}},
//    fail:      {name:'失敗', color:{f:'#AA0000',b:'#FFABCE'}},
//    success:   {name:'成功', color:{f:'#008800',b:'#AEFFBD'}},
};
const isSafeInt = (v)=>Number.isSafeInteger(v),
      isStr = (v)=>'string'===typeof v;
const StatusCodeOfNames = ['success', 'fail', 'exception', 'pending'];
class Unitest {
    constructor() {
        this._ = {st:new StackTracer(), fn:null, tcs:null, rl:null, a:null};
    }
    assert(fn) {
        const a = new Assertion();
        this._.a = a;
        this._.tcs = new TestCodeStr(fn);
        this.#define(a, fn); // テストケースの定義
        this.#test(a);       // テストケースの実行
        this.#show(a);       // テストケースの表示
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
//        this._.rl = new ResultLog(a);
        this._.result = new Result(a);
        // 同期系のテストだけを実行する
//        a._.cases.filter(c=>!c.isAsync).map(c=>this.#case(c)); // 同期テストは即時実行する
        this._.a._.cases.filter(c=>!c.isAsync).map(c=>this.#case(c)); // 同期テストは即時実行する
//        for (let i=0; i<a._.cases.length; i++) {if(!a._.cases[i].isAsync){this.#case(a._.cases, i)}} // 同期テストは即時実行する


        //a._.cases.filter(c=> c.isAsync).map(c=>c.statusCode=3); // 非同期テストは保留状態にする
        //const acs = a._.cases.filter(c=>c.isAsync); // 非同期系テストケース一覧
        const acs = this._.a._.cases.filter(c=>c.isAsync); // 非同期系テストケース一覧
        acs.map(c=>c.statusCode=3); // 非同期テストは保留状態にする
        //if (0<acs.length) {this._.rl.syncs();} // 同期系テスト結果ログ表示
        //if (0<acs.length) {this._.result.syncs();} // 同期系テスト結果ログ表示
        this._.result.syncs(); // 同期系テストのみ結果表示(HTML+LOG)
        // HTML画面を更新する(ToDo)
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
//                this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
            }
//            // 結果をログ表示する
//            if (0<results.length) {this._.rl.asyncs();}
//            this._.rl.all();    // 全テスト結果ログ表示
            // HTML画面を更新する(ToDo)
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
        //c = this._.a._.cases.filter(C=>C.id===c.id)[0];
//        c = this._.a._.cases[this._.a._.cases.findIndex(C=>C.id===c.id)];
        try {c.actual = c.test(); isB(c.expected) ? this.#posTry(c) : this.#negTry(c);}
        catch (e) {isB(c.expected) ? this.#posCatch(c,e) : this.#negCatch(c,e);}
//        finally {this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};}
    }
    #posTry(c) {
//        c = this._.a._.cases[this._.a._.cases.findIndex(C=>C.id===c.id)];
        if (c.expected===c.actual) {c.statusCode=0} // succeed
        else {
            c.statusCode=1; // Failed
            c = {...c, ...this.#makeStacks(AssertError, `テスト失敗。${c.expected ? '真' : '偽'}が期待される所で${c.actual}になりました。`)};
            if (c.notFn) {c.codeStr = this._.tcs.get(c);}
            Console.fail(c);
        }
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #posCatch(c, e) {
        //c = this._.a._.cases.filter(C=>C.id===c.id)[0];
//        c = this._.a._.cases[this._.a._.cases.findIndex(C=>C.id===c.id)];
        c.statusCode=2; // Exception
        c = {...c, ...this.#makeStacks(AssertError, `テスト例外。真偽値が期待される所で例外発生しました。`, e)};
        if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        Console.exception(c);
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #negTry(c) {
        //c = this._.a._.cases.filter(C=>C.id===c.id)[0];
//        c = this._.a._.cases[this._.a._.cases.findIndex(C=>C.id===c.id)];
        c.statusCode=1; // Failed
        c = {...c, ...this.#makeStacks(AssertError, `テスト失敗。例外発生が期待される所で発生しなかった。`)};
        if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        Console.fail(c);
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #negCatch(c, e) {
        //c = this._.a._.cases.filter(C=>C.id===c.id)[0];
//        c = this._.a._.cases[this._.a._.cases.findIndex(C=>C.id===c.id)];
        const isFailedType = e.constructor.name !== c.expected.type.name;
        const isFailedMsg = undefined===c.expected.msg
            ? false
            : (isS(c.expected.msg)
                ? e.message!==c.expected.msg
                : !e.message.match(c.expected.msg));
        const msg = this.#getNegCatchMsg(c, e, isFailedType, isFailedMsg)
        c.statusCode = msg ? 1 : 0; // Failed/Succeed
        if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        if (msg) {
            c = {...c, ...this.#makeStacks(AssertError, msg, e)};
            Console.fail(c);
        }
        this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)] = {...this._.a._.cases[this._.a._.cases.findIndex(v=>v.id===c.id)], ...c};
    }
    #getNegCatchMsg(c, e, isFailedType, isFailedMsg) {
        //c = this._.a._.cases.filter(C=>C.id===c.id)[0];
//        c = this._.a._.cases[this._.a._.cases.findIndex(C=>C.id===c.id)];
        const i = (isFailedMsg << 1) | isFailedType
        const msg = ['','型が','メッセージが','型もメッセージも'][i];
        const E = [c.expected.type.name, c.expected.msg];
        const A = [e.constructor.name, e.message];
        console.log('i:',i, 'c.expected.msg:',c.expected.msg, c);
        return msg ? `テスト失敗。例外の${msg}違います。\n期待値:${3===i ? E.join(', ') : E[i-1]}\n実際値:${3===i ? A.join(', ') : A[i-1]}` : msg;
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
    /*
    get _statuses() {
        const P = asyncs.filter(c=>3===c.statusCode).length, // 保留 Pending
              E = asyncs.filter(c=>2===c.statusCode).length, // 例外 Exception
              F = asyncs.filter(c=>1===c.statusCode).length, // 失敗 Failed
              S = asyncs.filter(c=>0===c.statusCode).length, // 成功 Succeed
              A = P+E+F+S,                                   // 全件 All
              R = (S/A);                                     // 比率 Rate (0〜1)
        //return ({P:P, E:E, F:F:, S:S, A:A, R:R});
        return ({pending:P, exception:E, fail:F, success:S, all:A, rate:R});
    }
    get _syncStatuses() {
        const cases = this._syncs;
        const P = cases.filter(c=>3===c.statusCode).length, // 保留 Pending
              E = cases.filter(c=>2===c.statusCode).length, // 例外 Exception
              F = cases.filter(c=>1===c.statusCode).length, // 失敗 Failed
              S = cases.filter(c=>0===c.statusCode).length, // 成功 Succeed
              A = E+F+S,                                    // 全件 All（Pを除く）
              R = (S/A);                                    // 比率 Rate (0〜1)
        return ({pending:P, exception:E, fail:F, success:S, all:A, rate:R});
    }
    get _asyncStatuses() {
        const cases = this._asyncs;
        const P = cases.filter(c=>3===c.statusCode).length, // 保留 Pending
              E = cases.filter(c=>2===c.statusCode).length, // 例外 Exception
              F = cases.filter(c=>1===c.statusCode).length, // 失敗 Failed
              S = cases.filter(c=>0===c.statusCode).length, // 成功 Succeed
              A = P+E+F+S,                                   // 全件 All
              R = (S/A);                                     // 比率 Rate (0〜1)
        return ({pending:P, exception:E, fail:F, success:S, all:A, rate:R});

    }
    get _allStatuses() {
        const cases = this._.cases;
        const P = cases.filter(c=>3===c.statusCode).length, // 保留 Pending
              E = cases.filter(c=>2===c.statusCode).length, // 例外 Exception
              F = cases.filter(c=>1===c.statusCode).length, // 失敗 Failed
              S = cases.filter(c=>0===c.statusCode).length, // 成功 Succeed
              A = P+E+F+S,                                  // 全件 All
              R = (S/A);                                    // 比率 Rate (0〜1)
        return ({pending:P, exception:E, fail:F, success:S, all:A, rate:R});
    }
    */
    #getExpected(v, w) {
        if ('boolean'===typeof v || isErrIns(v)) {return v}
        else if (isErrCls(v) && (isS(w) || isReg(w))) {return {errCls:v, msg:w}}
        else {throw new TypeError(`入力値不正。#getExpected()`)}
    }
    #makeTestFn(expected, ...args) {// expected: true/false/new Error('message')/Error + (msg)=>msg.match(/^some$/)/RegExp
        const L = args[args.length-1];
//        console.log('#makeTestFn引数:', expected, ...args, args.length, 0===args.length ? false : isAFn(L));
//        console.log(isErrCls(expected) , 1===args.length , isFn(L));
//        console.log(expected, isFn(expected), expected.toString?.(), Boolean(expected.toString?.().match(/^class /)), isCls(expected) , expected.prototype instanceof Error);
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
//    static getLabel(nc) {return isSafeInt(nc) ? this.#getLabelFromCode(nc) : (isStr(nc) ? this.#getLabelFromName(nc) : (()=>{throw new TypeError(`ncは状態名Stringか状態コードNumberであるべきです。`)})())}
//    static getColor(nc) {return isSafeInt(nc) ? this.#getLabelFromCode(nc) : (isStr(nc) ? this.#getLabelFromName(nc) : (()=>{throw new TypeError(`ncは状態名Stringか状態コードNumberであるべきです。`)})())}
//    static #get(nc, target) {return isSafeInt(nc) ? this[`_get${Target}FromCode`](nc) : (isStr(nc) ? this[`_get${Target}FromName`](nc) : (()=>{throw new TypeError(`ncは状態名Stringか状態コードNumberであるべきです。`)})())}
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
    //static _getLabelFromName(name) {return this.#data[name].label}
//    static _getColorFromName(name) {return this.#data[name].color}
//    static _getLabelFromCode(code) {return this.#data.filter(d=>d.code===code)[0].color}
    constructor(a) {this._={a:a, status:{syncs:null, asyncs:null, all:null}}}
    get #syncCases() {return this._.a._.cases.filter(c=>!c.isAsync)} // 同期系テストケース一覧
    get #asyncCases() {return this._.a._.cases.filter(c=>c.isAsync)} // 非同期系テストケース一覧
    get #allCases() {return this._.a._.cases} // 全テストケース一覧
    get syncs() {return this.#gets('syncs', this.#syncCases)}
    get asyncs() {return this.#gets('asyncs', this.#asyncCases)}
    get all() {return this.#gets('all', this.#allCases)}
    #gets(name, cases) {
//        console.log(`AssertStatus#gets(name, cases):`, name, cases);
        if (null!==this._.status[name]) {return this._.status[name]} // 一度だけ算出する。以降の参照は使いまわし。
        //const P = 'syncs'===name ? this._.a._.cases.filter(c=>c.isAsync).length : cases.filter(c=>3===c.statusCode).length, // 保留 Pending
        const P = cases.filter(c=>3===c.statusCode).length, // 保留 Pending
              E = cases.filter(c=>2===c.statusCode).length, // 例外 Exception
              F = cases.filter(c=>1===c.statusCode).length, // 失敗 Failed
              S = cases.filter(c=>0===c.statusCode).length, // 成功 Succeed
              A = E+F+S+('syncs'===name ? 0 : P),           // 全件 All（syncsの時だけPを除外する）
              R = (S/A);                                    // 比率 Rate (0〜1)
        this._.status[name] = ({pending:P, exception:E, fail:F, success:S, all:A, rate:R, percent:`${(R*100).toFixed(0)}%`, name:('syncs'===name ? '同期テストのみ' : ('asyncs'===name) ? '非同期テストのみ' : '全テスト完了')});
        return this._.status[name];
        //return (this._.status[name] = ({pending:P, exception:E, fail:F, success:S, all:A, rate:R, percent:`${(R*100).toFixed(0)}%`, name:('sync'===name ? '同期テストのみ' : ('async'===name) ? '非同期テストのみ' : '全テスト完了')}));
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
        //const s = Array.isArray(stacks) ? stacks : (this.__isStr(stacks) ? stacks.split('\n') : null)
        const s = Array.isArray(stacks) ? stacks : (isS(stacks) ? stacks.split('\n') : null)
        if (null===s) { throw new AssertError(`内部エラー。#delStacksの引数は文字列かその配列であるべきです。`, 'exception') }
        return s.filter(line=>-1===line.indexOf(THIS_FILE))
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
        if (!removeTxt) {removeTxt=THIS_FILE} // このファイル名が含まれるスタックトレースは削除する
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
    constructor(a) {
        this._ = {a:a, syncs:{P:0, S:0, F:0, E:0}, asyncs:{S:0, F:0, E:0}, all:{S:0, F:0, E:0}};
    }
//    syncs(status) {this.#log(this.#getPs(status))}
//    asyncs(status) {this.#log(this.#getPs(status))}
    syncs(status) {if (0 < this._.a._asyncs.length){this.#log(this.#getPs('syncs', status))}}
    asyncs(status) {if (0 < this._.a._asyncs.length){this.#log(this.#getPs('asyncs', status))}}
    all(status) {this.#log(this.#getPs('all', status))}
    #getPs(name, status) {
        const R = '100%'===status.percent ? 'success' : 'pending';
        //console.log(name, status, AssertStatus.getLabel(name));
        console.log(name, status instanceof AssertStatus, status, status[name]);
        return [[`${status[name].name} ${status[name].percent} ${status[name].all}`, R], ...'pending exception fail success'.split(' ').map(n=>[`${Status[n].label}:${status[name][n]}`, n])].map(ln=>this.#getP(...ln))
    }
    #getP(label, n){return ({label:label, format:`background-color:${Status[n].color.b};color:${Status[n].color.f};`});}
    #log(P) {console.log(P.reduce((s,p)=>s+`%c${p.label} `, '').trim(), ...P.map(p=>p.format))}
}
/*
class ResultLog {
    constructor(a) {
        this._ = {a:a, syncs:{P:0, S:0, F:0, E:0}, asyncs:{S:0, F:0, E:0}, all:{S:0, F:0, E:0}};
    }
    #getP(N,R,E,F,S) {return [{name:`${N}:${0===E && 0===F ? 100 : ((S/(E+F+S))*100).toFixed(0)}% ${E+F+S}`, format:`background-color:${Status[R].color.b};color:${Status[R].color.f}`}, ...[['exception',E],['fail',F],['success',S]].filter(p=>0<p[1]).map(p=>({name:`${Status[p[0]].name}:${p[1]}`, format:`background-color:${Status[p[0]].color.b};color:${Status[p[0]].color.f};`}))]}
    #log(P) {console.log(P.reduce((s,p)=>s+`%c${p.name} `, '').trim(), ...P.map(p=>p.format))}
    syncs() {
//        console.log(`ResultLog.syncs:a:`, this._.a._.cases.length);
        this._.syncs.P = this._.a._asyncs.length;
        const syncs = this._.a._syncs; // 同期系テスト一覧
//        console.log('syncs:', syncs);
        this._.syncs.S = syncs.filter(c=>0===c.statusCode).length;
        this._.syncs.F = syncs.filter(c=>1===c.statusCode).length;
        this._.syncs.E = syncs.filter(c=>2===c.statusCode).length;
        const R = (0===this._.syncs.E && 0===this._.syncs.F) ? 'success' : 'pending';
        this.#log(this.#getP(`同期テストのみ`, R, this._.syncs.E, this._.syncs.F, this._.syncs.S));
        if (0<this._.syncs.P) {console.log(`%c非同期テスト保留:${this._.syncs.P}`, `background-color:${Status['pending'].color.b};color:${Status['pending'].color.f}`);}
    }
    asyncs() {
//        console.log(`ResultLog.asyncs:a:`, this._.a._.cases.length);
        const asyncs = this._.a._asyncs; // 非同期系テスト一覧
//        console.log('asyncs:', asyncs);
        this._.asyncs.S = asyncs.filter(c=>0===c.statusCode).length;
        this._.asyncs.F = asyncs.filter(c=>1===c.statusCode).length;
        this._.asyncs.E = asyncs.filter(c=>2===c.statusCode).length;
        console.log();
        const R = (0===this._.asyncs.E && 0===this._.asyncs.F) ? 'success' : 'pending';
        this.#log(this.#getP(`非同期テストのみ`, R, this._.asyncs.E, this._.asyncs.F, this._.asyncs.S));
    }
    all() {
        console.log(`ResultLog.all:a:`, this._.a._.cases.length);
        this._.all.S = this._.a._.cases.filter(c=>0===c.statusCode).length;
        this._.all.F = this._.a._.cases.filter(c=>1===c.statusCode).length;
        this._.all.E = this._.a._.cases.filter(c=>2===c.statusCode).length;
        const R = (0===this._.all.E && 0===this._.all.F) ? 'success' : 'pending';
        this.#log(this.#getP(`全テスト完了`, R, this._.all.E, this._.all.F, this._.all.S));
    }
}
*/
// テスト結果を表示する。
// * テスト中例外発生（テストコード問題箇所と、修正内容の提示）
// * テスト正常終了（合否。比率。内訳（保留、例外、失敗、成功の件数）。問題箇所の表示一覧）
class ResultHtml {
    constructor(a){this._={id:'unitest-result', a:a, el:{root:null, throw:null, success:null, count:null, problem:null}}; this.#makeRootEl();}
    throw(e) {// テスト実行中に例外発生した時の表示
        this._.el.throw.display = 'block';
        this._.el.throw.style.backgroundColor = Status.exception.color.b;
        this._.el.throw.style.color = Status.exception.color.f;
        if (this._.el.success) {this._.el.success.display = 'none'}
        this._.el.throw.innerHTML = `<p>${e.message}</p><br><p>${e.stack.split('\n').join('<br>')}</p>`;
    }
    //syncs(status) {this.#update('syncs', status)}
    syncs(status) {this.#makeSuccessEl(status);}
    //asyncs(status) {this.#update('asyncs', status)}
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
        /*
        this._.el.root.appendChild(this.#makeStyleEl());
        this._.el.count = document.createElement('table');
        this._.el.problem = document.createElement('table');
        this._.el.root.success.append();
        this._.el.root.success.append();
//        this.#makeCountTableHtml({pending:0, exception:0, fail:0, success:0, all:0, name:'', percent:'0%'}); // status
        */
    }
    #update(name, status) {// name:工程名, status:保留,例外,失敗,成功の数
        console.log('ResultHtml.#update():', name, status);
        this.#updateCountTable(name, status);
        this.#updateProblemTable(name, status);
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
        //const table = document.querySelector(`#${this._.id}-problem`);
//        const table = document.querySelector(`#${this._.id}-problem`);
        const tbody = document.querySelector(`#${this._.id}-problem tbody`);
        const trs = [...tbody.querySelectorAll(`tr`)];
//        const tblIds = [...this._.el.problem.querySelectorAll(`tr`)].map(tr=>parseInt(tr.dataset.id));
        //for (let c of status.asyncStatuses.filter(c=>[1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id)) {
        for (let c of this._.a._.cases.filter(c=>c.isAsync && [1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id)) {
            const conds = trs.filter(tr=>c.id < parseInt(tr.dataset.id)).sort(); // 挿入先候補
            const tr = this.#makeProblemTdTrEl(c); // 追加するtr
            if (0===conds.length) {tbody.appendChild(tr)} else {conds[0].before(tr)}
        }
        this._.el.contentVisiblity = 'auto';


        if (!this._.el.problem) { // 新規作成
            /*
            const table = document.createElmenet('table');
            table.id = `${this._.id}-problem`;
//        return `<table id="${this._.id}-problem">${this.#makeProblemThHtml()}${this.#makeProblemTrsHtml(cases)}<table>`;
            table.appendChild(this.#makeProblemThTrEl());
            //for (let c of status.syncStatuses.filter(c=>[1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id)) {
            for (let c of this._.a._.cases.filter(c=>[1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id)) {
                table.appendChild(this.#makeProblemTdTrEl(c));
            }
            this._.el.problem.appendChild(table);
            status[name]
            */
        } else {// 更新（追加＆並替）
            /*
            // 非同期テスト結果を追加挿入する
            this._.el.contentVisiblity = 'hidden';
            //const table = document.querySelector(`#${this._.id}-problem`);
            const table = document.querySelector(`#${this._.id}-problem`);
            const tblIds = [...this._.el.problem.querySelectorAll(`tr`)].map(tr=>parseInt(tr.dataset.id));
            //for (let c of status.asyncStatuses.filter(c=>[1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id)) {
            for (let c of this._.a._.cases.filter(c=>c.isAsync && [1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id)) {
                const tr = this.#makeProblemTdTrEl(c);
                const ovIdx = tblIds.findIndex(id=>c.id < id); // 追加対象より大きいIDがあるidx
                const ovTr = table.querySelector(`tr:nth-of-type(${ovIdx+1})`);
                console.assert(!!ovTr);
//                console.log(c.id, ovIdx);
                // 挿入する（対象より大きいIDを持つレコードの直前ｎ挿入する。なければ末尾に挿入する）
                if (-1===ovIdx) {table.appendChild(tr);} else {ovTr.before(tr)}
//                this._.el.problem.querySelector(`tr[data-id="${}"]`);
                // 任意の位置に挿入する
//                this._.el.problem
            }
            this._.el.contentVisiblity = 'auto';
            */
        }
//        this.#makeTableHtml(status);
    }
    #makeSuccessEl(status) {
        /*
        if (!this._.el.count) {
            'count problem'.split(' ').map(n=>{
                const div = document.createElement('div');
                div.id = `${this._.id}-success-count`;
                this._.el[n] = div;
                this._.el.success.appendChild(div);
            });
            this._.el.count.innerHTML = `${this.#makeCountTableHtml(status)}`;
            this._.el.problem.innerHTML = `${this.#makeProblemAreaTableHtml(status)}`;
        }
        */
        this._.el.count.innerHTML = `${this.#makeCountTableHtml('syncs', status)}`;
        this._.el.problem.innerHTML = `${this.#makeProblemAreaTableHtml('syncs', status)}`;
        // ToDo: countは保留など0件のtrを非表示にする。件数を更新する。
        // ToDo: problemは作り直す（同期のみ、非同期のみ、全件では、同期のみ→全件の二段階更新であり、二回目は追加だけが行われうるのであり削除や変更は起きないはず）
        /*
        if (!this._.el.success) {
            this._.el.success = document.createElement('div');
            this._.el.success.id = `${this._.id}-success`;
            this._.el.success.innerHTML = `${this.#makeStyleCss()}${this.#makeCountHtml(status)}${this.#makeProblemAreaTable(status)}`
        }
        this._.el.success.display = 'block';
        if (this._.el.throw) {this._.el.throw.display = 'none'}
        */
    }
    #makeStyleEl() {
        const style = document.createElement('style')
        style.id = `unitest-result-style`;
        style.textContent = this.#makeStyleCss();
        return style;
    }
    /*
    */
    //#makeStyleCss() {return `<style id="${this._.id}-style">${StatusCodeOfNames.map(n=>`.${n} {background-color:${Status[n].color.b}; color:${Status[n].color.b}; }`).join('\n')}</style>`;}
    #makeStyleCss() {return `<style id="${this._.id}-style">table{border-collapse:collapse; border-spacing:0;}td,th{padding:0.25em;}${StatusCodeOfNames.map(n=>`.${n} {background-color:${Status[n].color.b}; color:${Status[n].color.f}; }`).join('\n')}</style>`;}


//    #${this._id} td:nth-child(2) { text-align: right; }
//    #makeCountTable(a) {if (!this._.el) {this._.el = document.body.innerHTML = ;}}
    //#makeCountTableHtml(status) {return `<table id="${this._.id}-count">${this.#makeCountTrsHtml(status)}<table>`;}
    #makeCountTableHtml(name,status) {return `<table id="${this._.id}-count">${this.#makeCountTrsHtml(name,status)}<table>`;}
    //#makeCountTrHtml(statusCode, num) {const N=StatusCodeOfNames[statusCode];return `<tr class="${N}"><th>${Status[N].name}</th><td id="${N}-count">${num}</td></tr>`}
    //#makeCountTrsHtml(status) {return StatusCodeOfNames.toReversed().map(n=>this.#makeCountTrHtml(n, status.all[n])).join('')}
    #makeCountTrsHtml(name,status) {return StatusCodeOfNames.toReversed().map(n=>this.#makeCountTrHtml(n, status[name][n])).join('')}
    #makeCountTrHtml(statusName, num) {const N=statusName;return `<tr class="${N}"><th>${Status[N].label}</th><td id="${N}-count">${num}</td></tr>`}
    //#makeProblemAreaTableHtml(status) {return `<table id="${this._.id}-problem">${this.#makeProblemThHtml()}${this.#makeProblemTrsHtml(cases)}<table>`;}
    #makeProblemAreaTableHtml(name,status) {return `<table id="${this._.id}-problem">${this.#makeProblemThHtml()}${this.#makeProblemTrsHtml(name,status)}<table>`;}
    #makeProblemAreaTable(name,status) {
        const cases = this._.a._.cases.filter(c=>[1,2].some(v=>v===c.statusCode)); // 失敗か例外のテストケースのみ取得する
//        const cases = status[name].filter(c=>[1,2].some(v=>v===c.statusCode)); // 失敗か例外のテストケースのみ取得する
        //return `<table id="${this._.id}-problem">${this.#makeProblemThHtml()}${this.#makeProblemTrsHtml(cases)}<table>`;
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
        //tr.className = `${StatusCodeOfNames[c.statusCode]}`;
        //tr.dataset.id = `${c.id}`;
        tr.className = StatusCodeOfNames[c.statusCode];
        tr.dataset.id = c.id;
        const td0 = document.createElement('td');
        const td1 = document.createElement('td');
        const td2 = document.createElement('td');
        td0.className = ``;
        td0.textContent= c.msg.split('\n').join('<br>');
        td1.textContent = `対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}`;
        td2.textContent = c.stacks.join('<br>');
        tr.append(td0, td1, td2);
        return tr;
    }
    //#makeProblemTrsHtml(cases) {cases.map(c=>this.#makeProblemTrHtml(c)).join('')}
    //#makeProblemTrsHtml(name,status) {this._.a._.cases.filter(c=>[1,2].some(v=>v===c.statusCode)).map(c=>this.#makeProblemTrHtml(c)).join('')}
    #makeProblemTrsHtml(name,status) {
        //const records = this._.a._.cases.filter(c=>[1,2].some(v=>v===c.statusCode));
        const records = this._.a._.cases.filter(c=>[1,2].some(v=>v===c.statusCode)).toSorted((a,b)=>a.id-b.id);
        return 0===records.length ? '' : records.map(c=>this.#makeProblemTrHtml(c)).join('\n');
    }
    #makeProblemTrHtml(c) {console.log(c);return `<tr class="${StatusCodeOfNames[c.statusCode]}" data-id="${c.id}"><td>${c.msg.split('\n').join('<br>')}</td><td>対象id:${c.id}<br>コード:${c.codeStr ? c.codeStr.split('\n').join('<br>') : c.test.toString()}</td><td>${c.stacks ? c.stacks.join('<br>') : ''}</td></tr>`}
    //#makeProblemTrHtml(c) {return `<tr class="${StatusCodeOfNames[c.statusCode]}"><td>${c.msg}</td><td>${c.stacks ? c.stacks.join('<br>') : ''}</td></tr>`}
}
class Result {
    //constructor(a) {this._={a:a, log:new ResultLog(a), html:new ResultHtml(a), status:{syncs:null, asyncs:null, all:null}}}
    constructor(a) {this._={a:a, log:new ResultLog(a), html:new ResultHtml(a), status:new AssertStatus(a)}}
    syncs() {this.#run('syncs')}
    asyncs() {this.#run('asyncs')}
    all() {this.#run('all')}
    #run(name) {
        if (!'syncs asyncs all'.split(' ').some(n=>n===name)) {throw new Error(`nameはsyncs,asyncs,allのいずれかであるべきです。`)}
        this._.status[name]; // ステータス算出
//        console.log(this._.status._[name]);
        this._.log[name](this._.status);
        this._.html[name](this._.status);
        //this._.status[name] = a._statuses;
        //this._.status[name] = a[`_${name}Statuses`];
//        this._.status[name].name = 'syncs'===name ? '同期テストのみ' : ('async'===name ? '非同期テストのみ' : '全テスト完了');
//        this._.status[name].percent = (this._.status[name].R * 100).toFixed(0) + '%';
//        this._.log[name](this._.status[name]);
//        this._.html[name](this._.status[name]);
    }
}
class Show {// テスト結果をHTMLに画面表示する（結果一覧。問題箇所一覧。）

}
window.unitest = new Unitest();
})();
