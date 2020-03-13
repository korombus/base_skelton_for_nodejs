var express = require('express');
var conf = require('config');
var user = require('./../controller/user.js');
var initDb = require('./../controller/init_db.js');
var util = require('./../common/util.js');
var router = express.Router();

var err = {
  'allSuccess': false,
  'successTableCreate': false,
  'errDBUserName': false,
  'errDBPassword': false,
  'errEmail': false,
  'errNameLength': false,
  'errAddress': false,
  'errName': false,
  'errPass': false,
  'errOther': false
}

/* GET home page. */
router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  user.CheckConnection().then(function(result){
    // 直接ここに来ている可能性もあるので諸々調べる
    // 管理者ユーザが作成されているかは特定のファイルが作られているかで判断する
    if(util.isExistFile(conf.init.file.name)){
      // すでにファイルがある場合は、不正の可能性が高いのでtopに飛ばす
      res.redirect('/');
    } else {
      // 無い場合は一応、ユーザが本当にいないかを調べる
      user.IsUserNumLargerThanZero().then(function(isZero){
        // DBはあるけどユーザが居ない場合は管理者ユーザ作成を開く
        if(isZero <= 0){
          err.successTableCreate = true;
          res.render('signup_init', { message: req.location_page_lang, err: err, _csrf: req.csrfToken() });
        } else {
          // 直接ここに来て、特定ファイルがなかったけどDBにデータがある場合は、特定ファイルを作ってtopにリダイレクトする
          util.createFile(conf.init.file.name, '');
          res.redirect('/');
        }
      }).catch(function(err){
        res.redirect('/');
      });
    }
  }).catch(function(errCode){
    switch(errCode.code){
      // 設定されているMysqlのポートが間違っている
      case 'ECONNREFUSED':
        // この場合は、そもそも他のところでもエラーが出てしまうのでトップに一旦戻す。
        res.redirect('/');
      break;

      // DBにテーブルがない、もしくはDBアクセスに必要なユーザがいない
      case 'ER_BAD_DB_ERROR':
      case 'ER_ACCESS_DENIED_ERROR':
        // 初期設定ユーザの可能性があるので初期設定画面に飛ばす
        res.render('signup_init', { message: req.location_page_lang, err: err, _csrf: req.csrfToken() });
      break;
    }
  });
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);
  // テーブルがすでに作られている場合は、新規ユーザ登録の検査
  if(req.body.table == "true"){
    InitUser(req, res, next);
  }
  // DBと新規テーブルを作成
  else {
    InitDB(req, res, next);
  }
});

// データベースとか初期設定
function InitDB(req, res, next){
  // データベースのユーザ名入力チェック
  err.errDBUserName = util.isEmpty(req.body.dbusername);

  // データベースのパスワード入力チェック
  err.errDBPassword = util.isEmpty(req.body.dbpass);

  // エラーがあるか確認
  if(util.checkObjectArray(err)){
    res.render('signup_init', { message: req.location_page_lang, err: err, _csrf: req.body._csrf });
  } else {
    // テーブル操作で利用するMySQLユーザの作成とDB作成を行う
    initDb.CreateNewMysql(req.body.dbusername, req.body.dbpass).then(function(result){
      // テーブルを一括で作成
      initDb.CreateAllTable().then(function(result){
        // 問題なく作成が終わったら、ユーザ登録をさせる
        err.successTableCreate = true;
        res.render('signup_init', { message: req.location_page_lang, err: err, _csrf: req.body._csrf });
      }).catch(function(err){
        // テーブル作成でエラーを吐いた場合は、一先ずtopに戻してやり直ししてもらう
        res.redirect('/');
      });
    }).catch(function(err){
      // テーブル操作でエラーを吐いた場合は、一先ずtopに戻してやり直ししてもらう
      res.redirect('/');
    });
  }
}

// ユーザとか初期設定
function InitUser(req, res, next){
  // 名前未入力チェック
  err.errName = util.isEmpty(req.body.name);

  // 名前の長さは20文字まで
  err.errNameLength = req.body.name.length > 20;

  // パスワード未入力チェック
  err.errPass = util.isEmpty(req.body.password);

  // メールアドレス未入力チェック
  err.errEmail = util.isEmpty(req.body.email);

  // メールアドレス判定
  err.errAddress = !util.isEmail(req.body.email);

  // エラーがあるか確認
  if(util.checkObjectArray(err)){
    res.render('signup_init', { message: req.location_page_lang, err: err, _csrf: req.body._csrf });
  } else {
    // システム管理者を登録
    user.registerFirstAdminister(req.body.email, req.body.name, req.body.password).then(function(result){
      // すべて完了したら、裏で特殊ファイルを生成し、ユーザにはログインに移動してねを表示
      err.allSuccess = true;
      util.createFile(conf.init.file.name, '').then(function(c_txt){
        res.render('signup_init', { message: req.location_page_lang, err: err, _csrf: req.body._csrf });
      }).catch(function(err){
        // 一先ずファイルが作られなくてもそのまま戻す
        res.render('signup_init', { message: req.location_page_lang, err: err, _csrf: req.body._csrf });
      });
    }).catch(function(errCode){
      err.successTableCreate = true;
      // 問題が起こった場合は一応再度登録画面を表示
      res.render('signup_init', { message: req.location_page_lang, err: err, _csrf: req.body._csrf });
    });
  }
}

module.exports = router;
