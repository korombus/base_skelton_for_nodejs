var conf = require('config');
var util = require('../common/util.js');
var base = require('./base_db.js');

var columnFields = {
  'user_id': 0,
  'nickname': 0,
  'password': 0,
  'email': 0,
  'status': 0,
  'twofa': 0,
  'twofa_key': 0,
  'user_role': 0
};

// 接続確認
// 最初期のユーザ作成時にのみ必要なのでuserに作っておく
exports.CheckConnection = function(){
  return new Promise(function(resolve, reject){
    base.CheckConnection().then(function(result){
      resolve(result);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 登録されているユーザが0人より大きいかを確認
exports.IsUserNumLargerThanZero = function(){
  return new Promise(function(resolve, reject){
    base.SELECT('COUNT(*) as count', conf.table.user, null, null, false).then(function(rows){
      resolve(rows[0]['count']);
    }).catch(function(err){
      reject(err);
    });
  });
}

// メールアドレスからuser_idを取得
exports.getUserId = function(email){
  return new Promise(function(resolve, reject){
    base.SELECT('user_id', conf.table.user, {'email': '00'}, [email], 1).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// user_idから二段階認証の設定状況を取得
exports.getTwoFaSetting = function(userId){
  return new Promise(function(resolve, reject){
    base.SELECT('twofa, twofa_key', conf.table.user, {'user_id': '00'}, [userId], 1).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    })
  });
}

// user_idからメールアドレスを取得
exports.getEmail = function(userId){
  return new Promise(function(resolve, reject){
    base.SELECT('email', conf.table.user, {'user_id': '00'}, [userId], 1).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// ログインのための情報を取得
exports.getUserIdForLogin = function(email, password){
  return new Promise(function(resolve, reject){
    var passwordHex = util.md5hex(password);
    base.SELECT('user_id, nickname, twofa', conf.table.user, {'email': '00', 'password': '00'}, [email, passwordHex], 1).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 登録されアクティブになっているユーザーがいるかを確認
exports.checkUserDataOne = function(email, password) {
  return new Promise(function(resolve, reject){
    var passwordHex = util.md5hex(password);
    base.SELECT('COUNT(*) as count', conf.table.user, {'email': '00', 'password': '00', 'status': '00'}, [email, passwordHex, 'OK'], 1).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 登録しようとしているemailがユーザー登録されているものかどうかを確認
exports.checkRegistedUser = function(email) {
  return new Promise(function(resolve, reject){
    base.SELECT('COUNT(*) as count', conf.table.user, {'email': '00', 'status': '00'}, [email, 'YET'], 1).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// ユーザーステータスを取得
exports.getUserStatus = function(email) {
  return new Promise(function(resolve, reject){
    base.SELECT('status', conf.table.user, {'email': '00'}, [email], 1).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// ユーザー新規登録
exports.registerNewUser = function(email, name, password){
  return new Promise(function(resolve, reject){
    var userid = util.createUniqueStr();
    var passwordHex = util.md5hex(password);
    base.INSERT(columnFields, conf.table.user, [userid, name, passwordHex, email, 'YET', false, '', conf.userRoleCode.registerReserveUser]).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 最初のシステム管理者を登録
exports.registerFirstAdminister = function(email, name, password){
  return new Promise(function(resolve, reject){
    var userid = util.createUniqueStr();
    var passwordHex = util.md5hex(password);
    base.INSERT(columnFields, conf.table.user, [userid, name, passwordHex, email, 'OK', false, '', conf.userRoleCode.manager]).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// ユーザー情報を更新
exports.updateUserData = function(userid, email, update, params){
  return new Promise(function(resolve, reject){
    params.push(userid);
    params.push(email);
    base.UPDATE(update, conf.table.user, {'user_id': '00', 'email': '00'}, params).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}
