var conf = require('config');
var util = require('../common/util.js');
var base = require('./base_db.js');

var columnFields = {
  'user_id': 0,
  'token': 0,
  'current_email': 0,
  'new_email': 0,
  'status': 0,
  'reserve_date': 1
};

// 予約があるかを確認
exports.checkReserve = function(userId, email){
  return new Promise(function(resolve, reject){
    base.SELECT('COUNT(*) as count', conf.table.change_email, {'user_id': '00', 'current_email': '00', 'status': '00'}, [userId, email, 'YET']).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 予約されているかを確認
exports.checkReserveToken = function(token){
  return new Promise(function(resolve, reject){
    base.SELECT('COUNT(*) as count', conf.table.change_email, {'token': '00', 'status': '00'}, [token, 'YET']).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 予約期限確認
exports.checkReserveToToken = function(token){
  return new Promise(function(resolve, reject){
    base.SELECT('user_id, new_email, current_email', conf.table.change_email, {'token': '00', 'status': '00', 'reserve_date': '11'}, [token, 'YET', 'NOW() - INTERVAL 1 DAY']).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// メールアドレス変更予約
exports.registerChangeReserve = function(userId, token, currentEmail, newEmail, status){
  return new Promise(function(resolve, reject){
    base.INSERT(columnFields, conf.table.change_email, [userId, token, currentEmail, newEmail, status, 'NOW()', userId, token, currentEmail, newEmail, status, 'NOW()'], columnFields).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// ステータスを更新
exports.updateRegisterReserveStatus = function(userId, update, changeStatus){
  changeStatus.push(userId);
  return new Promise(function(resolve, reject){
    base.UPDATE(update, conf.table.change_email, {'user_id': '00'}, changeStatus).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}
