var conf = require('config');
var util = require('../common/util.js');
var base = require('./base_db.js');

var columnFields = {
  'token': 0,
  'email': 0,
  'status': 0,
  'reserve_date': 1
};

// 予約されているかを確認
exports.checkReserveTokenToEmail = function(email){
  return new Promise(function(resolve, reject){
    base.SELECT('token, status', conf.table.change_password, {'email': '00', 'status': '00'}, [email, 'YET']).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 予約されているかを確認
exports.checkReserveToken = function(token){
  return new Promise(function(resolve, reject){
    base.SELECT('COUNT(*) as count', conf.table.change_password, {'token': '00', 'status': '00'}, [token, 'YET']).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 予約期限確認
exports.checkReserveToToken = function(token){
  return new Promise(function(resolve, reject){
    base.SELECT('email', conf.table.change_password, {'token': '00', 'status': '00', 'reserve_date': '11'}, [token, 'YET', 'NOW() - INTERVAL 3 HOUR']).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// パスワード変更予約
exports.registerChangeReserve = function(token, email){
  return new Promise(function(resolve, reject){
    base.INSERT(columnFields, conf.table.change_password, [token, email, 'YET', 'NOW()', token, email, 'YET', 'NOW()'], columnFields).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 該当トークンを持つカラムのステータスを期限切れに変更
exports.updateStatusToExpired = function(token){
  return new Promise(function(resolve, reject){
    base.UPDATE({'status': 0}, conf.table.change_password, {'token': '00'}, ['EXPIRED', token]).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}


// ステータスを更新
exports.updateRegisterReserveStatus = function(email, changeStatus){
  changeStatus.push(email);
  return new Promise(function(resolve, reject){
    base.UPDATE({'status': 0}, conf.table.change_password, {'email': '00'}, changeStatus).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}
