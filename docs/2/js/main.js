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
        /*
        */
    });
});
window.addEventListener('beforeunload', (event) => {
    console.log('beforeunload!!');
});

