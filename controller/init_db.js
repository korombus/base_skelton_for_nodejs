var mysql = require('mysql2');
var async = require('async');
var conf = require('config');

// 新しいデータベース操作用のユーザとデータベース作成
exports.CreateNewMysql = function(_user, _pass) {
  return new Promise(function(resolve, reject){
    var db = {
      host: conf.db.master.host,
      user: _user,
      password: _pass,
      port: conf.db.master.port,
      databases: 'mysql'
    };

    var connection = mysql.createConnection(db);

    connection.connect();
    // Databaseアクセス用のユーザを作成
    connection.query("GRANT ALL ON " + conf.db.master.database + ".* to '" + conf.db.master.user + "'@'" + conf.db.master.host + "' IDENTIFIED BY '" + conf.db.master.password + "';", (err, rows, fields) => {
      if(err) {
        reject(err);
      }
      // データベースを作成
      connection.query("CREATE DATABASE "+ conf.db.master.database +";", (err, rows, fields) => {
        if(err) {
          reject(err);
        }
        // これだけやって接続を切っておく。rootアカウントで何でもかんでもやらないのが礼儀
        connection.end();
        resolve(true);
      });
    });
  });
}

// サービス運営に必要なすべてのテーブルを作成
exports.CreateAllTable = function(){
  return new Promise(function(resolve, reject){
    var connection = mysql.createConnection(conf.db.master);

    connection.connect();

    // 同期ループでテーブルを作成
    async.forEachOf(conf.table.tableCreateList, function(item, key, callback){
      connection.query(item, (err, rows, fields) => {
        if(err) reject(err);
        callback();
      });
    });

    connection.end();

    resolve(true);
  });
}
