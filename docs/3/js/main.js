window.addEventListener('DOMContentLoaded', (event) => {
    unitest.assert((a)=>{
        // 期待値:true
    //    a.t(false);
    //    a.t(()=>{throw new Error(`なんかエラー`)}); // 例外
    //    throw new Error('テストコード定義中でなんかエラーが出ちゃった');
        a.t(true);
        a.t(false); // 失敗: id:1
        a.t(()=>true);
        a.t(()=>{throw new Error(`なんかエラー`)}); // 例外
        a.t(async()=>true);
        a.t(async()=>false); // 失敗
        a.t(async()=>{throw new Error(`なんかエラー`)}); // 例外
        // 期待値:false
        a.f(true); // 失敗: id:7
        a.f(false);
        a.f(()=>true); // 失敗
        a.f(()=>{throw new Error(`なんかエラー`)});
        a.f(async()=>true);
        a.f(async()=>false);
        a.f(async()=>{throw new Error(`なんかエラー`)}); // エラー
        // 期待値:例外発生
        a.e(TypeError, ()=>{throw new TypeError('テキトーなメッセージ')}); // 成功 id:14
        a.e(TypeError, 'テキトーなメッセージ', ()=>{throw new TypeError('テキトーなメッセージ')});
        a.e(TypeError, /^テキトーな/, ()=>{throw new TypeError('テキトーなメッセージ')});
        a.e(TypeError, /なメッセ/, ()=>{throw new TypeError('テキトーなメッセージ')});
        a.e(TypeError, /なメッセージ$/, ()=>{throw new TypeError('テキトーなメッセージ')});
        a.e(new TypeError('テキトーなメッセージ'), ()=>{throw new TypeError('テキトーなメッセージ')});
        a.e(Error, ()=>{throw new TypeError('テキトーなメッセージ')}); // 失敗 id:20 型が違う
        a.e(TypeError, '期待するメッセージ', ()=>{throw new TypeError('間違ったメッセージ')}); // 失敗 id:21 メッセージが違う
        a.e(new Error('期待するメッセージ'), ()=>{throw new TypeError('間違ったメッセージ')}); // 失敗 id:22 型が違う
        a.e(new TypeError('期待するメッセージ'), ()=>{throw new TypeError('間違ったメッセージ')}); // 失敗 id:23 型が違う
        a.e(Error, '期待するメッセージ', ()=>{throw new TypeError('間違ったメッセージ')}); // 失敗 id:24 型とメッセージが違う
        a.e(Error, '期待するメッセージ', ()=>'例外発生が期待される所で発生しなかった場合のテスト。') // 失敗 id:25
        /*
        a.fn(someFunction, [[期待値, [第一引数, 第二引数]], [[Error, 'メッセージ'], [第一引数, 第二引数]]]);
        a.fn(someFunction, [[第一引数, 第二引数]], [[第一引数, 第二引数]], (...args)=>期待値);
        a.fn(someFunction, [[第一引数, 第二引数]], [[第一引数, 第二引数]], (...args)=>[Error, 'メッセージ']);
        a.obj(obj, (a,o)=>{
            // 以下a.cls()とほぼ同じ(ins()がobj(), met()がfn()になる所だけ違う)
        });
        a.cls(Human, (ca,cls)=>{
            ca.get('num', 0);
            // a.ins((a,ins)=>{}) // 引数省略コンストラクタが成功する場合
            ca.ins([TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            ca.ins(['山田'], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            ca.get('num', 0);
            ca.ins(['山田', 12], (ia,ins)=>{
                ca.get('num', 1);
                ia.get('name', '山田');
                ia.get('age', 12);
                ia.met('say', [], `私は${ins.name}、${ins.age}歳です。`);
                ia.met('say', ['なにか問題でも？'], `私は${ins.name}、${ins.age}歳です。なにか問題でも？`);
                ia.met('say', [[], ['なにか問題でも？']], (name,args)=>`私は${ins.name}、${ins.age}歳です。${0===args.length ? '' : args[0]}`)l
                ia.set('name', '田中', '田中');
                ia.set('age', 21, 21);
                ia.met('say', [], `私は${ins.name}、${ins.age}歳です。`);
                ia.met('say', [], (a,m)=>{
                    a.a([]);
                    a.r(`私は${ins.name}、${ins.age}歳です。`);
                    // 関数の型チェックをどうするか。Async/Generator。テストコードasync(a,m)=>{}とすれば確認できるか。for of文でGeneratorを確認できるか。
                    // 他のインスタンス状態を確認する（メソッドを動作させると状態が変わる場合もあるため、こうしたテストができるようにしたい）
                    ia.get('name', '山田');
                    ia.get('age', 12);
                });
            });
            ca.ins(['鈴木', 24], (ia,ins)=>{
                ca.get('num', 2);
                ia.get('name', '鈴木');
                ia.get('age', 24);
                ia.met('say', [], `私は${ins.name}、${ins.age}歳です。`);
                ia.met('say', ['なにか問題でも？'], `私は${ins.name}、${ins.age}歳です。なにか問題でも？`);
                ia.met('say', [[], ['なにか問題でも？']], (name,args)=>`私は${ins.name}、${ins.age}歳です。${0===args.length ? '' : args[0]}`)
            });
            ca.ins([['高橋', 36], ['野崎', 48]], (ia,inss,args)=>{
                ca.get('num', 4);
                for (let i=0; i<args.length; i++) {
                    const ins = inss[i];
                    const [name, age] = ...args[i];
                    ia.get('name', name);
                    ia.get('age', age);
                    ia.met('say', [], `私は${ins.name}、${ins.age}歳です。`);
                    ia.met('say', ['なにか問題でも？'], `私は${ins.name}、${ins.age}歳です。なにか問題でも？`);
                    ia.met('say', [[], ['なにか問題でも？']], (name,args)=>`私は${ins.name}、${ins.age}歳です。${0===args.length ? '' : args[0]}`)
                }
            });


            a.ins([TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins(['山田'], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            a.ins([undefined, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([null, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([true, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([false, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([0, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([1, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([-1, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([NaN, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([Number.MAX_SAFE_INTEGER, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([Number.MIN_SAFE_INTEGER, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([Infinity, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([-Infinity, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([0n, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins([{k:1}, 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins(['山田', undefined], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            a.ins(['山田', null], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            a.ins([new String('山田'), 12], [TypeError, `nameはlength=1〜32の文字列であるべきです。`]);
            a.ins(['山田', new Number(12)], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            a.ins(['山田', NaN], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            a.ins(['山田', Infinity], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            a.ins(['山田', -1], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            a.ins(['山田', 201], [TypeError, `ageは0〜200までの整数値であるべきです。`]);
            a.ins([['山田', -1], ['山田', 201]], [TypeError, `ageは0〜200までの整数値であるべきです。`]));
            a.ins([['山田', 0], ['山田', 200]], (a,ins,args)=>[TypeError, `ageは0〜200までの整数値であるべきです。age:${args[1]}`]);
            a.ins([['山田', 0], ['山田', 200]], (a,ins,args)=>{
                ia.get('name', args[0]);
                ia.get('age', args[1]);
            });
        });
        */
    });
});
window.addEventListener('beforeunload', (event) => {
    console.log('beforeunload!!');
});

