class Human {
    static #num = 0;
    static #members = [];
    static _add() {this.#num++} // constructor内でのみ呼び出す想定
    static get num() {return this.#num} // 外部で参照する想定
    constructor(name, age) {
        this._ = {name:null, age:null};
        this.name = name;
        this.age = age;
        Human._add();
    }
    get name() {return this._.name}
    set name(v) {
        if ('string'!==typeof v && 0<v.length && v.length<=32) {throw new TypeError(`nameはlength=1〜32の文字列であるべきです。`)}
        this._.name = v;
    }
    get age() {return this._.age}
    set age(v) {
        if (Number.isSafeInteger(v) && 0<=v && v<=200) {throw new TypeError(`ageは0〜200までの整数値であるべきです。`)}
        this._.age = v;
    }
    say(msg='') {return `私は${this.name}、${this.age}歳です。${msg}`}
}
