var conf = require('config');
var fs = require('fs');
var crypto = require('crypto');

// Empty判定
exports.isEmpty = function(val) {
  if(!val){
    if(!((val === 0) || (val === false))){
      return true;
    }
  }
  return false;
}

// メールアドレス判定
exports.isEmail = function(val) {
  if(val.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)){
    return true;
  }
  return false;
}

// ユニークトークン作成
exports.createUniqueStr = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  function uuidv4(len) {
    var str = 'xyxyxyxyxyxyxyxyxyxyxyxyxyxyxyxy';
    var randStr = '';
    for(var i = 0;i < len;i++){
      randStr += str[Math.floor(Math.random() * str.length)];
    }
    return randStr.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  return s4() + s4() + s4() + s4() + uuidv4(16);
}

// URL作成
exports.createURL = function() {
  var url = 'http://' + conf.setting.host;
  if(conf.setting.host == "localhost"){
    url = 'http://' + conf.setting.host + ":" + conf.setting.port;
  }
  return url;
}

// 文字列ををmd5を暗号化
exports.md5hex = function(str){
  var md5 = crypto.createHash('md5');
  return md5.update(str, 'binary').digest('hex');
}

// 連想配列を初期化
exports.resetObjectArray = function(array){
  if(Object.keys(array).length > 0){
    for(var key in array){
      array[key] = false;
    }
  }
  return array;
}

// 連想配列でtrueがあるかを確認
exports.checkObjectArray = function(array){
  if(Object.keys(array).length > 0){
    for(var key in array){
      if(array[key] === true){
        return true;
      }
    }
  }
  return false;
}

// ファイルの存在を確認（テキストファイルのみを確認）
exports.isExistFile = function(fileName){
  try{
    var stats = fs.statSync('../' + fileName + '.txt');
    if(stats.isFile()){
      return true;
    } else {
      false;
    }
  } catch(err) {
    return false;
  }
}

// ファイルを作る（テキストファイルのみを許可する）
// ファイルが作られるのは、app.jsの１つ上の階層になる
// 例えば、以下の階層構造になる(一部抜粋)
// root ┳ base_skelton ┳ app.js
//      ┗ init_end.txt ┣ etc...
exports.createFile = function(fileName, data){
  return new Promise(function(resolve, reject){
    try{
      fs.writeFile('../' + fileName + '.txt', data, function(err){
        if(err){
          reject(err);
        } else {
          resolve(err);
        }
      });
    } catch(err){
      reject(err);
    }
  });
}
