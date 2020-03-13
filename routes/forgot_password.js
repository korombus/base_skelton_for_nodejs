var express = require('express');
var util = require('./../common/util.js');
var mailer = require('./../common/mailer.js');
var user = require('./../controller/user.js');
var forgotPass = require('./../controller/forgotChangePassword.js');
var router = express.Router();

var err = {
  'errEmail': false,
  'errAddress': false,
  'errOther': false,
  'errYetUser': false,
  'errNotUser': false,
  'errFreezeUser': false,
  'errDeactiveUser': false,
  'errAlreadyReserve': false,
  'errExpiredReserve': false
}

/* GET home page. */
router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.csrfToken() });
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);
  // メールアドレス未入力チェック
  err.errEmail = util.isEmpty(req.body.email);

  // メールアドレス判定
  err.errAddress = !util.isEmail(req.body.email);

  if(util.checkObjectArray(err)){
    res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf });
  } else {
    // メールアドレスで登録されているユーザーがいるか確認
    user.getUserStatus(req.body.email).then(function(status){
      if(!util.isEmpty(status[0])){
        switch(status[0]['status']){
          case 'YET':
            // まだユーザー登録されていない
            err.errYetUser = true;
            res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
          break;

          case 'DEACTIVE':
            // ユーザー削除されている
            err.errDeactiveUser = true;
            res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
          break;

          case 'FREEZE':
            // ユーザー凍結されている
            err.errFreezeUser = true;
            res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
          break;

          case 'OK':
            // パスワード変更予約を受け付けてないかを確認
            forgotPass.checkReserveTokenToEmail(req.body.email).then(function(register_status){
              // 変更がなければ変更を受け付ける
              if(util.isEmpty(register_status[0]) || register_status[0]['status'] == 'DONE'){
                var token = util.createUniqueStr();
                forgotPass.registerChangeReserve(token, req.body.email).then(function(result){
                  // メール送信
                  // 本文作成
                  var htmlBody = req.location_page_lang.sendMailHTMLBody1 + util.createURL() + "/change_password?token=" + token + req.location_page_lang.sendMailHTMLBody2;
                  var textBody = req.location_page_lang.sendMailTextBody1 + util.createURL() + "/change_password?token=" + token + req.location_page_lang.sendMailTextBody2;

                  // メールを送る
                  mailer.sendMail(token, req.body.email, req.location_page_lang.sendMailSubject, textBody, htmlBody).then(function(result){
                    res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, success: true });
                  }).catch(function(err){
                    res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, success: true });
                  });
                }).catch(function(err){
                  // 変更予約エラー
                  err.errOther = true;
                  res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                });
              } else {
                // 変更予約があれば状態によって文言を出す
                switch(register_status[0]['status']){
                  case 'YET':
                    // 予約の期限を確認
                    forgotPass.checkReserveToToken(register_status[0]['token']).then(function(timeStatus){
                      if(util.isEmpty(timeStatus[0])){
                        // 期限外なので以前の登録を終了して再度メールを送る
                        forgotPass.updateRegisterReserveStatus(req.body.email, ['DONE']).then(function(result){
                          var token = util.createUniqueStr();
                          forgotPass.registerChangeReserve(token, req.body.email).then(function(result){
                            // メール送信
                            // 本文作成
                            var htmlBody = req.location_page_lang.sendMailHTMLBody1 + util.createURL() + "/change_password?token=" + token + req.location_page_lang.sendMailHTMLBody2;
                            var textBody = req.location_page_lang.sendMailTextBody1 + util.createURL() + "/change_password?token=" + token + req.location_page_lang.sendMailTextBody2;

                            // 時間超えてたから再度メール送ったよ文言を表示
                            err.errExpiredReserve = true;
                            // メールを送る
                            mailer.sendMail(token, req.body.email, req.location_page_lang.sendMailSubject, textBody, htmlBody).then(function(result){
                              res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                            }).catch(function(err){
                              res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                            });
                          }).catch(function(err){
                            // 変更予約エラー
                            err.errOther = true;
                            res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                          });
                        }).catch(function(err){
                          // 変更予約終了エラー
                          err.errOther = true;
                          res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                        });
                      } else {
                        // 期限内であればメール見てねを表示
                        err.errAlreadyReserve = true;
                        res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                      }
                    }).catch(function(err){
                      // 変更予約期限エラー
                      err.errOther = true;
                      res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                    });
                  break;

                  case 'EXPIRED':
                  // 期限外なので以前の登録を終了して再度メールを送る
                  forgotPass.updateRegisterReserveStatus(req.body.email, ['DONE']).then(function(result){
                    var token = util.createUniqueStr();
                    forgotPass.registerChangeReserve(token, req.body.email).then(function(result){
                      // メール送信
                      // 本文作成
                      var htmlBody = req.location_page_lang.sendMailHTMLBody1 + util.createURL() + "/change_password?token=" + token + req.location_page_lang.sendMailHTMLBody2;
                      var textBody = req.location_page_lang.sendMailTextBody1 + util.createURL() + "/change_password?token=" + token + req.location_page_lang.sendMailTextBody2;

                      // 時間超えてたから再度メール送ったよ文言を表示
                      err.errExpiredReserve = true;
                      // メールを送る
                      mailer.sendMail(token, req.body.email, req.location_page_lang.sendMailSubject, textBody, htmlBody).then(function(result){
                        res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                      }).catch(function(err){
                        res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                      });
                    }).catch(function(err){
                      // 変更予約エラー
                      err.errOther = true;
                      res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                    });
                  }).catch(function(err){
                    // 変更予約終了エラー
                    err.errOther = true;
                    res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
                  });
                  break;
                }
              }
            }).catch(function(err){
              // 変更予約確認エラー
              err.errOther = true;
              res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
            });
          break;
        }
      } else {
        // ユーザー登録されていない
        err.errNotUser = true;
        res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
      }
    }).catch(function(err){
      // ステータス確認エラー
      err.errOther = true;
      res.render('forgot_password', { message: req.location_page_lang, err: err, _csrf: req.body._csrf, faild: true });
    });
  }
});

module.exports = router;
