var express = require('express');
var util = require('./../common/util.js');
var mailer = require('./../common/mailer.js');
var user = require('./../controller/user.js');
var changeEmail = require('./../controller/changeEmail.js');
var router = express.Router();

var err = {
  'errEmpty': false,
  'errAlreadyRegisterEmail': false,
  'errNoChange': false,
  'errAlreadyChange': false,
  'errOther': false
}

/* GET home page. */
router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  // 現在のメールアドレスを取得
  user.getEmail(req.user.userId).then(function(email){
    // メールアドレスの変更がされていないかを取得
    changeEmail.checkReserve(req.user.userId, email[0]['email']).then(function(count){
      // すでに予約がされていた場合は、その旨を表示
      err.errAlreadyChange = count[0]['count'] > 0;
      res.render('change_email_my', { message: req.location_page_lang, currentEmail: email[0]['email'], faild: err.errAlreadyChange, err: err, _csrf: req.csrfToken() });
    }).catch(function(err){
      // 予約取得エラー
      err.errOther = true;
      res.render('change_email_my', { message: req.location_page_lang, currentEmail: email[0]['email'], faild: true, err: err, _csrf: req.csrfToken() });
    });
  }).catch(function(err){
    // メールアドレス取得エラー
    err.errOther = true;
    res.render('change_email_my', { message: req.location_page_lang, faild: true, err: err, _csrf: req.csrfToken() });
  });
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);
  // メールアドレスが入力されているかを確認
  err.errEmpyt = util.isEmpty(req.body.email);

  if(!err.errEmpty){
    // メールアドレスかを確認
    err.errNotEmailAddress = !util.isEmail(req.body.email);

    // 入力されたのが今の物と同じかを確認
    err.errNoChange = req.body.currentEmail === req.body.email;

    if(util.checkObjectArray(err)){
      res.render('change_email_my', { message: req.location_page_lang, currentEmail: req.body.currentEmail, faild: err.errNoChange, err: err, _csrf: req.body._csrf });
    } else {
      // 新しいメールアドレスでユーザーIDが取得できるかを確認
      user.getUserId(req.body.email).then(function(userId){
        if(util.isEmpty(userId[0])){
          // トークンを生成
          var token = util.createUniqueStr();

          // メール変更予約テーブルに登録
          changeEmail.registerChangeReserve(req.user.userId, token, req.body.currentEmail, req.body.email, 'YET').then(function(result){
            // メール送信
            // 本文作成
            var htmlBody = req.location_page_lang.sendMailHTMLBody1 + util.createURL() + "/change_email?token=" + token + req.location_page_lang.sendMailHTMLBody2;
            var textBody = req.location_page_lang.sendMailTextBody1 + util.createURL() + "/change_email?token=" + token + req.location_page_lang.sendMailTextBody2;

            // メールを送る
            mailer.sendMail(token, req.body.email, req.location_page_lang.sendMailSubject, textBody, htmlBody).then(function(result){
              res.render('change_email_my', {message: req.location_page_lang, currentEmail: req.body.currentEmail, success: true, err: err, _csrf: req.body._csrf});
            }).catch(function(err){
              res.render('change_email_my', {message: req.location_page_lang, currentEmail: req.body.currentEmail, success: true, err: err, _csrf: req.body._csrf});
            });
          }).catch(function(err){
            // ユーザーID取得エラー
            err.errOther = true;
            res.render('change_email_my', { message: req.location_page_lang, currentEmail: req.body.currentEmail, faild: true, err: err, _csrf: req.body._csrf });
          });
        } else {
          // 中身がある場合はすでにそのメールアドレスで登録しているユーザーがいるのでその旨を表示
          err.errAlreadyRegisterEmail = true;
          res.render('change_email_my', { message: req.location_page_lang, currentEmail: req.body.currentEmail, faild: true, err: err, _csrf: req.body._csrf });
        }
      }).catch(function(err){
        // ユーザーID取得エラー
        err.errOther = true;
        res.render('change_email_my', { message: req.location_page_lang, currentEmail: req.body.currentEmail, faild: true, err: err, _csrf: req.body._csrf });
      });
    }
  } else {
    // メールアドレスが入力されてなかったエラー
    res.render('change_email_my', { message: req.location_page_lang, currentEmail: req.body.currentEmail, err: err, _csrf: req.body._csrf });
  }
});

module.exports = router;
