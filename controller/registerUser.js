var conf = require('config');
var base = require('./base_db.js');

var columnFields = {
  'token': 0,
  'status': 0,
  'email': 0,
  'register_limit_date': 1
};

// トークンで予約情報を取得
exports.getReserveData = function(token){
  return new Promise(function(resolve, reject){
    base.SELECT('email', conf.table.register_reserve, {'token': '00'}, [token], 1).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 予約されているかを確認
exports.checkReserveToken = function(token){
  return new Promise(function(resolve, reject){
    base.SELECT('COUNT(*) as count', conf.table.register_reserve, {'token': '00', 'status': '00'}, [token, 'YET']).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 予約期限確認
exports.checkReserveTerm = function(token){
  return new Promise(function(resolve, reject){
    base.SELECT('email', conf.table.register_reserve, {'token': '00', 'status': '00', 'register_limit_date': '11'}, [token, 'YET', 'NOW() - INTERVAL 3 DAY']).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 予約状態を確認
exports.getReserveStatus = function(email){
  return new Promise(function(resolve, reject){
    base.SELECT('status', conf.table.register_reserve, {'email': '00'}, [email]).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 登録予約
exports.registerReserve = function(token, email){
  return new Promise(function(resolve, reject){
    base.INSERT(columnFields, conf.table.register_reserve, [token, "YET", email, "NOW()"]).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}

// 登録状態を更新
exports.updateRegisterReserveStatus = function(email, status, update, changeStatus){
  changeStatus.push(email);
  changeStatus.push(status);
  return new Promise(function(resolve, reject){
    base.UPDATE(update, conf.table.register_reserve, {'email': '00', 'status': '00'}, changeStatus).then(function(rows){
      resolve(rows);
    }).catch(function(err){
      reject(err);
    });
  });
}
