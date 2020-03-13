var express = require('express');
var passport = require('passport');
var util = require('./../common/util.js');
var user = require('./../controller/user.js');
var router = express.Router();

var err = {
  'errEmail': false,
  'errAddress': false,
  'errPass': false,
  'errOther': false,
  'errYetUser': false,
  'errNotUser': false,
  'errFreezeUser': false,
  'errDeactiveUser': false
}


router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  res.render('login', { message: req.location_page_lang, err: err, _csrf: req.csrfToken() });
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);
  // パスワード未入力チェック
  err.errPass = util.isEmpty(req.body.password);

  // メールアドレス未入力チェック
  err.errEmail = util.isEmpty(req.body.email);

  // メールアドレス判定
  err.errAddress = !util.isEmail(req.body.email);

  // エラーがある場合はエラー箇所を表示
  if(util.checkObjectArray(err)){
    res.render('login', {message: req.location_page_lang, email: req.body.email, password: req.body.password, err: err, _csrf: req.body._csrf});
  } else {
    // ユーザー存在確認
    user.checkUserDataOne(req.body.email, req.body.password).then(function(userData){

      if(!util.isEmpty(userData[0]) && userData[0]['count'] > 0){
        // ユーザーデータがあればログイン認証を行う
        passport.authenticate('local', {
          successRedirect: '/two_fa',
          failureRedirect: '/login'
        })(req, res, next);
      } else {
        // 有効なユーザー出ない場合は現在のステータスを確認
        user.getUserStatus(req.body.email).then(function(checkStatus){
          if(!util.isEmpty(checkStatus[0])){
            switch(checkStatus[0]['status']){
              case 'YET':
                err.errYetUser = true;
                res.render('login', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
              break;

              case 'DEACTIVE':
                err.errDeactiveUser = true;
                res.render('login', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
              break;

              case 'FREEZE':
                err.errFreezeUser = true;
                res.render('login', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
              break;

              case 'OK':
                // パスワード間違い
                err.errNotUser = true;
                res.render('login', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
              break;
            }
          } else {
            // ここに来た場合はメールアドレスが間違っているかユーザー未登録
            err.errNotUser = true;
            res.render('login', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
          }
        }).catch(function(err){
          // ユーザーステータス確認エラー
          err.errOther = true;
          res.render('login', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
        });
      }
    }).catch(function(err){
      // ユーザー存在確認エラー
      err.errOther = true;
      res.render('login', {message: req.location_page_lang, email: req.body.email, name: req.body.name, password: req.body.password, faild: true, err: err, _csrf: req.body._csrf});
    });
  }
});

module.exports = router;
