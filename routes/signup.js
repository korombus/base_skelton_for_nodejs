var express = require('express');
var conf = require('config');
var util = require('./../common/util.js');
var mailer = require('./../common/mailer.js');
var user = require('./../controller/user.js');
var register = require('./../controller/registerUser.js');
var router = express.Router();

var err = {
  'successReMessage': false,
  'errEmail': false,
  'errNameLength': false,
  'errAddress': false,
  'errName': false,
  'errPass': false,
  'errOther': false,
  'errYetUser': false,
  'errAlreadyUser': false,
  'errFreezeUser': false,
}

router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  user.CheckConnection().then(function(result){
    // 一応、最初のユーザは管理者に登録しておかないといけないので調べる。
    // 初期ユーザ作成が済んでいるかどうかは特定のファイルが作られているかどうかで判断することにした
    if(util.isExistFile(conf.init.file.name)){
      // 普通のユーザ登録であればこっちに飛ばす
      res.render('signup', { message: req.location_page_lang, err: err, _csrf: req.csrfToken() });
    } else {
      res.redirect('/signup_init');
    }
  }).catch(function(err){
    switch(err.code){
      // 設定されているMysqlのポートが間違っている
      case 'ECONNREFUSED':
        // この場合は、そもそも他のところでもエラーが出てしまうのでトップに一旦戻す。
        res.redirect('/');
      break;

      // DBにテーブルがない、もしくはDBアクセスに必要なユーザがいない
      case 'ER_BAD_DB_ERROR':
      case 'ER_ACCESS_DENIED_ERROR':
        // 初期設定ユーザの可能性があるので初期設定画面に飛ばす
        res.redirect('/signup_init');
      break;
    }
  });
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);
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


  // エラーがある場合はエラー箇所を表示
  if(util.checkObjectArray(err)){
    res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, err: err, _csrf: req.body._csrf});
  }
  // エラーがない場合はユーザー登録
  else {
    // すでに登録されていないかを確認（対象はメールアドレスとする）
    user.checkRegistedUser(req.body.email).then(function(rows){

      if(rows[0]['count'] <= 0){
        // 登録されていなければ仮登録する
        user.registerNewUser(req.body.email, req.body.name, req.body.password).then(function(){

          // 仮登録が完了したら本登録のための情報を一時的に保持
          var token = util.createUniqueStr();
          register.registerReserve(token, req.body.email).then(function(rows){

            // 本文作成
            var htmlBody = req.location_page_lang.sendMailHTMLBody1 + util.createURL() + "/user_register?token=" + token + req.location_page_lang.sendMailHTMLBody2;
            var textBody = req.location_page_lang.sendMailTextBody1 + util.createURL() + "/user_register?token=" + token + req.location_page_lang.sendMailTextBody2;

            // メールを送る
            mailer.sendMail(token, req.body.email, req.location_page_lang.sendMailSubject, textBody, htmlBody).then(function(result){
              res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, success: true, err: err, _csrf: req.body._csrf});
            }).catch(function(err){
              res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, success: true, err: err, _csrf: req.body._csrf});
            });

          }).catch(function(err){
            // 仮登録ミス
            err.errOther = true;
            res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
          });
        }).catch(function(err){
          // 登録エラー
          err.errOther = true;
          res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
        });
      } else {
        // ユーザーの現在ステータスによって出す文言を変える
        user.getUserStatus(req.body.email).then(function(rows){
          switch(rows[0]['status']){
            case 'YET':
              // 仮登録の期限切れでここに来ている場合は、再度仮登録のURLを復帰させる。
              register.getReserveStatus(req.body.email).then(function(rows){
                switch(rows[0]['status']){
                  case 'YET':
                    // 仮登録があった場合は、本登録してねエラーを出す。
                    err.errYetUser = true;
                    res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
                  break;

                  case 'EXPIRED':
                    // 期限切れの場合は仮登録のトークンと状態を更新
                    var token = util.createUniqueStr();
                    register.updateRegisterReserveStatus(req.body.email, 'EXPIRED', {'token': 0, 'status': 0, 'register_limit_date': 1}, [token, 'YET', 'NOW()']).then(function(rows){

                      // 本文作成
                      var htmlBody = req.location_page_lang.sendMailHTMLBody1 + util.createURL() + "/user_register?token=" + token + req.location_page_lang.sendMailHTMLBody2;
                      var textBody = req.location_page_lang.sendMailTextBody1 + util.createURL() + "/user_register?token=" + token + req.location_page_lang.sendMailTextBody2;

                      // メールを送る
                      err.successReMessage = true;
                      mailer.sendMail(token, req.body.email, req.location_page_lang.sendMailSubject, textBody, htmlBody).then(function(result){
                        res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
                      }).catch(function(err){
                        res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
                      });
                    }).catch(function(err){
                      // 予約状況更新ミス
                      err.errOther = true;
                      res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
                    });
                  break;
                }
              }).catch(function(err){
                // 予約状況確認ミス
                err.errOther = true;
                res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
              });
            break;

            case 'OK':
              // すでにユーザー登録があった場合は、登録あったよエラーを出す。
              err.errAlreadyUser = true;
              res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
            break;

            case 'FREEZE':
              // 残念だけど登録できないよエラーを出す。
              err.errFreezeUser = true;
              res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
            break;
          }
        }).catch(function(err){
          // ステータス確認ミス
          err.errOther = true;
          res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
        });
      }
    }).catch(function(err){
      // 登録確認ミス
      err.errOther = true;
      res.render('signup', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
    });
  }
});

module.exports = router;
