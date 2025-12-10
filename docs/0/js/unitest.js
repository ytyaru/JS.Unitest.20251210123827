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
//        super(msg, {cause,cause});
        this.name = 'TestError';
//        this.cause = cause;
    }
}
class AssertError extends Error {
    constructor(msg, cause) {
        undefined===cause ? super(msg) : super(msg, {cause,cause});
//        super(msg, {cause,cause});
        this.name = 'AssertError';
//        this.cause = cause;
//        this.status = status;// exception/fail/pending/success  例外/失敗/保留/成功
    }
}
const Status = {
    pending:   {name:'保留', color:{f:'#666666',b:'#CCCCCC'}},
    exception: {name:'例外', color:{f:'#0000AA',b:'#99CCFF'}},
    fail:      {name:'失敗', color:{f:'#AA0000',b:'#FFABCE'}},
    success:   {name:'成功', color:{f:'#008800',b:'#AEFFBD'}},
};
class Unitest {
    constructor() {
        this._ = {st:new StackTracer(), fn:null, tcs:null, rl:null};
    }
    assert(fn) {
        const a = new Assertion();
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
        this._.rl = new ResultLog(a);
        // 同期系のテストだけを実行する
        a._.cases.filter(c=>!c.isAsync).map(c=>this.#case(c));
//        this._.rl.syncs(a);  // 同期系テスト結果ログ表示
        const acs = a._.cases.filter(c=>c.isAsync); // 非同期系テストケース一覧
        if (0<acs.length) {this._.rl.syncs(a);} // 同期系テスト結果ログ表示
        // HTML画面を更新する(ToDo)
        /*
        const acs = a._.cases.filter(c=>c.isAsync); // 非同期系テストケース一覧
        // HTML画面を更新する
        const P = acs.length,
              S = a._.cases.filter(c=>0===c.statusCode).length,
              F = a._.cases.filter(c=>1===c.statusCode).length,
              E = a._.cases.filter(c=>2===c.statusCode).length;
        console.log(a._.cases);
        //console.log(`同期テストのみ完了 全:${P+S+F+E} ${0<P ? '保留:'+P+' ' : ''}${0<E ? '例外:'+E+' ' : ''}${0<F ? '失敗:'+F+' ' : ''}${0<S ? '成功:'+S : ''}`);
        //if (0<P) {console.log(`非同期テスト 保留:${P}`);}
        console.log(`%c同期テストのみ結果 全:${S+F+E} ${0<E ? '例外:'+E+' ' : ''}${0<F ? '失敗:'+F+' ' : ''}${0<S ? '成功:'+S : ''}`, `background-color:${Status['succeed'].color.b};color:${Status['succeed'].color.f}`);
        if (0<P) {console.log(`%c非同期テスト 保留:${P}`, `background-color:${Status['pending'].color.b};color:${Status['pending'].color.f}`);}
        */
//        console.log(afns.length, afns);
        // 非同期テストケースを一括処理（結果を個別にセットする）
        //Promise.allSettled(afns.map(a=>a.test())).then((results)=>{
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
            // 結果をログ表示する
            if (0<results.length) {this._.rl.asyncs(a);}
            this._.rl.all(a);    // 全テスト結果ログ表示
//            this._.rl.asyncs(a); // 非同期系テスト結果ログ表示
//            this._.rl.all(a);    // 全テスト結果ログ表示
            // HTML画面を更新する(ToDo)
            /*
            // HTML画面を更新する
            const s=acs.filter(c=>0===c.statusCode).length, f=acs.filter(c=>1===c.statusCode).length, e=acs.filter(c=>2===c.statusCode).length;
            console.log(`非同期テストのみ結果 全:${s+f+e} ${0<e ? '例外:'+e+' ' : ''}${0<f ? '失敗:'+f+' ' : ''}${0<s ? '成功:'+s : ''}`, `background-color:${Status['succeed'].color.b};color:${Status['succeed'].color.f}`);
            const S=a._.cases.filter(c=>0===c.statusCode).length, F=a._.cases.filter(c=>1===c.statusCode).length, E=a._.cases.filter(c=>2===c.statusCode).length;
            console.log(`全テスト結果 全:${S+F+E} ${0<E ? '例外:'+E+' ' : ''}${0<F ? '失敗:'+F+' ' : ''}${0<S ? '成功:'+S : ''}`, `background-color:${Status['succeed'].color.b};color:${Status['succeed'].color.f}`);
            //console.log(a._.cases);
            */
        });
//        if (0===acs.length) {this._.rl.all(a);}// 全テスト結果ログ表示// HTML画面を更新する(ToDo)
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
            if (c.notFn) {c.codeStr = this._.tcs.get(c);}
            Console.fail(c);
        }
    }
    #posCatch(c, e) {
        c.statusCode=2; // Exception
        c = {...c, ...this.#makeStacks(AssertError, `テスト例外。真偽値が期待される所で例外発生しました。`, e)};
        if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        Console.exception(c);
    }
    #negTry(c) {
        c.statusCode=1; // Failed
        c = {...c, ...this.#makeStacks(AssertError, `テスト失敗。例外発生が期待される所で発生しなかった。`)};
        if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        Console.fail(c);
    }
    #negCatch(c, e) {
        const isFailedType = e.constructor.name !== c.expected.type.name;
        const isFailedMsg = undefined===c.expected.msg
            ? false
            : (isS(c.expected.msg)
                ? e.message!==c.expected.msg
                : !e.message.match(c.expected.msg));
//        const msg = [(isFailedType ? `テスト失敗。例外の型が違います。\n期待値:${c.expected.type.name}\n実際値:${e.constructor.name}` : ''),
//                     (isFailedMsg ? `テスト失敗。例外のメッセージが違います。\n期待値:${c.expected.msg}\n実際値:${e.message}` : '')].join('\n');
//        const msg = (isFailedType ? `テスト失敗。例外の型が違います。\n期待値:${c.expected.type.name}\n実際値:${e.constructor.name}` : '')
//            + (isFailedMsg ? `テスト失敗。例外のメッセージが違います。\n期待値:${c.expected.msg}\n実際値:${e.message}` : '');
        /*
        const msg = isFailedType && isFailedMsg
            ? `テスト失敗。例外の型もメッセージも違います。\n期待値:${c.excepted.type.name}, ${c.expected.msg}\n実際値:${e.constructor.name}, ${e.message}`
            : (isFailedType
                ? `テスト失敗。例外の型が違います。\n期待値:${c.expected.type.name}\n実際値:${e.constructor.name}`
                : (isFailedMsg
                    ? `テスト失敗。例外のメッセージが違います。\n期待値:${c.expected.msg}\n実際値:${e.message}`
                    : ''));
            */
        const msg = this.#getNegCatchMsg(c, e, isFailedType, isFailedMsg)
        c.statusCode = msg ? 1 : 0; // Failed/Succeed
        if (c.notFn) {c.codeStr = this._.tcs.get(c);}
        if (msg) {
            c = {...c, ...this.#makeStacks(AssertError, msg, e)};
            Console.fail(c);
        }
    }
    #getNegCatchMsg(c, e, isFailedType, isFailedMsg) {
        const i = (isFailedMsg << 1) | isFailedType
        const msg = ['','型が','メッセージが','型もメッセージも'][i];
        const E = [c.expected.type.name, c.expected.msg];
        const A = [e.constructor.name, e.message];
        return msg ? `テスト失敗。例外の${msg}違います。\n期待値:${3===i ? E.join(', ') : E[i-1]}\n実際値:${3===i ? A.join(', ') : A[i-1]}` : msg;
//        const E = {type:c.excepted.type.name, msg:c.expected.msg}
//        const A = {type:e.constructor.name, msg:e.message}
//        const expected = 3===i ? E.join(', ') : E[i+1]
//        const actual = 3===i ? A.join(', ') : A[i+1]
//        return msg ? `テスト失敗。例外の${msg}違います。\n期待値:${expected}\n実際値:${actual}` : msg;
    }
    /*
    #case(c) {// c:testCaseObject。cにstaticsを追加したりコンソール表示したりする。
        console.log(`id:${c.id}`, c);
        if (isB(c.expected)) { // 正常系（指定した真偽値を返すか確認する）
            try {
                c.actual = c.test();
                if (c.expected===c.actual) {c.statusCode=0} // succeed
                else {
                    c.statusCode=1; // Failed
                    c = {...c, ...this.#makeStacks(AssertError, `テスト失敗。${c.expected ? '真' : '偽'}が期待される所で${c.actual}になりました。`)};
                    if (c.notFn) {c.codeStr = this.#getTestCode(c)}
                    Console.fail(c);
                }
            } catch (e) {
                c.statusCode=2; // Exception
                c = {...c, ...this.#makeStacks(AssertError, `テスト例外。真偽値が期待される所で例外発生しました。`, e)};
                if (c.notFn) {c.codeStr = this.#getTestCode(c)}
                Console.exception(c);
            }
        } else {// 異常系（指定した例外が発生するか確認する）
            try {
                c.actual = c.test();
                c.statusCode=1; // Failed
                c = {...c, ...this.#makeStacks(AssertError, `テスト失敗。例外発生が期待される所で発生しなかった。`)};
                if (c.notFn) {c.codeStr = this.#getTestCode(c)}
                Console.fail(c);
            } catch (e) {
                const isFailedType = e.constructor.name !== c.expected.type.name;
                const isFailedMsg = undefined===c.expected.msg
                    ? false
                    : (isS(c.expected.msg)
                        ? e.message===c.expected.msg
                        : e.message.match(c.expected.msg));
                const msg = (isFailedType ? `テスト失敗。例外の型が違います。\n期待値:${c.expected.type.name}\n実際値:${e.constructor.name}` : '')
                    + (isFailedMsg ? `テスト失敗。例外のメッセージが違います。\n期待値:${c.expected.msg}\n実際値:${e.message}` : '');
                c.statusCode = msg ? 1 : 0; // Failed/Succeed
                if (c.notFn) {c.codeStr = this.#getTestCode(c)}
                if (msg) {
                    c = {...c, ...this.#makeStacks(AssertError, msg, e)};
                    Console.fail(c);
                }
            }
        }
    }
    */
    /*
    #case(c) {// c:testCaseObject。cにstaticsを追加したりコンソール表示したりする。
        if (isB(c.expected)) {try {c.actual = c.test(); this.#posTry(c)} catch(e) {this.#posCatch(c,e)}} // 正常系（指定した真偽値を返すか確認する）
        else {try {c.actual = c.test(); this.#negTry(c)} catch(e) {this.#negCatch(c,e)}}// 異常系（指定した例外が発生するか確認する）
    }
    #case(c) {// c:testCaseObject。cにstaticsを追加したりコンソール表示したりする。
        try {
            c.actual = c.test(); 
            isB(c.expected) ? this.#posTry(c) : this.#negTry(c);
        } catch (e) {
            isB(c.expected) ? this.#posCatch(c,e) : this.#negTry(c);
        }
    }
    */

}
class TestCodeStr {
    constructor(testDefineFn) {this._={fn:testDefineFn, str:`${testDefineFn}`}}
    get(c) {// id(id番目のテストコード)からテストコード文字列を取得する（もしテストコード中でfor文内でa.t()を呼び出す等していたら位置が狂ってしまう！。他にもa.t(a.t())などネストしていても狂う！）
        //const [testCode, paramName, assertCodes] = this.#getAssertCodes(c);
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
/*
const isB = (v)=>'boolean'===typeof v;
const isFn = (v)=>'function'===typeof v;
const isAFn = (v)=>isFn(v) && v.constructor.name === 'AsyncFunction';
const isCls = (v)=>(isFn(v) && (!!v.toString?.().match(/^class /)));
const getTag = (v)=>Object.prototype.toString.call(v);
const isIns = (v)=>null!==v && 'object'===typeof v && 'Object Array'.every(t=>`[object ${t}]`!==getTag(v));
const isErrCls = (v) =>isCls(v) && v.prototype instanceof Error;
const isErrIns = (v) =>v instanceof Error;
*/
const isB = (v)=>'boolean'===typeof v,
    isS = (v)=>'string'===typeof v,
    isReg = (v)=>v instanceof RegExp,
    isFn = (v)=>'function'===typeof v,
    isAFn = (v)=>isFn(v) && v.constructor.name === 'AsyncFunction',
    isCls = (v)=>(isFn(v) && Boolean(v.toString?.().match(/^class /))),
    getTag = (v)=>Object.prototype.toString.call(v),
    isIns = (v)=>null!==v && 'object'===typeof v && 'Object Array'.every(t=>`[object ${t}]`!==getTag(v)),
//    isErrCls = (v) =>isCls(v) && v.prototype instanceof Error,
    isErrCls = (v) =>Error===v||Error.isPrototypeOf(v);
    isErrIns = (v) =>v instanceof Error;
class Assertion {// Unitest.assert((a)=>{})のように利用者は外部からAssertインスタンスとして利用する
    constructor() { // 内部で全テストケースを関数として保持する
        this._ = {id:0, cases:[]};
    }
    t(...args) {this.#makeTestFn(true, ...args)}
    f(...args) {this.#makeTestFn(false, ...args)}
    //e(...args) {this.#makeTestFn(args[0], ...args)}
    e(...args) {this.#makeTestFn(args[0], ...args.slice(1))}
    tc(...args) {}
    fc(...args) {}
    ec(...args) {}
    get _syncs() {return this._.cases.filter(c=>!c.isAsync)} // 同期系テストケース一覧
    get _asyncs() {return this._.cases.filter(c=>c.isAsync)} // 非同期系テストケース一覧
    #getExpected(v, w) {
        if ('boolean'===typeof v || isErrIns(v)) {return v}
        else if (isErrCls(v) && (isS(w) || isReg(w))) {return {errCls:v, msg:w}}
        else {throw new TypeError(`入力値不正。#getExpected()`)}
    }
    #makeTestFn(expected, ...args) {// expected: true/false/new Error('message')/Error + (msg)=>msg.match(/^some$/)/RegExp
        const L = args[args.length-1];
        //const o = {expected:expected, test:isFn(L) ? L : ()=>expected, isAsync:isAFn(0===args.lengt ? false : isAFn(L))};
        /*
        const o = {
            expected: isB(expected) ? expected : ({type:isErrCls(expected) ? expected : expected.constructor, msg:1===args.length ? undefined : args[0]}),
            test: isFn(L) ? L : ()=>expected,
            isAsync:isAFn(0===args.lengt ? false : isAFn(L)),
        };
        */
        console.log('#makeTestFn引数:', expected, ...args, args.length, 0===args.length ? false : isAFn(L));
        console.log(isErrCls(expected) , 1===args.length , isFn(L));
        console.log(expected, isFn(expected), expected.toString?.(), Boolean(expected.toString?.().match(/^class /)), isCls(expected) , expected.prototype instanceof Error);

        if ((isB(expected) && 1===args.length && (isB(L) || isFn(L)))
         || (isErrIns(expected) && 1===args.length && isFn(L))
         || (isErrCls(expected) && 1===args.length && isFn(L))
         || (isErrCls(expected) && 2===args.length && (isS(args[0]) || isReg(args[0])) && isFn(L))) {this._.cases.push({
            id: this._.id++,
            expected: isB(expected) ? expected : ({type:isErrCls(expected) ? expected : expected.constructor, msg:isErrCls(expected) && 1===args.length ? undefined : args[0]}),
            //test: isFn(L) ? L : ()=>expected,
            test: isFn(L) ? L : ()=>args[0],
            isAsync:0===args.length ? false : isAFn(L),
            notFn: (isB(expected) && 1===args.length && isB(L)),
         });}
//         || (isErrCls(expected) && 2===args.length && (isS(args[0]) || isReg(args[0])) && isFn(L))) {this._.cases.push(o);}
        // tc(),fc(),ec()のような複数の引数パターンを持つ方法も追加したい
        else {throw new TypeError(`入力値不正。#makeTestFn(): ${args}`)}
        /*
             if (isB(expected) && 0===args.length) {this._.cases.push({expected:expected, actual:()=>expected, isAsync:false})}
        else if (isB(expected) && 1===args.length && isFn(args[0])) {this._.cases.push({expected:expected, actual:args[0], isAsync:isAFn(args[0])})}
        else if (isErrIns(expected) && 1===args.length && isFn(args[0])) {this._.cases.push({expected:expected, actual:args[0], isAsync:isAFn(args[0])})}
        else if (isErrCls(expected) && 2===args.length && (isS(args[0]) || isReg(args[0])) && isFn(args[1])) {this._.cases.push({expected:expected, actual:args[1], isAsync:isAFn(args[1])})}
        // tc(),fc(),ec()のような複数の引数パターンを持つ方法も追加したい
        else {throw new TypeError(`入力値不正。#makeTestFn()`)}
        */
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
    //static #testCode(c) {return c.notFn ? `対象id:${c.id}` : '対象:' + (isB(c.expected) && !c.isAsync ? `${c.test}`.replace('()=>','') : `${c.test}`);}
    //static #testCode(c) {return `対象id:${c.id}` + (c.notFn ? '' : (` コード:` + (isB(c.expected) && !c.isAsync ? `${c.test}`.replace('()=>','') : `${c.test}`)));}
    //static #testCode(c) {return `対象id:${c.id}` + (c.notFn ? '' : (` コード:` + (isB(c.expected) && !c.isAsync ? `${c.test}`.replace('()=>','') : `${c.test}`))) + '\n予想元コード:' + c.codeStr;}
    //static #testCode(c) {const hasCode = 'codeStr' in c; return `対象id:${c.id}` + ` ${hasCode ? '予想' : ''}コード:` + (hasCode ? c.codeStr : ((isB(c.expected) && !c.isAsync ? `${c.test}`.replace('()=>','') : `${c.test}`)));}
    static #testCode(c) {const hasCode = 'codeStr' in c; return `対象id:${c.id}` + ` ${hasCode ? '予想' : ''}コード:` + (hasCode ? c.codeStr : `${c.test}`);}
    /*
    static log(status, msg, err, caller) { // status:pending/exception/fail/success、[s,m],[s,m,c],[s,m,e],[s,m,e,c]
        const stacks = (undefined===err || this.__isFn(err)) ? this._captureStacks(this._console) : this._getErrorStacks(err)
        if (['exception','fail'].some(s=>s===status)) {
            console.log(`%c${msg}\n${stacks.join('\n')}`, `background-color:${this._M.stt[status].color.b};color:${this._M.stt[status].color.f};`)
        } else {
            console.log(`${msg}\n${stacks.join('\n')}`)
        }
    }
    */
}
class ResultLog {
    constructor(a) {
        this._ = {a:a, syncs:{P:0, S:0, F:0, E:0}, asyncs:{S:0, F:0, E:0}, all:{S:0, F:0, E:0}};
    }
    //#getP(N,R,E,F,S) {return [{name:N, format:`background-color:${Status[R].color.b};color:${Status[R].color.f}`}, ...[['exception',E],['fail',F],['success',S]].filter(p=>0<p[1]).map(p=>({name:`${Status[p[0]].name}:${p[1]}`, format:`background-color:${Status[p[0]].color.b};color:${Status[p[0]].color.f};`}))]}
    #getP(N,R,E,F,S) {return [{name:`${N}:${0===E && 0===F ? 100 : ((S/(E+F+S))*100).toFixed(0)}% ${E+F+S}`, format:`background-color:${Status[R].color.b};color:${Status[R].color.f}`}, ...[['exception',E],['fail',F],['success',S]].filter(p=>0<p[1]).map(p=>({name:`${Status[p[0]].name}:${p[1]}`, format:`background-color:${Status[p[0]].color.b};color:${Status[p[0]].color.f};`}))]}
    #log(P) {console.log(P.reduce((s,p)=>s+`%c${p.name} `, '').trim(), ...P.map(p=>p.format))}
    syncs(a) {
//        console.log(`ResultLog.syncs:a:`, this._.a);
        console.log(`ResultLog.syncs:a:`, this._.a._.cases.length);
        this._.syncs.P = this._.a._asyncs.length;
        const syncs = this._.a._syncs; // 同期系テスト一覧
        console.log('syncs:', syncs);
        this._.syncs.S = syncs.filter(c=>0===c.statusCode).length;
        this._.syncs.F = syncs.filter(c=>1===c.statusCode).length;
        this._.syncs.E = syncs.filter(c=>2===c.statusCode).length;
        const R = (0===this._.syncs.E && 0===this._.syncs.F) ? 'success' : 'pending';
        this.#log(this.#getP(`同期テストのみ`, R, this._.syncs.E, this._.syncs.F, this._.syncs.S));
//        const P = this.#getP(`同期テストのみ`, this._.syncs.E, this._.syncs.F, this._.syncs.S);
//        const P = [{name:`非同期テストのみ`, format:`background-color:${Status[rs].color.b};color:${Status[rs].color.f}`}, ...[['exception',E],['failed',F],['succeed',S]].filter(p=>0<p[1]).map(p=>({name:`${Status[p[0]].name}`, format:`background-color:${Status[p[0]].color.b};color:${Status[p[0]].color.f};`}))];
        //console.log(P.reduce((s,p)=>s+`%c${p.name} `, '').trim(), ...P.map(p=>p.format));
        if (0<this._.syncs.P) {console.log(`%c非同期テスト保留:${this._.syncs.P}`, `background-color:${Status['pending'].color.b};color:${Status['pending'].color.f}`);}
    }
    asyncs(a) {
        console.log(`ResultLog.asyncs:a:`, this._.a._.cases.length);
        const asyncs = this._.a._asyncs; // 非同期系テスト一覧
        console.log('asyncs:', asyncs);
        this._.asyncs.S = asyncs.filter(c=>0===c.statusCode).length;
        this._.asyncs.F = asyncs.filter(c=>1===c.statusCode).length;
        this._.asyncs.E = asyncs.filter(c=>2===c.statusCode).length;
        console.log();
        const R = (0===this._.asyncs.E && 0===this._.asyncs.F) ? 'success' : 'pending';
        this.#log(this.#getP(`非同期テストのみ`, R, this._.asyncs.E, this._.asyncs.F, this._.asyncs.S));
//        const P = this.#getP(`非同期テストのみ`, this._.asyncs.E, this._.asyncs.F, this._.asyncs.S);
        //const P = [{name:`非同期テストのみ`, format:`background-color:${Status[rs].color.b};color:${Status[rs].color.f}`}, ...[['exception',E],['failed',F],['succeed',S]].filter(p=>0<p[1]).map(p=>({name:`${Status[p[0]].name}`, format:`background-color:${Status[p[0]].color.b};color:${Status[p[0]].color.f};`}))];
//        console.log(P.reduce((s,p)=>s+`%c${p.name} `, '').trim(), ...P.map(p=>p.format));
    }
    all(a) {
        console.log(`ResultLog.all:a:`, this._.a._.cases.length);
        this._.all.S = this._.a._.cases.filter(c=>0===c.statusCode).length;
        this._.all.F = this._.a._.cases.filter(c=>1===c.statusCode).length;
        this._.all.E = this._.a._.cases.filter(c=>2===c.statusCode).length;
        //const clear = 0===this._.all.F && 0===this._.all.E;
        //const rs = clear ? 'success' : 'pending';
        const R = (0===this._.all.E && 0===this._.all.F) ? 'success' : 'pending';
        this.#log(this.#getP(`全テスト完了`, R, this._.all.E, this._.all.F, this._.all.S));
//        const P = this.#getP(`全テスト完了`, this._.all.E, this._.all.F, this._.all.S);
        //const P = [{name:`全テスト完了`, format:`background-color:${Status[rs].color.b};color:${Status[rs].color.f}`}, ...[['exception',E],['failed',F],['succeed',S]].filter(p=>0<p[1]).map(p=>({name:`${Status[p[0]].name}`, format:`background-color:${Status[p[0]].color.b};color:${Status[p[0]].color.f};`}))];
//        console.log(P.reduce((s,p)=>s+`%c${p.name} `, '').trim(), ...P.map(p=>p.format));
    }
    static syncs(a) {
        // HTML画面を更新する
        const P = a._asyncs.length,
              S = a._.cases.filter(c=>0===c.statusCode).length,
              F = a._.cases.filter(c=>1===c.statusCode).length,
              E = a._.cases.filter(c=>2===c.statusCode).length;
//        console.log(a._.cases);
        //console.log(`同期テストのみ完了 全:${P+S+F+E} ${0<P ? '保留:'+P+' ' : ''}${0<E ? '例外:'+E+' ' : ''}${0<F ? '失敗:'+F+' ' : ''}${0<S ? '成功:'+S : ''}`);
        //if (0<P) {console.log(`非同期テスト 保留:${P}`);}
        console.log(`%c同期テストのみ結果 全:${S+F+E} ${0<E ? '例外:'+E+' ' : ''}${0<F ? '失敗:'+F+' ' : ''}${0<S ? '成功:'+S : ''}`, `background-color:${Status['succeed'].color.b};color:${Status['succeed'].color.f}`);
        if (0<P) {console.log(`%c非同期テスト 保留:${P}`, `background-color:${Status['pending'].color.b};color:${Status['pending'].color.f}`);}
    }
    static asyncs() {
        // HTML画面を更新する
        const P = a._asyncs.length,
              S = a._.cases.filter(c=>0===c.statusCode).length,
              F = a._.cases.filter(c=>1===c.statusCode).length,
              E = a._.cases.filter(c=>2===c.statusCode).length;
//        console.log(a._.cases);
        //console.log(`同期テストのみ完了 全:${P+S+F+E} ${0<P ? '保留:'+P+' ' : ''}${0<E ? '例外:'+E+' ' : ''}${0<F ? '失敗:'+F+' ' : ''}${0<S ? '成功:'+S : ''}`);
        //if (0<P) {console.log(`非同期テスト 保留:${P}`);}
        console.log(`%c同期テストのみ結果 全:${S+F+E} ${0<E ? '例外:'+E+' ' : ''}${0<F ? '失敗:'+F+' ' : ''}${0<S ? '成功:'+S : ''}`, `background-color:${Status['succeed'].color.b};color:${Status['succeed'].color.f}`);
        if (0<P) {console.log(`%c非同期テスト 保留:${P}`, `background-color:${Status['pending'].color.b};color:${Status['pending'].color.f}`);}


    }
    static all(a) {
        // HTML画面を更新する
        const S = a._.cases.filter(c=>0===c.statusCode).length,
              F = a._.cases.filter(c=>1===c.statusCode).length,
              E = a._.cases.filter(c=>2===c.statusCode).length;
        const clear = 0===F && 0===E;
        const rs = clear ? 'succeed' : 'pending';
        const P = [{name:`全テスト完了`, format:`background-color:${Status[rs].color.b};color:${Status[rs].color.f}`}, ...[['exception',E],['failed',F],['succeed',S]].filter(p=>0<p[1]).map(p=>({name:`${Status[p[0]].name}`, format:`background-color:${Status[p[0]].color.b};color:${Status[p[0]].color.f};`}))];
        console.log(P.reduce((s,p)=>s+`%c${p.name} `, '').trim(), ...P.map(p=>p.format));
//        console.log(`%c同期テストのみ結果 全:${S+F+E} ${0<E ? '例外:'+E+' ' : ''}${0<F ? '失敗:'+F+' ' : ''}${0<S ? '成功:'+S : ''}`, `background-color:${Status['succeed'].color.b};color:${Status['succeed'].color.f}`);
//        if (0<P) {console.log(`%c非同期テスト 保留:${P}`, `background-color:${Status['pending'].color.b};color:${Status['pending'].color.f}`);}
        /*
        console.log(`%c全テスト完了:${S+F+E} ${0<E ? '%c例外:'+E+' ' : ''}${0<F ? '%c失敗:'+F+' ' : ''}${0<S ? '%c成功:'+S : ''}`,
            `background-color:${Status[rs].color.b};color:${Status[rs].color.f}`
        );

        [
            [`%c全テスト完了:${S+F+E}`, `background-color:${Status[rs].color.b};color:${Status[rs].color.f}`],
            [`${0<E ? '%c例外:'+E+' ' : ''}`, `background-color:${Status['exception'].color.b};color:${Status['exception'].color.f}`]
            [`${0<F ? '%c失敗:'+F+' ' : ''}`, `background-color:${Status['failed'].color.b};color:${Status['failed'].color.f}`]
            [`${0<S ? '%c成功:'+S+' ' : ''}`, `background-color:${Status['succeed'].color.b};color:${Status['succeed'].color.f}`]
        ]
        */
    }
}
class Show {// テスト結果をHTMLに画面表示する（結果一覧。問題箇所一覧。）

}
window.unitest = new Unitest();
})();
