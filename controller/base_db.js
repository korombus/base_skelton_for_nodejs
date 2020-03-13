var mysql = require('mysql2');
var conf = require('config');
var util = require('../common/util.js');

var poolCluster = null;

// データベース接続
function dbConnection() {
  return new Promise(function(resolve, reject){
    // クラスターがない場合は取得
    if(!poolCluster){
      poolCluster = mysql.createPoolCluster();
      poolCluster.add(conf.db.clusterName.master, conf.db.master);
      poolCluster.add(conf.db.clusterName.slave1, conf.db.slave);
      poolCluster.add(conf.db.clusterName.slave2, conf.db.slave);
    }
    resolve(poolCluster);
  });
}

// MySQLに接続できるかを確認
exports.CheckConnection = function(){
  return new Promise(function(resolve, reject){
    dbConnection().then(function(cluster){
      // getConnectionしてみてConnectが取れるかどうかだけ見る
      cluster.getConnection(conf.db.clusterName.master, function(err, conn){
        // Connectがない場合はエラーを返す
        if(util.isEmpty(conn)){
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  });
}

// SELECT文
exports.SELECT = function(select, table, where, params, limit){
  return new Promise(function(resolve, reject){

    var sql = 'SELECT ' + select + ' FROM ' + table;

    if(where){
      sql += ' WHERE ';

      var fields = Object.keys(where);
      var valueStatus = Object.values(where);

      for(var i = 0;i < valueStatus.length;i++){
        sql += fields[i];

        // 符号選択
        switch(valueStatus[i].substr(0, 1)){
          case '0':
            sql += ' = ';
          break;

          case '1':
            sql += ' > ';
          break;

          case '2':
            sql += ' < ';
          break;
        }

        // 値と文字を選択
        switch(valueStatus[i].substr(1, 1)){
          case '0':
            sql += '? ';
          break;

          case '1':
            sql += '?? ';
          break;
        }

        if(i + 1 < valueStatus.length){
          sql += 'AND ';
        }
      }
    }

    if(limit){
      sql += ' LIMIT ' + limit;
    }

    sql += ';'

    var formatSql = mysql.format(sql, params).replace(/\`/g, '');

    // 検索開始
    dbConnection().then(function(cluster){
      cluster.getConnection(conf.db.clusterName.master, function(err, conn){
        conn.query(formatSql, function(err, rows, fields){
          if(!err){
            conn.release();
            resolve(rows);
          } else {
            conn.release();
            reject(err);
          }
        });
      });
    });
  });
}

// INSERT文
exports.INSERT = function(insert, table, params, duplicate){
  return new Promise(function(resolve, reject){
    var fields = Object.keys(insert);
    var valueStatus = Object.values(insert);

    var sql = 'INSERT INTO ' + table + ' (' + fields + ' ) ';

    var valuesStr = ' VALUES ( ';
    for(var i = 0;i < valueStatus.length;i++){
      valuesStr += valueStatus[i] == 0 ? ' ? ' : ' ?? ';
      if(i + 1 < valueStatus.length){
        valuesStr += ',';
      }
    }

    sql += valuesStr + ' )';

    if(duplicate){
      sql += ' ON DUPLICATE KEY UPDATE ';

      var dupFields = Object.keys(duplicate);
      var dupValueStatus = Object.values(duplicate);

      var dupValuesStr = '';
      for(var i = 0;i < dupValueStatus.length;i++){
        dupValuesStr += (dupFields[i] + (dupValueStatus[i] == 0 ? ' = ? ' : ' = ?? '));
        if(i + 1 < dupValueStatus.length){
          dupValuesStr += ',';
        }
      }

      sql += dupValuesStr;
    }

    sql += ';'

    var formatSql = mysql.format(sql, params).replace(/\`/g, '');

    // 登録開始
    dbConnection().then(function(cluster){
      cluster.getConnection(conf.db.anonymouse_slave, function(err, conn){
        conn.beginTransaction(function(err){
          if(!err){
            conn.query(formatSql, function(err, rows){
              if(!err){
                conn.commit(function(err){
                  if(!err){
                    conn.release();
                    resolve(rows);
                  } else {
                    conn.release();
                    reject(err);
                  }
                });
              } else {
                conn.release();
                reject(err);
              }
            });
          } else {
            conn.rollback(function(){
              conn.release();
              reject(err);
            });
          }
        });
      });
    });
  });
}

// UPDATE文
exports.UPDATE = function(update, table, where, params){
  return new Promise(function(resolve, reject){
    var sql = 'UPDATE ' + table + ' SET ';

    var fields = Object.keys(update);
    var valueStatus = Object.values(update);

    var valuesStr = '';
    for(var i = 0;i < valueStatus.length;i++){
      valuesStr += fields[i] + (valueStatus[i] == 0 ? ' = ? ' : ' = ?? ');
      if(i + 1 < valueStatus.length){
        valuesStr += ',';
      }
    }

    sql += valuesStr;

    if(where){
      sql += ' WHERE ';

      var fields = Object.keys(where);
      var valueStatus = Object.values(where);

      for(var i = 0;i < valueStatus.length;i++){
        sql += fields[i];

        // 符号選択
        switch(valueStatus[i].substr(0, 1)){
          case '0':
            sql += ' = ';
          break;

          case '1':
            sql += ' > ';
          break;

          case '2':
            sql += ' < ';
          break;
        }

        // 値と文字を選択
        switch(valueStatus[i].substr(1, 1)){
          case '0':
            sql += '? ';
          break;

          case '1':
            sql += '?? ';
          break;
        }

        if(i + 1 < valueStatus.length){
          sql += "AND ";
        }
      }
    } else {
      reject('WHERE NONE');
    }

    sql += ';'

    var formatSql = mysql.format(sql, params).replace(/\`/g, '');

    // 更新開始
    dbConnection().then(function(cluster){
      cluster.getConnection(conf.db.anonymouse_slave, function(err, conn){
        conn.beginTransaction(function(err){
          if(!err){
            conn.query(formatSql, function(err, rows){
              if(!err){
                conn.commit(function(err){
                  if(!err){
                    conn.release();
                    resolve(rows);
                  } else {
                    conn.release();
                    reject(err);
                  }
                });
              } else {
                conn.release();
                reject(err);
              }
            });
          } else {
            conn.rollback(function(){
              conn.release();
              reject(err);
            });
          }
        });
      });
    });
  });
}
